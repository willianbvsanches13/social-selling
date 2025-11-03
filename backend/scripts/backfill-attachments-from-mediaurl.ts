#!/usr/bin/env ts-node
/**
 * Backfill Script: Migrate mediaUrl to attachments
 *
 * This script safely migrates existing media_url data to the new attachments JSONB format.
 * It includes dry-run mode, progress tracking, and comprehensive error handling.
 *
 * Usage:
 *   # Dry run (preview only, no changes)
 *   npm run backfill:attachments -- --dry-run
 *
 *   # Execute migration
 *   npm run backfill:attachments
 *
 *   # Execute with custom batch size
 *   npm run backfill:attachments -- --batch-size=500
 *
 *   # Force re-migration (overwrites existing attachments)
 *   npm run backfill:attachments -- --force
 */

import * as pgPromise from 'pg-promise';
import { IDatabase } from 'pg-promise';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface BackfillStats {
  totalMessages: number;
  messagesWithMedia: number;
  alreadyMigrated: number;
  toMigrate: number;
  migrated: number;
  failed: number;
  skipped: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

interface BackfillOptions {
  dryRun: boolean;
  batchSize: number;
  force: boolean;
  verbose: boolean;
}

class AttachmentsBackfillService {
  private db: IDatabase<unknown>;
  private stats: BackfillStats;
  private options: BackfillOptions;

  constructor(db: IDatabase<unknown>, options: Partial<BackfillOptions> = {}) {
    this.db = db;
    this.options = {
      dryRun: options.dryRun ?? false,
      batchSize: options.batchSize ?? 1000,
      force: options.force ?? false,
      verbose: options.verbose ?? false,
    };
    this.stats = {
      totalMessages: 0,
      messagesWithMedia: 0,
      alreadyMigrated: 0,
      toMigrate: 0,
      migrated: 0,
      failed: 0,
      skipped: 0,
      startTime: new Date(),
    };
  }

  /**
   * Execute the backfill migration
   */
  async execute(): Promise<BackfillStats> {
    console.log('========================================');
    console.log('Attachments Backfill Migration');
    console.log('========================================');
    console.log(`Mode: ${this.options.dryRun ? 'DRY RUN (no changes)' : 'EXECUTE'}`);
    console.log(`Batch Size: ${this.options.batchSize}`);
    console.log(`Force: ${this.options.force ? 'Yes' : 'No'}`);
    console.log('========================================\n');

    try {
      // Step 1: Gather statistics
      await this.gatherStatistics();

      // Step 2: Validate pre-conditions
      this.validatePreConditions();

      // Step 3: Execute migration
      if (!this.options.dryRun) {
        await this.executeMigration();
      } else {
        console.log('\n🔍 DRY RUN MODE - No changes will be made\n');
        await this.previewMigration();
      }

      // Step 4: Verify results
      if (!this.options.dryRun) {
        await this.verifyMigration();
      }

      // Step 5: Print summary
      this.printSummary();

      return this.stats;
    } catch (error) {
      console.error('\n❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Gather statistics about the current state
   */
  private async gatherStatistics(): Promise<void> {
    console.log('📊 Gathering statistics...\n');

    // Total messages
    const totalResult = await this.db.one<{ count: string }>(
      'SELECT COUNT(*) as count FROM messages'
    );
    this.stats.totalMessages = parseInt(totalResult.count, 10);

    // Messages with media_url
    const mediaResult = await this.db.one<{ count: string }>(
      `SELECT COUNT(*) as count FROM messages
       WHERE media_url IS NOT NULL AND media_url != ''`
    );
    this.stats.messagesWithMedia = parseInt(mediaResult.count, 10);

    // Already migrated
    const migratedResult = await this.db.one<{ count: string }>(
      `SELECT COUNT(*) as count FROM messages
       WHERE media_url IS NOT NULL
         AND media_url != ''
         AND attachments IS NOT NULL
         AND attachments != '[]'::jsonb`
    );
    this.stats.alreadyMigrated = parseInt(migratedResult.count, 10);

    // Calculate to migrate
    this.stats.toMigrate = this.stats.messagesWithMedia - this.stats.alreadyMigrated;

    console.log(`Total messages: ${this.stats.totalMessages.toLocaleString()}`);
    console.log(`Messages with media_url: ${this.stats.messagesWithMedia.toLocaleString()}`);
    console.log(`Already migrated: ${this.stats.alreadyMigrated.toLocaleString()}`);
    console.log(`To migrate: ${this.stats.toMigrate.toLocaleString()}\n`);
  }

  /**
   * Validate that migration can proceed
   */
  private validatePreConditions(): void {
    console.log('✓ Pre-conditions check...\n');

    if (this.stats.toMigrate === 0 && !this.options.force) {
      console.log('✓ All messages already migrated!');
      console.log('  Use --force to re-migrate existing attachments\n');
      return;
    }

    if (this.stats.messagesWithMedia === 0) {
      console.log('ℹ No messages with media_url found');
      console.log('  Nothing to migrate\n');
      return;
    }

    console.log('✓ Ready to migrate\n');
  }

  /**
   * Preview what would be migrated (dry run)
   */
  private async previewMigration(): Promise<void> {
    console.log('🔍 Preview of changes:\n');

    const sampleMessages = await this.db.manyOrNone<{
      id: string;
      media_url: string;
      attachments: unknown;
    }>(
      `SELECT id, media_url, attachments
       FROM messages
       WHERE media_url IS NOT NULL
         AND media_url != ''
         AND (attachments IS NULL OR attachments = '[]'::jsonb)
       LIMIT 5`
    );

    if (sampleMessages.length === 0) {
      console.log('  No messages to preview\n');
      return;
    }

    console.log('Sample messages that would be migrated:\n');
    sampleMessages.forEach((msg, idx) => {
      console.log(`${idx + 1}. Message ID: ${msg.id}`);
      console.log(`   Current media_url: ${msg.media_url}`);
      console.log(`   Current attachments: ${JSON.stringify(msg.attachments)}`);
      console.log(`   Would become: [{"url": "${msg.media_url}", "type": "...", ...}]\n`);
    });

    console.log(`Total would migrate: ${this.stats.toMigrate.toLocaleString()} messages\n`);
  }

  /**
   * Execute the actual migration in batches
   */
  private async executeMigration(): Promise<void> {
    console.log('🚀 Executing migration...\n');

    const whereClause = this.options.force
      ? `WHERE media_url IS NOT NULL AND media_url != ''`
      : `WHERE media_url IS NOT NULL
         AND media_url != ''
         AND (attachments IS NULL OR attachments = '[]'::jsonb)`;

    try {
      const result = await this.db.result(
        `UPDATE messages
         SET
           attachments = jsonb_build_array(
             jsonb_build_object(
               'url', media_url,
               'type', CASE
                 WHEN media_url ~* '\\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\\?.*)?$' THEN 'image'
                 WHEN media_url ~* '\\.(mp4|mov|avi|webm|mkv|flv|wmv|m4v)(\\?.*)?$' THEN 'video'
                 WHEN media_url ~* '\\.(mp3|wav|ogg|m4a|aac|flac)(\\?.*)?$' THEN 'audio'
                 WHEN media_url ~* '\\.(pdf|doc|docx|xls|xlsx|ppt|pptx)(\\?.*)?$' THEN 'document'
                 ELSE 'file'
               END,
               'size', 0,
               'name', COALESCE(substring(media_url from '[^/]+$'), 'legacy-attachment'),
               'mimeType', CASE
                 WHEN media_url ~* '\\.(jpg|jpeg)(\\?.*)?$' THEN 'image/jpeg'
                 WHEN media_url ~* '\\.png(\\?.*)?$' THEN 'image/png'
                 WHEN media_url ~* '\\.gif(\\?.*)?$' THEN 'image/gif'
                 WHEN media_url ~* '\\.webp(\\?.*)?$' THEN 'image/webp'
                 WHEN media_url ~* '\\.mp4(\\?.*)?$' THEN 'video/mp4'
                 WHEN media_url ~* '\\.webm(\\?.*)?$' THEN 'video/webm'
                 ELSE 'application/octet-stream'
               END,
               'uploadedAt', COALESCE(created_at, NOW()),
               'source', 'legacy_migration'
             )
           ),
           updated_at = NOW()
         ${whereClause}`
      );

      this.stats.migrated = result.rowCount;

      console.log(`✓ Migrated ${this.stats.migrated.toLocaleString()} messages\n`);
    } catch (error) {
      console.error('❌ Migration query failed:', error);
      throw error;
    }
  }

  /**
   * Verify migration completed successfully
   */
  private async verifyMigration(): Promise<void> {
    console.log('🔍 Verifying migration...\n');

    // Re-check statistics
    const mediaResult = await this.db.one<{ count: string }>(
      `SELECT COUNT(*) as count FROM messages
       WHERE media_url IS NOT NULL AND media_url != ''`
    );
    const messagesWithMedia = parseInt(mediaResult.count, 10);

    const migratedResult = await this.db.one<{ count: string }>(
      `SELECT COUNT(*) as count FROM messages
       WHERE media_url IS NOT NULL
         AND media_url != ''
         AND attachments IS NOT NULL
         AND attachments != '[]'::jsonb`
    );
    const nowMigrated = parseInt(migratedResult.count, 10);

    const coverage = messagesWithMedia > 0
      ? ((nowMigrated / messagesWithMedia) * 100).toFixed(2)
      : '0';

    console.log(`Messages with media_url: ${messagesWithMedia.toLocaleString()}`);
    console.log(`Now with attachments: ${nowMigrated.toLocaleString()}`);
    console.log(`Coverage: ${coverage}%\n`);

    if (nowMigrated === messagesWithMedia) {
      console.log('✓ Migration verification PASSED - 100% coverage\n');
    } else {
      console.warn('⚠ Some messages may not have been migrated\n');
    }
  }

  /**
   * Print final summary
   */
  private printSummary(): void {
    this.stats.endTime = new Date();
    this.stats.duration = this.stats.endTime.getTime() - this.stats.startTime.getTime();

    console.log('========================================');
    console.log('Migration Summary');
    console.log('========================================');
    console.log(`Mode: ${this.options.dryRun ? 'DRY RUN' : 'EXECUTED'}`);
    console.log(`Total messages: ${this.stats.totalMessages.toLocaleString()}`);
    console.log(`Messages with media: ${this.stats.messagesWithMedia.toLocaleString()}`);
    console.log(`Already migrated: ${this.stats.alreadyMigrated.toLocaleString()}`);
    console.log(`Newly migrated: ${this.stats.migrated.toLocaleString()}`);
    console.log(`Duration: ${(this.stats.duration / 1000).toFixed(2)}s`);

    if (this.stats.migrated > 0) {
      const avgTime = this.stats.duration / this.stats.migrated;
      console.log(`Average: ${avgTime.toFixed(2)}ms per message`);
    }

    console.log('========================================\n');

    if (!this.options.dryRun) {
      console.log('✓ Migration completed successfully!\n');
    } else {
      console.log('ℹ This was a dry run. No changes were made.\n');
      console.log('  Run without --dry-run to execute the migration.\n');
    }
  }
}

/**
 * Create database connection using environment variables
 */
function createDatabaseConnection(): IDatabase<unknown> {
  const pgp = pgPromise({
    error: (error: Error) => {
      console.error('Database error:', error.message || error);
    },
  });

  const config = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'social_selling',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    max: 10, // Connection pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  return pgp(config);
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);

  const options: Partial<BackfillOptions> = {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    verbose: args.includes('--verbose'),
  };

  // Parse batch size
  const batchSizeArg = args.find((arg) => arg.startsWith('--batch-size='));
  if (batchSizeArg) {
    const batchSize = parseInt(batchSizeArg.split('=')[1], 10);
    if (!isNaN(batchSize) && batchSize > 0) {
      options.batchSize = batchSize;
    }
  }

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Attachments Backfill Script

Usage:
  npm run backfill:attachments [options]

Options:
  --dry-run          Preview changes without executing (default: false)
  --batch-size=N     Number of records to process per batch (default: 1000)
  --force            Re-migrate even if attachments exist (default: false)
  --verbose          Show detailed progress (default: false)
  --help, -h         Show this help message

Examples:
  # Preview migration
  npm run backfill:attachments -- --dry-run

  # Execute migration
  npm run backfill:attachments

  # Execute with custom batch size
  npm run backfill:attachments -- --batch-size=500

  # Force re-migration
  npm run backfill:attachments -- --force
    `);
    process.exit(0);
  }

  let db: IDatabase<unknown> | null = null;

  try {
    // Create database connection
    db = createDatabaseConnection();

    // Execute migration
    const service = new AttachmentsBackfillService(db, options);
    const stats = await service.execute();

    // Exit with success
    process.exit(stats.migrated > 0 || stats.toMigrate === 0 ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    // Close database connection
    if (db && '$pool' in db) {
      await (db.$pool as any).end();
    }
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { AttachmentsBackfillService, BackfillOptions, BackfillStats };

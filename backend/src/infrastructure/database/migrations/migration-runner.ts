import * as fs from 'fs';
import * as path from 'path';
import { IDatabase, ITask } from 'pg-promise';

interface Migration {
  id: number;
  name: string;
  file: string;
  executed_at: Date;
}

export class MigrationRunner {
  private readonly migrationsDir: string;

  constructor(private readonly db: IDatabase<any>) {
    // Check if running from dist (production) or src (development)
    const isProduction = __dirname.includes('/dist/');

    if (isProduction) {
      // In production, __dirname is /app/dist/src/infrastructure/database/migrations
      // We need to go up to /app and then to migrations
      this.migrationsDir = path.join(__dirname, '../../../../../migrations');
    } else {
      // In development, __dirname is /app/src/infrastructure/database/migrations
      // We need to go up to /app and then to migrations
      this.migrationsDir = path.join(__dirname, '../../../../migrations');
    }
  }

  async initialize(): Promise<void> {
    // Create migrations tracking table if it doesn't exist
    await this.db.none(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        file VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Migration tracking table initialized');
  }

  async run(): Promise<void> {
    await this.initialize();

    const pendingMigrations = await this.getPendingMigrations();

    if (pendingMigrations.length === 0) {
      console.log('✓ No pending migrations');
      return;
    }

    console.log(`\n📦 Running ${pendingMigrations.length} migration(s)...\n`);

    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
    }

    console.log('\n✅ All migrations completed successfully\n');
  }

  async rollback(steps: number = 1): Promise<void> {
    const executedMigrations = await this.db.manyOrNone<Migration>(
      'SELECT * FROM migrations ORDER BY id DESC LIMIT $1',
      [steps],
    );

    if (!executedMigrations || executedMigrations.length === 0) {
      console.log('✓ No migrations to rollback');
      return;
    }

    console.log(
      `\n⏪ Rolling back ${executedMigrations.length} migration(s)...\n`,
    );

    for (const migration of executedMigrations) {
      await this.rollbackMigration(migration);
    }

    console.log('\n✅ Rollback completed successfully\n');
  }

  async status(): Promise<void> {
    await this.initialize();

    const allFiles = this.getAllMigrationFiles();
    const executedMigrations = await this.db.manyOrNone<Migration>(
      'SELECT * FROM migrations ORDER BY id ASC',
    );

    const executedNames = new Set(executedMigrations?.map((m) => m.name) || []);

    console.log('\n📋 Migration Status:\n');
    console.log('  Executed Migrations:');
    allFiles.forEach((file) => {
      const status = executedNames.has(file) ? '✓' : '○';
      console.log(`    ${status} ${file}`);
    });

    const pendingCount = allFiles.length - (executedMigrations?.length || 0);
    console.log(
      `\n  Total: ${allFiles.length} | Executed: ${executedMigrations?.length || 0} | Pending: ${pendingCount}\n`,
    );
  }

  async markAsCompleted(migrationName?: string): Promise<void> {
    await this.initialize();

    const pendingMigrations = await this.getPendingMigrations();

    if (pendingMigrations.length === 0) {
      console.log('✓ No pending migrations to mark as completed');
      return;
    }

    let migrationsToMark: string[];

    if (migrationName) {
      // Mark a specific migration
      if (!pendingMigrations.includes(migrationName)) {
        console.log(`❌ Migration "${migrationName}" is already marked as completed or doesn't exist`);
        return;
      }
      migrationsToMark = [migrationName];
    } else {
      // Mark all pending migrations
      migrationsToMark = pendingMigrations;
    }

    console.log(`\n📝 Marking ${migrationsToMark.length} migration(s) as completed...\n`);

    for (const migration of migrationsToMark) {
      await this.db.none('INSERT INTO migrations (name, file) VALUES ($1, $2)', [
        migration,
        migration,
      ]);
      console.log(`  ✓ Marked: ${migration}`);
    }

    console.log('\n✅ All migrations marked as completed\n');
  }

  private getAllMigrationFiles(): string[] {
    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }

    return fs
      .readdirSync(this.migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();
  }

  private async getPendingMigrations(): Promise<string[]> {
    const allFiles = this.getAllMigrationFiles();

    const executedMigrations = await this.db.manyOrNone<Migration>(
      'SELECT * FROM migrations ORDER BY id ASC',
    );

    const executedNames = new Set(executedMigrations?.map((m) => m.name) || []);

    return allFiles.filter((file) => !executedNames.has(file));
  }

  private async executeMigration(filename: string): Promise<void> {
    const filePath = path.join(this.migrationsDir, filename);
    const sql = fs.readFileSync(filePath, 'utf-8');

    // Split by ROLLBACK comment to get only the UP migration
    const upSql = this.extractUpMigration(sql);

    console.log(`  → Executing: ${filename}`);

    await this.db.tx(async (t: ITask<any>) => {
      // Execute the migration SQL
      await t.none(upSql);

      // Record the migration
      await t.none('INSERT INTO migrations (name, file) VALUES ($1, $2)', [
        filename,
        filename,
      ]);
    });

    console.log(`  ✓ Completed: ${filename}`);
  }

  private async rollbackMigration(migration: Migration): Promise<void> {
    console.log(`  ← Rolling back: ${migration.name}`);

    const filePath = path.join(this.migrationsDir, migration.file);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${migration.file}`);
    }

    const sql = fs.readFileSync(filePath, 'utf-8');

    // Extract the ROLLBACK section
    const rollbackSql = this.extractRollbackMigration(sql);

    if (!rollbackSql) {
      throw new Error(
        `No rollback section found in ${migration.file}. Add a comment "-- ROLLBACK" followed by rollback SQL.`,
      );
    }

    await this.db.tx(async (t: ITask<any>) => {
      // Execute rollback SQL
      await t.none(rollbackSql);

      // Remove migration record
      await t.none('DELETE FROM migrations WHERE id = $1', [migration.id]);
    });

    console.log(`  ✓ Rolled back: ${migration.name}`);
  }

  private extractUpMigration(sql: string): string {
    // Check if there's a ROLLBACK section
    const rollbackMatch = sql.match(/--\s*ROLLBACK/i);

    if (rollbackMatch) {
      // Return everything before the ROLLBACK comment
      return sql.substring(0, rollbackMatch.index).trim();
    }

    // No rollback section, return the entire SQL
    return sql.trim();
  }

  private extractRollbackMigration(sql: string): string | null {
    // Find the ROLLBACK section
    const rollbackMatch = sql.match(/--\s*ROLLBACK\s*\n([\s\S]*)/i);

    if (!rollbackMatch) {
      return null;
    }

    return rollbackMatch[1].trim();
  }
}

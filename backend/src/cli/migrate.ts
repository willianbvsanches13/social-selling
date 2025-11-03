import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MigrationRunner } from '../infrastructure/database/migrations/migration-runner';
import { Database } from '../infrastructure/database/database';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const database = app.get(Database);
    const db = database.getDb();
    const migrationRunner = new MigrationRunner(db);

    const command = process.argv[2];
    const arg = process.argv[3];

    switch (command) {
      case 'up': {
        await migrationRunner.run();
        break;
      }

      case 'down': {
        const steps = parseInt(arg || '1', 10);
        if (isNaN(steps) || steps < 1) {
          console.error(
            '❌ Invalid steps argument. Must be a positive number.',
          );
          process.exit(1);
        }
        await migrationRunner.rollback(steps);
        break;
      }

      case 'status':
        await migrationRunner.status();
        break;

      case 'mark-completed':
        await migrationRunner.markAsCompleted(arg);
        break;

      default:
        console.log(`
╔═══════════════════════════════════════════════╗
║         Database Migration Tool               ║
╚═══════════════════════════════════════════════╝

Usage:
  npm run migrate <command> [options]

Commands:
  up                    Run all pending migrations
  down [steps]          Rollback migrations (default: 1 step)
  status                Show migration status
  mark-completed [name] Mark migrations as completed without running them
                        (useful for existing databases)

Examples:
  npm run migrate up                    # Run all pending migrations
  npm run migrate down                  # Rollback last migration
  npm run migrate down 3                # Rollback last 3 migrations
  npm run migrate status                # Show current status
  npm run migrate mark-completed        # Mark all pending as completed
  npm run migrate mark-completed 001-initial-schema.sql  # Mark specific migration
        `);
        process.exit(command ? 1 : 0);
    }

    await app.close();
    process.exit(0);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('\n❌ Migration failed:', errorMessage);
    if (errorStack) {
      console.error('\nStack trace:', errorStack);
    }
    await app.close();
    process.exit(1);
  }
}

void main();

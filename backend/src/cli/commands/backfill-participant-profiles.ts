import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';

interface CliOptions {
  accountId?: string;
  batchSize?: number;
}

function parseArgs(): CliOptions {
  const options: CliOptions = {};

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    const nextArg = process.argv[i + 1];

    switch (arg) {
      case '--account-id':
        if (!nextArg || nextArg.startsWith('--')) {
          throw new Error('--account-id requires a value');
        }
        options.accountId = nextArg;
        i++;
        break;
      case '--batch-size':
        if (!nextArg || nextArg.startsWith('--')) {
          throw new Error('--batch-size requires a value');
        }
        const batchSize = parseInt(nextArg, 10);
        if (isNaN(batchSize) || batchSize < 1) {
          throw new Error('--batch-size must be a positive number');
        }
        options.batchSize = batchSize;
        i++;
        break;
      case '--help':
      case '-h':
        return options;
      default:
        if (arg.startsWith('--')) {
          throw new Error(`Unknown option: ${arg}`);
        }
    }
  }

  return options;
}

function printHelp() {
  console.log(`
╔═══════════════════════════════════════════════╗
║   Backfill Participant Profiles Tool         ║
╚═══════════════════════════════════════════════╝

Usage:
  npm run backfill:profiles -- --account-id <id> [--batch-size <size>]

Options:
  --account-id <id>     Client account ID to backfill (required)
  --batch-size <size>   Number of conversations per batch (default: 10)
  --help, -h            Show this help message

Examples:
  npm run backfill:profiles -- --account-id abc123
  npm run backfill:profiles -- --account-id abc123 --batch-size 20

Description:
  This command adds a job to the backfill queue to enrich existing
  conversations with missing participant profile data (username and
  profile picture) from Instagram API.

  The job will be processed by the BackfillParticipantProfilesProcessor
  worker, which fetches profiles in batches with rate limiting.
  `);
}

async function main() {
  try {
    const options = parseArgs();

    // Show help if no account ID provided or if help flag is present
    if (
      !options.accountId ||
      process.argv.includes('--help') ||
      process.argv.includes('-h')
    ) {
      printHelp();
      process.exit(options.accountId ? 0 : 1);
    }

    console.log('\n🚀 Starting backfill participant profiles CLI...\n');

    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    try {
      // Get the BullMQ queue
      const queueToken = getQueueToken('backfill-participant-profiles');
      const queue: Queue = app.get(queueToken);

      console.log(`📋 Adding job to queue for account: ${options.accountId}`);
      if (options.batchSize) {
        console.log(`📦 Batch size: ${options.batchSize}`);
      }

      // Add job to the queue
      const job = await queue.add('backfill', {
        accountId: options.accountId,
        batchSize: options.batchSize,
      });

      console.log(`\n✅ Job added successfully!`);
      console.log(`   Job ID: ${job.id}`);
      console.log(`   Queue: backfill-participant-profiles`);
      console.log(`\n💡 The job will be processed by the worker.`);
      console.log(
        `   Monitor progress in the application logs or BullMQ dashboard.\n`,
      );

      await app.close();
      process.exit(0);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error('\n❌ Failed to add job to queue:', errorMessage);
      if (errorStack) {
        console.error('\nStack trace:', errorStack);
      }
      await app.close();
      process.exit(1);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(`\n❌ Error: ${errorMessage}\n`);
    printHelp();
    process.exit(1);
  }
}

void main();

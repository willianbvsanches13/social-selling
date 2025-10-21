import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { initializeSentry } from './common/monitoring/sentry.config';
import { LoggerService } from './common/logging/logger.service';
import { WorkerModule } from './worker.module';

/**
 * Bootstrap function for BullMQ workers
 * Starts only the worker processors without the HTTP server
 */
async function bootstrapWorker() {
  // Increase max listeners for process to prevent warnings
  // Multiple modules (Sentry, BullMQ, Database, etc.) add listeners
  process.setMaxListeners(20);

  // Initialize Sentry before creating the app
  initializeSentry();

  // Create a microservice-style app (no HTTP server)
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: new LoggerService('Worker'),
  });

  // Get config service
  const configService = app.get(ConfigService);

  const workerConcurrency = configService.get<number>(
    'WORKER_CONCURRENCY',
    5,
  );

  // Debug: Log Redis configuration
  const redisConfig = configService.get('redis');
  console.log('🔍 Redis Configuration:', {
    host: redisConfig?.host || 'MISSING',
    port: redisConfig?.port || 'MISSING',
    hasPassword: !!redisConfig?.password,
  });

  console.log('🔧 BullMQ Worker starting...');
  console.log(`⚙️  Worker concurrency: ${workerConcurrency}`);
  console.log('📊 Processing queues:');
  console.log('   - instagram-post-publishing');
  console.log('   - instagram-webhook-events');
  console.log('   - email-notifications');

  // Enable graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`\n🛑 Received ${signal}, shutting down worker gracefully...`);
      await app.close();
      console.log('✅ Worker shutdown complete');
      process.exit(0);
    });
  });

  console.log('✅ Worker is ready and listening for jobs');
}

// Start the worker
void bootstrapWorker();

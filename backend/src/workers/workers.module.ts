import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InstagramPublishingQueue } from './queues/instagram-publishing.queue';
import { MediaDownloaderService } from './services/media-downloader.service';
import { InstagramPublisherService } from './services/instagram-publisher.service';
import { PostStatusService } from './services/post-status.service';
import { PublishingNotificationService } from './services/publishing-notification.service';
import { InstagramPublishingProcessor } from './processors/instagram-publishing.processor';
import { StorageModule } from '../infrastructure/storage/storage.module';
import { ClientAccountRepository } from '../infrastructure/database/repositories/client-account.repository';
import { InstagramScheduledPostRepository } from '../infrastructure/database/repositories/instagram-scheduled-post.repository';
import { OAuthTokenRepository } from '../infrastructure/database/repositories/oauth-token.repository';
import { DatabaseModule } from '../infrastructure/database/database.module';

/**
 * Workers Module
 * Configures BullMQ workers for background job processing
 */
@Module({
  imports: [
    ConfigModule,
    // Import storage module for MinIO service
    StorageModule,
    // Import database module for database access
    DatabaseModule,
    // Configure BullMQ with Redis connection
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB', 0),
          // Connection pool settings
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          connectTimeout: 10000,
        },
        // Default job options
        defaultJobOptions: {
          removeOnComplete: {
            count: 1000, // Keep last 1000 completed jobs
            age: 24 * 3600, // Keep for 24 hours
          },
          removeOnFail: {
            count: 5000, // Keep last 5000 failed jobs for debugging
            age: 7 * 24 * 3600, // Keep for 7 days
          },
        },
      }),
      inject: [ConfigService],
    }),
    // Register instagram-post-publishing queue
    BullModule.registerQueue({
      name: 'instagram-post-publishing',
    }),
  ],
  providers: [
    // Queue service
    InstagramPublishingQueue,
    // Worker services
    MediaDownloaderService,
    InstagramPublisherService,
    PostStatusService,
    PublishingNotificationService,
    // Worker processor
    InstagramPublishingProcessor,
    // Repository providers
    {
      provide: 'IClientAccountRepository',
      useClass: ClientAccountRepository,
    },
    {
      provide: 'IInstagramScheduledPostRepository',
      useClass: InstagramScheduledPostRepository,
    },
    {
      provide: 'IOAuthTokenRepository',
      useClass: OAuthTokenRepository,
    },
  ],
  exports: [
    // Export queue for use in other modules (e.g., InstagramSchedulingService)
    InstagramPublishingQueue,
    // Export services for potential reuse
    MediaDownloaderService,
    InstagramPublisherService,
    PostStatusService,
    PublishingNotificationService,
  ],
})
export class WorkersModule {}

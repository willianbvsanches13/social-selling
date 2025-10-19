import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InstagramPublishingQueue } from './queues/instagram-publishing.queue';
import { WebhookEventsQueue } from './queues/webhook-events.queue';
import { MediaDownloaderService } from './services/media-downloader.service';
import { InstagramPublisherService } from './services/instagram-publisher.service';
import { PostStatusService } from './services/post-status.service';
import { PublishingNotificationService } from './services/publishing-notification.service';
import { EventDeduplicationService } from './services/event-deduplication.service';
import { EventNormalizerService } from './services/event-normalizer.service';
import { AutoReplyService } from './services/auto-reply.service';
import { EventAnalyticsService } from './services/event-analytics.service';
import { InstagramPublishingProcessor } from './processors/instagram-publishing.processor';
import { WebhookEventsProcessor } from './processors/webhook-events.processor';
import { StorageModule } from '../infrastructure/storage/storage.module';
import { CacheModule } from '../infrastructure/cache/cache.module';
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
    // Import cache module for Redis service
    CacheModule,
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
    // Register instagram-webhook-events queue
    BullModule.registerQueue({
      name: 'instagram-webhook-events',
    }),
  ],
  providers: [
    // Queue services
    InstagramPublishingQueue,
    WebhookEventsQueue,
    // Publishing worker services
    MediaDownloaderService,
    InstagramPublisherService,
    PostStatusService,
    PublishingNotificationService,
    // Webhook worker services
    EventDeduplicationService,
    EventNormalizerService,
    AutoReplyService,
    EventAnalyticsService,
    // Worker processors
    InstagramPublishingProcessor,
    WebhookEventsProcessor,
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
    // Export queues for use in other modules
    InstagramPublishingQueue,
    WebhookEventsQueue,
    // Export publishing services for potential reuse
    MediaDownloaderService,
    InstagramPublisherService,
    PostStatusService,
    PublishingNotificationService,
    // Export webhook services for potential reuse
    EventDeduplicationService,
    EventNormalizerService,
    AutoReplyService,
    EventAnalyticsService,
  ],
})
export class WorkersModule {}

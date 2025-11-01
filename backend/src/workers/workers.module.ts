import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { InstagramPublishingQueue } from './queues/instagram-publishing.queue';
import { WebhookEventsQueue } from './queues/webhook-events.queue';
import { EmailNotificationsQueue } from './queues/email-notifications.queue';
import { MediaDownloaderService } from './services/media-downloader.service';
import { InstagramPublisherService } from './services/instagram-publisher.service';
import { ImageAdjusterService } from './services/image-adjuster.service';
import { PostStatusService } from './services/post-status.service';
import { PublishingNotificationService } from './services/publishing-notification.service';
import { TokenMaintenanceService } from './services/token-maintenance.service';
import { EventDeduplicationService } from './services/event-deduplication.service';
import { EventNormalizerService } from './services/event-normalizer.service';
import { AutoReplyService } from './services/auto-reply.service';
import { EventAnalyticsService } from './services/event-analytics.service';
import { EmailTemplateService } from './services/email-template.service';
import { SmtpProviderService } from './services/smtp-provider.service';
import { EmailTrackingService } from './services/email-tracking.service';
import { EmailWebhookHandlerService } from './services/email-webhook-handler.service';
import { InstagramPublishingProcessor } from './processors/instagram-publishing.processor';
import { WebhookEventsProcessor } from './processors/webhook-events.processor';
import { EmailNotificationsProcessor } from './processors/email-notifications.processor';
import { StorageModule } from '../infrastructure/storage/storage.module';
import { CacheModule } from '../infrastructure/cache/cache.module';
import { ClientAccountRepository } from '../infrastructure/database/repositories/client-account.repository';
import { InstagramScheduledPostRepository } from '../infrastructure/database/repositories/instagram-scheduled-post.repository';
import { OAuthTokenRepository } from '../infrastructure/database/repositories/oauth-token.repository';
import { DatabaseModule } from '../infrastructure/database/database.module';
import { InstagramModule } from '../modules/instagram/instagram.module';

/**
 * Workers Module
 * Configures BullMQ workers for background job processing
 */
@Module({
  imports: [
    ConfigModule,
    // Enable cron jobs for scheduled tasks
    ScheduleModule.forRoot(),
    // Import storage module for MinIO service
    StorageModule,
    // Import cache module for Redis service
    CacheModule,
    // Import database module for database access
    DatabaseModule,
    // Import Instagram module for OAuth service
    forwardRef(() => InstagramModule),
    // Configure BullMQ with Redis connection
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get('redis');
        console.log('🔍 Redis Configuration:', {
          host: redisConfig.host,
          port: redisConfig.port,
          hasPassword: !!redisConfig.password,
        });
        return {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            db: redisConfig.db || 0,
            // Connection pool settings
            maxRetriesPerRequest: null, // Required by BullMQ
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
        };
      },
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
    // Register email-notifications queue
    BullModule.registerQueue({
      name: 'email-notifications',
    }),
  ],
  providers: [
    // Queue services
    InstagramPublishingQueue,
    WebhookEventsQueue,
    EmailNotificationsQueue,
    // Publishing worker services
    MediaDownloaderService,
    InstagramPublisherService,
    ImageAdjusterService,
    PostStatusService,
    PublishingNotificationService,
    // Token maintenance service
    TokenMaintenanceService,
    // Webhook worker services
    EventDeduplicationService,
    EventNormalizerService,
    AutoReplyService,
    EventAnalyticsService,
    // Email worker services
    EmailTemplateService,
    SmtpProviderService,
    EmailTrackingService,
    EmailWebhookHandlerService,
    // Worker processors
    InstagramPublishingProcessor,
    WebhookEventsProcessor,
    EmailNotificationsProcessor,
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
    EmailNotificationsQueue,
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
    // Export email services for potential reuse
    EmailTemplateService,
    SmtpProviderService,
    EmailTrackingService,
    EmailWebhookHandlerService,
  ],
})
export class WorkersModule {}

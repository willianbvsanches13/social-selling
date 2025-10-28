import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InstagramController } from './instagram.controller';
import { InstagramAccountController } from './controllers/instagram-account.controller';
import { InstagramWebhooksController } from './controllers/instagram-webhooks.controller';
import { InstagramAnalyticsController } from './controllers/instagram-analytics.controller';
import { InstagramSchedulingController } from './controllers/instagram-scheduling.controller';
import { InstagramOAuthService } from './instagram-oauth.service';
import { InstagramApiService } from './services/instagram-api.service';
import { InstagramAccountService } from './services/instagram-account.service';
import { InstagramSystemAccountsService } from './services/instagram-system-accounts.service';
import { InstagramWebhooksService } from './services/instagram-webhooks.service';
import { InstagramAnalyticsService } from './services/instagram-analytics.service';
import { InstagramSchedulingService } from './services/instagram-scheduling.service';
import { InstagramMediaUploadService } from './services/instagram-media-upload.service';
import { InstagramRateLimiter } from './utils/rate-limiter';
import { InstagramWebhooksProcessor } from './processors/instagram-webhooks.processor';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { CacheModule } from '../../infrastructure/cache/cache.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { MinioService } from '../../infrastructure/storage/minio.service';
import { OAuthTokenRepository } from '../../infrastructure/database/repositories/oauth-token.repository';
import { ClientAccountRepository } from '../../infrastructure/database/repositories/client-account.repository';
import { InstagramScheduledPostRepository } from '../../infrastructure/database/repositories/instagram-scheduled-post.repository';
import { InstagramPostTemplateRepository } from '../../infrastructure/database/repositories/instagram-post-template.repository';
import { InstagramPostingScheduleRepository } from '../../infrastructure/database/repositories/instagram-posting-schedule.repository';
import { InstagramMediaAssetRepository } from '../../infrastructure/database/repositories/instagram-media-asset.repository';
import {
  InstagramAccountInsightRepository,
  InstagramMediaInsightRepository,
  InstagramStoryInsightRepository,
  InstagramAnalyticsReportRepository,
} from '../../infrastructure/database/repositories/instagram-analytics.repository';

@Module({
  imports: [
    DatabaseModule,
    CacheModule,
    StorageModule,
    BullModule.registerQueue({
      name: 'instagram-post-publishing',
    }),
  ],
  controllers: [
    InstagramController,
    InstagramAccountController,
    InstagramWebhooksController,
    InstagramAnalyticsController,
    InstagramSchedulingController,
  ],
  providers: [
    InstagramOAuthService,
    InstagramApiService,
    InstagramAccountService,
    InstagramSystemAccountsService,
    InstagramWebhooksService,
    InstagramAnalyticsService,
    InstagramSchedulingService,
    InstagramMediaUploadService,
    InstagramRateLimiter,
    InstagramWebhooksProcessor,
    {
      provide: 'IOAuthTokenRepository',
      useClass: OAuthTokenRepository,
    },
    {
      provide: 'IClientAccountRepository',
      useClass: ClientAccountRepository,
    },
    {
      provide: 'IInstagramScheduledPostRepository',
      useClass: InstagramScheduledPostRepository,
    },
    {
      provide: 'IInstagramPostTemplateRepository',
      useClass: InstagramPostTemplateRepository,
    },
    {
      provide: 'IInstagramPostingScheduleRepository',
      useClass: InstagramPostingScheduleRepository,
    },
    {
      provide: 'IInstagramMediaAssetRepository',
      useClass: InstagramMediaAssetRepository,
    },
    {
      provide: 'IStorageService',
      useFactory: (minioService: any) => ({
        uploadFile: async (
          bucket: string,
          key: string,
          buffer: Buffer,
          mimeType: string,
        ) => {
          await minioService.uploadFile(key, buffer, buffer.length, {
            contentType: mimeType,
          });
        },
        getFileUrl: async (bucket: string, key: string) => {
          return minioService.getPresignedUrl(key);
        },
        deleteFile: async (bucket: string, key: string) => {
          await minioService.deleteFile(key);
        },
      }),
      inject: [MinioService],
    },
    InstagramAccountInsightRepository,
    InstagramMediaInsightRepository,
    InstagramStoryInsightRepository,
    InstagramAnalyticsReportRepository,
  ],
  exports: [
    InstagramOAuthService,
    InstagramApiService,
    InstagramAccountService,
    InstagramSystemAccountsService,
    InstagramWebhooksService,
    InstagramAnalyticsService,
    InstagramSchedulingService,
    InstagramMediaUploadService,
  ],
})
export class InstagramModule {}

import { Module } from '@nestjs/common';
import { InstagramController } from './instagram.controller';
import { InstagramAccountController } from './controllers/instagram-account.controller';
import { InstagramWebhooksController } from './controllers/instagram-webhooks.controller';
import { InstagramAnalyticsController } from './controllers/instagram-analytics.controller';
import { InstagramOAuthService } from './instagram-oauth.service';
import { InstagramApiService } from './services/instagram-api.service';
import { InstagramAccountService } from './services/instagram-account.service';
import { InstagramWebhooksService } from './services/instagram-webhooks.service';
import { InstagramAnalyticsService } from './services/instagram-analytics.service';
import { InstagramRateLimiter } from './utils/rate-limiter';
import { InstagramWebhooksProcessor } from './processors/instagram-webhooks.processor';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { CacheModule } from '../../infrastructure/cache/cache.module';
import { OAuthTokenRepository } from '../../infrastructure/database/repositories/oauth-token.repository';
import { ClientAccountRepository } from '../../infrastructure/database/repositories/client-account.repository';
import {
  InstagramAccountInsightRepository,
  InstagramMediaInsightRepository,
  InstagramStoryInsightRepository,
  InstagramAnalyticsReportRepository,
} from '../../infrastructure/database/repositories/instagram-analytics.repository';

@Module({
  imports: [DatabaseModule, CacheModule],
  controllers: [
    InstagramController,
    InstagramAccountController,
    InstagramWebhooksController,
    InstagramAnalyticsController,
  ],
  providers: [
    InstagramOAuthService,
    InstagramApiService,
    InstagramAccountService,
    InstagramWebhooksService,
    InstagramAnalyticsService,
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
    InstagramAccountInsightRepository,
    InstagramMediaInsightRepository,
    InstagramStoryInsightRepository,
    InstagramAnalyticsReportRepository,
  ],
  exports: [
    InstagramOAuthService,
    InstagramApiService,
    InstagramAccountService,
    InstagramWebhooksService,
    InstagramAnalyticsService,
  ],
})
export class InstagramModule {}

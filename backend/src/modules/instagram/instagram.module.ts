import { Module } from '@nestjs/common';
import { InstagramController } from './instagram.controller';
import { InstagramAccountController } from './controllers/instagram-account.controller';
import { InstagramOAuthService } from './instagram-oauth.service';
import { InstagramApiService } from './services/instagram-api.service';
import { InstagramAccountService } from './services/instagram-account.service';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { CacheModule } from '../../infrastructure/cache/cache.module';
import { OAuthTokenRepository } from '../../infrastructure/database/repositories/oauth-token.repository';
import { ClientAccountRepository } from '../../infrastructure/database/repositories/client-account.repository';

@Module({
  imports: [DatabaseModule, CacheModule],
  controllers: [InstagramController, InstagramAccountController],
  providers: [
    InstagramOAuthService,
    InstagramApiService,
    InstagramAccountService,
    {
      provide: 'IOAuthTokenRepository',
      useClass: OAuthTokenRepository,
    },
    {
      provide: 'IClientAccountRepository',
      useClass: ClientAccountRepository,
    },
  ],
  exports: [InstagramOAuthService, InstagramApiService, InstagramAccountService],
})
export class InstagramModule {}

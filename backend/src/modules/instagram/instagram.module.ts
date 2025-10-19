import { Module } from '@nestjs/common';
import { InstagramController } from './instagram.controller';
import { InstagramOAuthService } from './instagram-oauth.service';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { CacheModule } from '../../infrastructure/cache/cache.module';
import { OAuthTokenRepository } from '../../infrastructure/database/repositories/oauth-token.repository';
import { ClientAccountRepository } from '../../infrastructure/database/repositories/client-account.repository';

@Module({
  imports: [DatabaseModule, CacheModule],
  controllers: [InstagramController],
  providers: [
    InstagramOAuthService,
    {
      provide: 'IOAuthTokenRepository',
      useClass: OAuthTokenRepository,
    },
    {
      provide: 'IClientAccountRepository',
      useClass: ClientAccountRepository,
    },
  ],
  exports: [InstagramOAuthService],
})
export class InstagramModule {}

import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IClientAccountRepository } from '../../domain/repositories/client-account.repository.interface';
import { IOAuthTokenRepository } from '../../domain/repositories/oauth-token.repository.interface';
import { InstagramOAuthService } from '../../modules/instagram/instagram-oauth.service';
import { Platform, AccountStatus } from '../../domain/entities/client-account.entity';

/**
 * Token Maintenance Service
 * Automatically refreshes Instagram access tokens before they expire
 */
@Injectable()
export class TokenMaintenanceService {
  private readonly logger = new Logger(TokenMaintenanceService.name);

  constructor(
    @Inject('IClientAccountRepository')
    private readonly accountRepository: IClientAccountRepository,
    @Inject('IOAuthTokenRepository')
    private readonly tokenRepository: IOAuthTokenRepository,
    private readonly instagramOAuthService: InstagramOAuthService,
  ) {}

  /**
   * Run token maintenance every day at 2 AM
   * This checks all Instagram accounts and refreshes tokens that are expiring soon
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async refreshExpiringTokens(): Promise<void> {
    this.logger.log('Starting token maintenance job...');

    try {
      // Get all active Instagram accounts
      const accounts = await this.accountRepository.findAll();
      const instagramAccounts = accounts.filter(
        (account) =>
          account.platform === Platform.INSTAGRAM &&
          (account.status === AccountStatus.ACTIVE ||
            account.status === AccountStatus.TOKEN_EXPIRED),
      );

      this.logger.log(
        `Found ${instagramAccounts.length} Instagram accounts to check`,
      );

      let refreshedCount = 0;
      let expiredCount = 0;
      let failedCount = 0;

      // Check each account
      for (const account of instagramAccounts) {
        try {
          const token =
            await this.tokenRepository.findByClientAccountId(account.id);

          if (!token) {
            this.logger.warn(
              `No token found for account ${account.id} (@${account.username})`,
            );
            continue;
          }

          // Check if token is already expired
          if (token.isExpired) {
            this.logger.warn(
              `Token for account ${account.id} (@${account.username}) has expired`,
            );

            // Mark account as token_expired
            account.markAsTokenExpired();
            await this.accountRepository.update(account);
            expiredCount++;
            continue;
          }

          // Check if token is expiring within 7 days
          if (token.isExpiringSoon(7)) {
            this.logger.log(
              `Refreshing token for account ${account.id} (@${account.username}) - expires in ${this.getDaysUntilExpiration(token.expiresAt)} days`,
            );

            try {
              await this.instagramOAuthService.refreshTokenIfNeeded(account.id);

              // Reactivate account if it was marked as token_expired
              if (account.status === AccountStatus.TOKEN_EXPIRED) {
                account.reactivate();
                await this.accountRepository.update(account);
              }

              refreshedCount++;
              this.logger.log(
                `Successfully refreshed token for account ${account.id} (@${account.username})`,
              );
            } catch (refreshError) {
              this.logger.error(
                `Failed to refresh token for account ${account.id} (@${account.username}): ${refreshError instanceof Error ? refreshError.message : 'Unknown error'}`,
              );
              failedCount++;
            }
          }
        } catch (error) {
          this.logger.error(
            `Error processing account ${account.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          failedCount++;
        }
      }

      this.logger.log(
        `Token maintenance job completed. Refreshed: ${refreshedCount}, Expired: ${expiredCount}, Failed: ${failedCount}`,
      );
    } catch (error) {
      this.logger.error(
        `Token maintenance job failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Run token validation every hour
   * This marks accounts with expired tokens as TOKEN_EXPIRED
   */
  @Cron(CronExpression.EVERY_HOUR)
  async validateTokens(): Promise<void> {
    this.logger.debug('Starting token validation job...');

    try {
      // Get all active Instagram accounts
      const accounts = await this.accountRepository.findAll();
      const activeInstagramAccounts = accounts.filter(
        (account) =>
          account.platform === Platform.INSTAGRAM &&
          account.status === AccountStatus.ACTIVE,
      );

      let expiredCount = 0;

      for (const account of activeInstagramAccounts) {
        try {
          const token =
            await this.tokenRepository.findByClientAccountId(account.id);

          if (!token) {
            continue;
          }

          // Check if token has expired
          if (token.isExpired) {
            this.logger.warn(
              `Marking account ${account.id} (@${account.username}) as token_expired`,
            );

            account.markAsTokenExpired();
            await this.accountRepository.update(account);
            expiredCount++;
          }
        } catch (error) {
          this.logger.error(
            `Error validating token for account ${account.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      if (expiredCount > 0) {
        this.logger.log(
          `Token validation completed. Marked ${expiredCount} accounts as token_expired`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Token validation job failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Calculate days until token expiration
   */
  private getDaysUntilExpiration(expiresAt: Date | null): number {
    if (!expiresAt) return 0;

    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}

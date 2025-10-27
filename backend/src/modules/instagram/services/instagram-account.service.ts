import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { IClientAccountRepository } from '../../../domain/repositories/client-account.repository.interface';
import {
  ClientAccount,
  Platform,
  AccountStatus,
  InstagramAccountType,
} from '../../../domain/entities/client-account.entity';
import { InstagramApiService } from './instagram-api.service';
import { CreateAccountDto, UpdateAccountDto } from '../dto/account.dto';

@Injectable()
export class InstagramAccountService {
  private readonly logger = new Logger(InstagramAccountService.name);

  constructor(
    @Inject('IClientAccountRepository')
    private readonly accountRepository: IClientAccountRepository,
    private readonly instagramApi: InstagramApiService,
  ) {}

  /**
   * Create new Instagram account after OAuth
   */
  async createAccount(
    userId: string,
    accountData: CreateAccountDto,
  ): Promise<ClientAccount> {
    // Check if account already exists
    const existing = await this.accountRepository.findByPlatformAccountId(
      Platform.INSTAGRAM,
      accountData.platformAccountId,
    );

    if (existing) {
      // Update existing account instead of creating duplicate
      existing.reactivate();
      existing.updateTokenExpiration(
        accountData.tokenExpiresAt ||
          new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      );
      return this.accountRepository.update(existing);
    }

    // Create new account
    const account = ClientAccount.create({
      userId,
      platform: Platform.INSTAGRAM,
      platformAccountId: accountData.platformAccountId,
      username: accountData.username,
      displayName: accountData.displayName,
      profilePictureUrl: accountData.profilePictureUrl,
      accountType: accountData.accountType || InstagramAccountType.PERSONAL,
      permissions: accountData.permissions || [],
      status: AccountStatus.ACTIVE,
      tokenExpiresAt: accountData.tokenExpiresAt,
      metadata: {},
    });

    const saved = await this.accountRepository.create(account);

    // Fetch and store account metadata in background (don't await)
    this.syncAccountMetadata(saved.id).catch((error) => {
      this.logger.error(
        `Failed to sync metadata for account ${saved.id}: ${error.message}`,
      );
    });

    return saved;
  }

  /**
   * Get all accounts for a user
   */
  async getUserAccounts(userId: string): Promise<ClientAccount[]> {
    return this.accountRepository.findByUserId(userId);
  }

  /**
   * Get single account by ID
   */
  async getAccountById(
    accountId: string,
    userId: string,
  ): Promise<ClientAccount> {
    const account = await this.accountRepository.findById(accountId);

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('Access denied to this account');
    }

    return account;
  }

  /**
   * Update account information
   */
  async updateAccount(
    accountId: string,
    userId: string,
    updates: UpdateAccountDto,
  ): Promise<ClientAccount> {
    const account = await this.getAccountById(accountId, userId);

    // Apply updates
    if (updates.username) {
      account.updateMetadata({ displayName: updates.username });
    }
    if (updates.displayName) {
      account.updateMetadata({ displayName: updates.displayName });
    }
    if (updates.profilePictureUrl) {
      account.updateMetadata({ profilePictureUrl: updates.profilePictureUrl });
    }
    if (updates.status) {
      if (updates.status === AccountStatus.ACTIVE) {
        account.reactivate();
      } else if (updates.status === AccountStatus.TOKEN_EXPIRED) {
        account.markAsTokenExpired();
      } else if (updates.status === AccountStatus.DISCONNECTED) {
        account.disconnect();
      }
    }

    return this.accountRepository.update(account);
  }

  /**
   * Delete/disconnect account
   */
  async deleteAccount(accountId: string, userId: string): Promise<void> {
    const account = await this.getAccountById(accountId, userId);

    // Attempt to revoke Instagram access token (best-effort)
    try {
      await this.instagramApi.revokeToken(accountId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to revoke token for account ${accountId}: ${errorMessage}`,
      );
    }

    // Mark as disconnected and soft delete
    account.disconnect();
    await this.accountRepository.update(account);
    await this.accountRepository.delete(accountId);
  }

  /**
   * Sync account metadata from Instagram API
   */
  async syncAccount(
    userId: string,
    accountId: string,
  ): Promise<ClientAccount> {
    const account = await this.accountRepository.findById(accountId);

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('You do not have access to this account');
    }

    return this.syncAccountMetadata(accountId);
  }

  async syncAccountMetadata(accountId: string): Promise<ClientAccount> {
    const account = await this.accountRepository.findById(accountId);

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    try {
      // Fetch profile data from Instagram Graph API
      const profile = await this.instagramApi.getUserProfile(accountId);

      // Update account with fresh metadata
      account.updateMetadata({
        displayName: profile.name,
        profilePictureUrl: profile.profile_picture_url,
        followerCount: profile.followers_count,
        followingCount: profile.follows_count,
        mediaCount: profile.media_count,
        biography: profile.biography,
        website: profile.website,
        metadata: {
          igId: profile.id,
          isVerified: profile.is_verified,
        },
      });

      account.reactivate(); // Mark as active after successful sync

      return this.accountRepository.update(account);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to sync metadata for account ${accountId}: ${errorMessage}`,
      );

      // Update account status to error
      account.markAsError({
        code: 'SYNC_ERROR',
        message: errorMessage,
      });

      await this.accountRepository.update(account);

      throw error;
    }
  }

  /**
   * Refresh account status (check token validity)
   */
  async refreshAccountStatus(accountId: string): Promise<AccountStatus> {
    const account = await this.accountRepository.findById(accountId);

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Check if token is expired
    if (account.isTokenExpired) {
      account.markAsTokenExpired();
      await this.accountRepository.update(account);
      return AccountStatus.TOKEN_EXPIRED;
    }

    // Test API connection
    try {
      const isValid = await this.instagramApi.testToken(accountId);

      if (isValid) {
        account.reactivate();
        await this.accountRepository.update(account);
        return AccountStatus.ACTIVE;
      } else {
        account.markAsTokenExpired();
        await this.accountRepository.update(account);
        return AccountStatus.TOKEN_EXPIRED;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Status refresh error for account ${accountId}: ${errorMessage}`,
      );

      account.markAsError({
        code: 'API_ERROR',
        message: errorMessage,
      });

      await this.accountRepository.update(account);
      return AccountStatus.ERROR;
    }
  }

  /**
   * Get accounts expiring soon (for proactive token refresh)
   */
  async getExpiringAccounts(hours: number = 168): Promise<ClientAccount[]> {
    return this.accountRepository.findExpiringSoon(hours);
  }

  /**
   * Count user accounts
   */
  async countUserAccounts(userId: string): Promise<number> {
    return this.accountRepository.countByUserId(userId);
  }
}

import { Injectable, UnauthorizedException, BadRequestException, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { IClientAccountRepository } from '../../domain/repositories/client-account.repository.interface';
import { IOAuthTokenRepository } from '../../domain/repositories/oauth-token.repository.interface';
import { ClientAccount, Platform, AccountStatus } from '../../domain/entities/client-account.entity';
import { OAuthToken } from '../../domain/entities/oauth-token.entity';
import {
  InstagramTokenResponse,
  InstagramUserProfile,
  InstagramLongLivedTokenResponse,
} from './interfaces/instagram-api.interface';

@Injectable()
export class InstagramOAuthService {
  private readonly logger = new Logger(InstagramOAuthService.name);
  private readonly authBaseUrl = 'https://api.instagram.com/oauth';
  private readonly graphBaseUrl = 'https://graph.instagram.com';
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly scopes = [
    'user_profile',
    'user_media',
    'instagram_basic',
    'instagram_manage_messages',
    'instagram_manage_comments',
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    @Inject('IClientAccountRepository')
    private readonly clientAccountRepository: IClientAccountRepository,
    @Inject('IOAuthTokenRepository')
    private readonly oauthTokenRepository: IOAuthTokenRepository,
  ) {
    this.clientId = this.configService.get<string>('INSTAGRAM_APP_ID') || '';
    this.clientSecret = this.configService.get<string>('INSTAGRAM_APP_SECRET') || '';
    this.redirectUri = this.configService.get<string>('INSTAGRAM_REDIRECT_URI') || '';

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      this.logger.error('Instagram OAuth credentials not configured');
      throw new Error('Instagram OAuth credentials are required');
    }
  }

  async getAuthorizationUrl(userId: string): Promise<string> {
    const state = this.generateState();

    await this.redisService.set(
      `oauth:instagram:state:${state}`,
      JSON.stringify({ userId, createdAt: new Date() }),
      600,
    );

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(','),
      response_type: 'code',
      state,
    });

    return `${this.authBaseUrl}/authorize?${params.toString()}`;
  }

  async handleCallback(code: string, state: string): Promise<{ accountId: string; username: string }> {
    const stateData = await this.redisService.get(`oauth:instagram:state:${state}`);
    if (!stateData) {
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }

    const { userId } = JSON.parse(stateData);
    await this.redisService.del(`oauth:instagram:state:${state}`);

    try {
      const shortLivedToken = await this.exchangeCodeForToken(code);
      const longLivedToken = await this.exchangeForLongLivedToken(shortLivedToken.access_token);
      const userProfile = await this.fetchUserProfile(longLivedToken.access_token);
      const clientAccount = await this.storeClientAccount(userId, userProfile);
      await this.storeOAuthToken(
        userId,
        clientAccount.id,
        longLivedToken.access_token,
        longLivedToken.expires_in,
      );

      return {
        accountId: clientAccount.id,
        username: userProfile.username,
      };
    } catch (error) {
      this.logger.error('Instagram OAuth callback error:', error);
      throw new BadRequestException('Failed to connect Instagram account');
    }
  }

  async disconnectAccount(userId: string, accountId: string): Promise<void> {
    const account = await this.clientAccountRepository.findById(accountId);
    if (!account || account.userId !== userId) {
      throw new UnauthorizedException('Account not found or unauthorized');
    }

    const token = await this.oauthTokenRepository.findByClientAccountId(accountId);
    if (token) {
      await this.oauthTokenRepository.delete(token.id);
    }

    account.disconnect();
    await this.clientAccountRepository.update(account);
  }

  async refreshTokenIfNeeded(accountId: string): Promise<string> {
    const token = await this.oauthTokenRepository.findByClientAccountId(accountId);
    if (!token) {
      throw new UnauthorizedException('No OAuth token found for account');
    }

    if (token.isExpiringSoon(7)) {
      const decryptedToken = (token as any).props.encryptedAccessToken;
      const refreshed = await this.refreshLongLivedToken(decryptedToken);

      token.updateToken(
        refreshed.access_token,
        new Date(Date.now() + refreshed.expires_in * 1000),
      );

      await this.oauthTokenRepository.update(token);
      return refreshed.access_token;
    }

    return (token as any).props.encryptedAccessToken;
  }

  private async exchangeCodeForToken(code: string): Promise<InstagramTokenResponse> {
    const formData = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
      code,
    });

    const response = await fetch(`${this.authBaseUrl}/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new Error(`Instagram token exchange failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async exchangeForLongLivedToken(shortLivedToken: string): Promise<InstagramLongLivedTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: this.clientSecret,
      access_token: shortLivedToken,
    });

    const response = await fetch(`${this.graphBaseUrl}/access_token?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Instagram long-lived token exchange failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async refreshLongLivedToken(token: string): Promise<InstagramLongLivedTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'ig_refresh_token',
      access_token: token,
    });

    const response = await fetch(`${this.graphBaseUrl}/refresh_access_token?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Instagram token refresh failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async fetchUserProfile(accessToken: string): Promise<InstagramUserProfile> {
    const params = new URLSearchParams({
      fields: 'id,username,account_type,media_count',
      access_token: accessToken,
    });

    const response = await fetch(`${this.graphBaseUrl}/me?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Instagram user profile fetch failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async storeClientAccount(userId: string, profile: InstagramUserProfile): Promise<ClientAccount> {
    const existing = await this.clientAccountRepository.findByPlatformAccountId(
      Platform.INSTAGRAM,
      profile.id,
    );

    if (existing) {
      existing.reactivate();
      existing.updateMetadata(profile.media_count || 0, undefined);
      return this.clientAccountRepository.update(existing);
    }

    const clientAccount = ClientAccount.create({
      userId,
      platform: Platform.INSTAGRAM,
      platformAccountId: profile.id,
      username: profile.username,
      status: AccountStatus.ACTIVE,
      metadata: {
        accountType: profile.account_type,
        mediaCount: profile.media_count,
      },
    });

    return this.clientAccountRepository.create(clientAccount);
  }

  private async storeOAuthToken(
    userId: string,
    clientAccountId: string,
    accessToken: string,
    expiresIn: number,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    const existingToken = await this.oauthTokenRepository.findByClientAccountId(clientAccountId);
    if (existingToken) {
      await this.oauthTokenRepository.delete(existingToken.id);
    }

    const oauthToken = OAuthToken.create({
      clientAccountId,
      encryptedAccessToken: accessToken,
      tokenType: 'Bearer',
      expiresAt,
      scope: this.scopes.join(','),
    });

    await this.oauthTokenRepository.create(oauthToken);
  }

  private generateState(): string {
    return randomBytes(32).toString('hex');
  }
}

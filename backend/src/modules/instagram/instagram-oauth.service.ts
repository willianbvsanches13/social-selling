import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { IClientAccountRepository } from '../../domain/repositories/client-account.repository.interface';
import { IOAuthTokenRepository } from '../../domain/repositories/oauth-token.repository.interface';
import {
  ClientAccount,
  Platform,
  AccountStatus,
  InstagramAccountType,
} from '../../domain/entities/client-account.entity';
import { OAuthToken } from '../../domain/entities/oauth-token.entity';
import {
  InstagramTokenResponse,
  InstagramUserProfile,
  InstagramLongLivedTokenResponse,
} from './interfaces/instagram-api.interface';

@Injectable()
export class InstagramOAuthService {
  private readonly logger = new Logger(InstagramOAuthService.name);
  // Use Facebook OAuth for Instagram Business API access
  private readonly authBaseUrl = 'https://www.facebook.com/v24.0/dialog/oauth';
  private readonly tokenUrl =
    'https://graph.facebook.com/v24.0/oauth/access_token';
  private readonly graphBaseUrl = 'https://graph.instagram.com';
  private readonly fbGraphBaseUrl = 'https://graph.facebook.com/v24.0';
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  // Scopes for Facebook Login to access Instagram Business
  private readonly scopes = [
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_comments',
    'instagram_manage_insights',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_metadata', // Required to read instagram_business_account field
    'business_management',
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    @Inject('IClientAccountRepository')
    private readonly clientAccountRepository: IClientAccountRepository,
    @Inject('IOAuthTokenRepository')
    private readonly oauthTokenRepository: IOAuthTokenRepository,
  ) {
    // Use Facebook App ID for OAuth (not Instagram App ID)
    this.clientId = this.configService.get<string>('FACEBOOK_APP_ID') || '';
    this.clientSecret =
      this.configService.get<string>('FACEBOOK_APP_SECRET') || '';
    this.redirectUri =
      this.configService.get<string>('INSTAGRAM_REDIRECT_URI') || '';

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      this.logger.warn('Facebook OAuth credentials not configured - Instagram OAuth will not be available');
    }
  }

  async getAuthorizationUrl(userId: string): Promise<string> {
    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      throw new Error('Facebook OAuth credentials not configured');
    }
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

    return `${this.authBaseUrl}?${params.toString()}`;
  }

  async handleCallback(
    code: string,
    state: string,
  ): Promise<{ accountId: string; username: string }> {
    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      throw new Error('Facebook OAuth credentials not configured');
    }
    const stateData = await this.redisService.get(
      `oauth:instagram:state:${state}`,
    );
    if (!stateData) {
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }

    const { userId } = JSON.parse(stateData);
    await this.redisService.del(`oauth:instagram:state:${state}`);

    try {
      this.logger.log('Step 1: Exchanging code for token');
      const tokenResponse = await this.exchangeCodeForToken(code);
      this.logger.log('Step 1 completed: Token received');

      // Facebook tokens are already long-lived (60 days) when using Facebook Login
      // No need to exchange for Instagram long-lived token
      const accessToken = tokenResponse.access_token;
      const expiresIn = tokenResponse.expires_in || 5184000; // Default to 60 days if not provided

      this.logger.log('Step 2: Fetching user profile');
      const userProfile = await this.fetchUserProfile(accessToken);
      this.logger.log(
        `Step 2 completed: Profile fetched for @${userProfile.username}`,
      );

      this.logger.log('Step 3: Storing client account');
      const clientAccount = await this.storeClientAccount(userId, userProfile);
      this.logger.log(
        `Step 3 completed: Account stored with ID ${clientAccount.id}`,
      );

      this.logger.log('Step 4: Storing OAuth token');
      await this.storeOAuthToken(
        userId,
        clientAccount.id,
        accessToken,
        expiresIn,
      );
      this.logger.log('Step 4 completed: OAuth token stored');

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

    const token =
      await this.oauthTokenRepository.findByClientAccountId(accountId);
    if (token) {
      await this.oauthTokenRepository.delete(token.id);
    }

    account.disconnect();
    await this.clientAccountRepository.update(account);
  }

  async refreshTokenIfNeeded(accountId: string): Promise<string> {
    const token =
      await this.oauthTokenRepository.findByClientAccountId(accountId);
    if (!token) {
      throw new UnauthorizedException('No OAuth token found for account');
    }

    if (token.isExpiringSoon(7)) {
      const decryptedToken = (token as any).props.encryptedAccessToken;
      const refreshed = await this.refreshFacebookToken(decryptedToken);

      token.updateToken(
        refreshed.access_token,
        new Date(Date.now() + refreshed.expires_in * 1000),
      );

      await this.oauthTokenRepository.update(token);
      return refreshed.access_token;
    }

    return (token as any).props.encryptedAccessToken;
  }

  private async exchangeCodeForToken(
    code: string,
  ): Promise<InstagramTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
      code,
    });

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Instagram token exchange failed: ${errorText}`);
      throw new Error(
        `Instagram token exchange failed: ${response.statusText}`,
      );
    }

    return response.json();
  }

  private async refreshFacebookToken(
    token: string,
  ): Promise<InstagramLongLivedTokenResponse> {
    // Exchange short-lived token for long-lived token using Facebook Graph API
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      fb_exchange_token: token,
    });

    const response = await fetch(
      `${this.fbGraphBaseUrl}/oauth/access_token?${params.toString()}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Facebook token refresh failed: ${errorText}`);
      throw new Error(`Facebook token refresh failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async fetchUserProfile(
    accessToken: string,
  ): Promise<InstagramUserProfile> {
    // Step 1: Get Facebook Pages
    this.logger.log('Fetching Facebook Pages...');
    const pagesParams = new URLSearchParams({
      fields: 'id,name,instagram_business_account',
      access_token: accessToken,
    });

    const pagesResponse = await fetch(
      `${this.fbGraphBaseUrl}/me/accounts?${pagesParams.toString()}`,
    );

    if (!pagesResponse.ok) {
      const errorText = await pagesResponse.text();
      this.logger.error(`Failed to fetch Facebook pages: ${errorText}`);
      throw new Error(
        'Failed to fetch Facebook pages. Make sure you have a Facebook Page connected.',
      );
    }

    const pagesData = await pagesResponse.json();
    this.logger.log(
      `Facebook Pages response: ${JSON.stringify(pagesData, null, 2)}`,
    );

    if (!pagesData.data || pagesData.data.length === 0) {
      throw new Error(
        'No Facebook Pages found. Please create a Facebook Page and link your Instagram Business Account to it.',
      );
    }

    this.logger.log(`Found ${pagesData.data.length} Facebook Page(s)`);
    pagesData.data.forEach((page: any, index: number) => {
      this.logger.log(
        `Page ${index + 1}: ${page.name} (ID: ${page.id}) - Has IG: ${!!page.instagram_business_account}`,
      );
    });

    // Find first page with Instagram Business Account
    const pageWithIG = pagesData.data.find(
      (page: any) => page.instagram_business_account,
    );

    if (!pageWithIG || !pageWithIG.instagram_business_account) {
      const pagesList = pagesData.data.map((p: any) => p.name).join(', ');
      throw new Error(
        `No Instagram Business Account found on your Facebook Pages (${pagesList}). Please link your Instagram account to one of these pages.`,
      );
    }

    const igBusinessAccountId = pageWithIG.instagram_business_account.id;
    this.logger.log(
      `Found Instagram Business Account: ${igBusinessAccountId} on page: ${pageWithIG.name}`,
    );

    // Step 2: Get Instagram Business Account details using Facebook Graph API
    const profileParams = new URLSearchParams({
      fields:
        'id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography,website',
      access_token: accessToken,
    });

    const profileResponse = await fetch(
      `${this.fbGraphBaseUrl}/${igBusinessAccountId}?${profileParams.toString()}`,
    );

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      this.logger.error(
        `Failed to fetch Instagram Business Account profile: ${errorText}`,
      );
      throw new Error('Failed to fetch Instagram Business Account profile');
    }

    const igAccount = await profileResponse.json();
    this.logger.log(
      `Instagram Business Account fetched: @${igAccount.username}`,
    );

    return {
      id: igBusinessAccountId,
      username: igAccount.username,
      name: igAccount.name || igAccount.username,
      profile_picture_url: igAccount.profile_picture_url,
      followers_count: igAccount.followers_count,
      follows_count: igAccount.follows_count,
      media_count: igAccount.media_count,
      biography: igAccount.biography,
      website: igAccount.website,
      account_type: 'BUSINESS', // It's a Business Account from Facebook Page
    };
  }

  private async storeClientAccount(
    userId: string,
    profile: InstagramUserProfile,
  ): Promise<ClientAccount> {
    const existing = await this.clientAccountRepository.findByPlatformAccountId(
      Platform.INSTAGRAM,
      profile.id,
    );

    // Map Instagram API account type to our enum
    const accountType = this.mapAccountType(profile.account_type);
    this.logger.log(`Storing account as type: ${accountType}`);

    if (existing) {
      existing.reactivate();
      existing.updateMetadata({
        mediaCount: profile.media_count || 0,
        profilePictureUrl: profile.profile_picture_url,
        displayName: profile.name,
        followerCount: profile.followers_count,
        followingCount: profile.follows_count,
        biography: profile.biography,
        website: profile.website,
      });
      // Update account type
      (existing as any).accountType = accountType;
      return this.clientAccountRepository.update(existing);
    }

    const clientAccount = ClientAccount.create({
      userId,
      platform: Platform.INSTAGRAM,
      platformAccountId: profile.id,
      username: profile.username,
      displayName: profile.name,
      profilePictureUrl: profile.profile_picture_url,
      followerCount: profile.followers_count,
      followingCount: profile.follows_count,
      mediaCount: profile.media_count,
      biography: profile.biography,
      website: profile.website,
      status: AccountStatus.ACTIVE,
      accountType,
      permissions: this.scopes,
      metadata: {},
    });

    return this.clientAccountRepository.create(clientAccount);
  }

  private mapAccountType(apiType: string): InstagramAccountType {
    switch (apiType?.toUpperCase()) {
      case 'BUSINESS':
        return InstagramAccountType.BUSINESS;
      case 'CREATOR':
        return InstagramAccountType.CREATOR;
      case 'MEDIA_CREATOR':
        return InstagramAccountType.CREATOR;
      default:
        return InstagramAccountType.PERSONAL;
    }
  }

  private async storeOAuthToken(
    userId: string,
    clientAccountId: string,
    accessToken: string,
    expiresIn: number,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    const existingToken =
      await this.oauthTokenRepository.findByClientAccountId(clientAccountId);
    if (existingToken) {
      await this.oauthTokenRepository.delete(existingToken.id);
    }

    const oauthToken = OAuthToken.create({
      userId,
      clientAccountId,
      platform: 'instagram',
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

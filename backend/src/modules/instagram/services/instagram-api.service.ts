import {
  Injectable,
  Logger,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { IOAuthTokenRepository } from '../../../domain/repositories/oauth-token.repository.interface';
import { InstagramRateLimiter } from '../utils/rate-limiter';
import {
  InstagramGraphApiException,
  InstagramApiError,
} from '../dto/instagram-api-error.dto';
import { InstagramProfileDto } from '../dto/instagram-profile.dto';
import {
  InstagramMediaDto,
  InstagramMediaListResponse,
  InstagramInsightsResponse,
  InstagramConversationsListResponse,
  InstagramMessagesListResponse,
} from '../dto/instagram-media.dto';
import { RedisService } from '../../../infrastructure/cache/redis.service';

// Re-export for backwards compatibility
export interface InstagramGraphApiProfile extends InstagramProfileDto {}

@Injectable()
export class InstagramApiService {
  private readonly logger = new Logger(InstagramApiService.name);
  private readonly client: AxiosInstance;
  // Use Facebook Graph API for Instagram Business API access via Facebook Login
  private readonly BASE_URL = 'https://graph.facebook.com';
  private readonly API_VERSION = 'v24.0';
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT_MS = 30000;
  private readonly PROFILE_CACHE_TTL = 86400; // 24 hours in seconds

  constructor(
    private readonly configService: ConfigService,
    @Inject('IOAuthTokenRepository')
    private readonly oauthTokenRepository: IOAuthTokenRepository,
    private readonly rateLimiter: InstagramRateLimiter,
    private readonly redisService: RedisService,
  ) {
    this.client = axios.create({
      baseURL: `${this.BASE_URL}/${this.API_VERSION}`,
      timeout: this.TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => this.handleApiError(error),
    );
  }

  /**
   * Get system user token from environment
   */
  private getSystemUserToken(): string | null {
    return (
      this.configService.get<string>('INSTAGRAM_SYSTEM_USER_TOKEN') || null
    );
  }

  /**
   * Get Instagram user profile
   */
  async getUserProfile(
    accountId: string,
    platformAccountId: string,
  ): Promise<InstagramProfileDto> {
    const token = await this.getAccessToken(accountId);

    const fields = [
      'id',
      'username',
      'name',
      'biography',
      'profile_picture_url',
      'website',
      'followers_count',
      'follows_count',
      'media_count',
    ];

    // Use Instagram Business Account ID instead of /me
    const endpoint = `/${platformAccountId}`;

    // TEMPORARY DEBUG: Log the full request URL with token for curl testing
    const testUrl = `${this.BASE_URL}/${this.API_VERSION}${endpoint}?fields=${fields.join(',')}&access_token=${token}`;
    this.logger.log(
      `🔍 DEBUG - Full API request URL for curl testing:\ncurl "${testUrl}"`,
    );

    const response = await this.makeRequest<InstagramProfileDto>(
      accountId,
      'GET',
      endpoint,
      {
        fields: fields.join(','),
        access_token: token,
      },
    );

    return response.data;
  }

  /**
   * Get Instagram user profile by platform ID
   *
   * Fetches minimal profile information (id, username, profile_picture_url) for a given Instagram user.
   * Implements caching with Redis (24-hour TTL) to reduce API calls and respect rate limits.
   * Returns null on failure instead of throwing to enable non-blocking profile enrichment.
   *
   * Rate Limiting Strategy:
   * - Cached profiles are served immediately without API calls
   * - Cache misses trigger API calls subject to rate limiting
   * - Failed API calls return null to prevent blocking critical flows
   * - Cache errors are logged but do not prevent profile fetch
   *
   * @param accountId - Client account ID used for API authentication and rate limiting
   * @param participantPlatformId - Instagram user's platform ID (IGID)
   * @returns Profile data or null if fetch fails or user not found
   */
  async getUserProfileById(
    accountId: string,
    participantPlatformId: string,
  ): Promise<InstagramProfileDto | null> {
    const cacheKey = `instagram:profile:${participantPlatformId}`;
    try {
      const cachedProfile = await this.redisService.get(cacheKey);
      if (cachedProfile) {
        this.logger.debug(`Cache hit for profile ${participantPlatformId}`);
        return JSON.parse(cachedProfile) as InstagramProfileDto;
      }
      this.logger.debug(
        `Cache miss for profile ${participantPlatformId}, fetching from API`,
      );
    } catch (cacheError) {
      const errorMessage =
        cacheError instanceof Error ? cacheError.message : 'Unknown error';
      this.logger.warn(
        `Redis cache read error for profile ${participantPlatformId}: ${errorMessage}`,
      );
    }
    try {
      const token = await this.getAccessToken(accountId);
      const fields = ['id', 'username', 'profile_picture_url'];
      const endpoint = `/${participantPlatformId}`;
      const response = await this.makeRequest<InstagramProfileDto>(
        accountId,
        'GET',
        endpoint,
        {
          fields: fields.join(','),
          access_token: token,
        },
      );
      const profileData = response.data;
      try {
        await this.redisService.set(
          cacheKey,
          JSON.stringify(profileData),
          this.PROFILE_CACHE_TTL,
        );
        this.logger.debug(
          `Profile cached for ${participantPlatformId} with TTL ${this.PROFILE_CACHE_TTL}s`,
        );
      } catch (cacheError) {
        const errorMessage =
          cacheError instanceof Error ? cacheError.message : 'Unknown error';
        this.logger.warn(
          `Redis cache write error for profile ${participantPlatformId}: ${errorMessage}`,
        );
      }
      return profileData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to fetch profile for participant ${participantPlatformId}: ${errorMessage}`,
      );
      return null;
    }
  }

  /**
   * Get user media list with pagination
   */
  async getMediaList(
    accountId: string,
    options: {
      limit?: number;
      after?: string;
      before?: string;
    } = {},
  ): Promise<InstagramMediaListResponse> {
    const token = await this.getAccessToken(accountId);

    const fields = [
      'id',
      'media_type',
      'media_url',
      'permalink',
      'caption',
      'timestamp',
      'like_count',
      'comments_count',
      'thumbnail_url',
      'children{id,media_type,media_url}',
    ];

    const params: Record<string, any> = {
      fields: fields.join(','),
      access_token: token,
      limit: options.limit || 25,
    };

    if (options.after) params.after = options.after;
    if (options.before) params.before = options.before;

    const response = await this.makeRequest<InstagramMediaListResponse>(
      accountId,
      'GET',
      '/me/media',
      params,
    );

    return response.data;
  }

  /**
   * Get single media item
   */
  async getMedia(
    accountId: string,
    mediaId: string,
  ): Promise<InstagramMediaDto> {
    const token = await this.getAccessToken(accountId);

    const fields = [
      'id',
      'media_type',
      'media_url',
      'permalink',
      'caption',
      'timestamp',
      'like_count',
      'comments_count',
      'thumbnail_url',
      'owner',
    ];

    const response = await this.makeRequest<InstagramMediaDto>(
      accountId,
      'GET',
      `/${mediaId}`,
      {
        fields: fields.join(','),
        access_token: token,
      },
    );

    return response.data;
  }

  /**
   * Create media container (step 1 of publishing)
   */
  async createMediaContainer(
    accountId: string,
    data: {
      image_url?: string;
      video_url?: string;
      caption?: string;
      media_type?: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
      children?: string[]; // Media container IDs for carousel
    },
  ): Promise<{ id: string }> {
    const token = await this.getAccessToken(accountId);

    const params: Record<string, any> = {
      access_token: token,
    };

    if (data.image_url) params.image_url = data.image_url;
    if (data.video_url) params.video_url = data.video_url;
    if (data.caption) params.caption = data.caption;
    if (data.media_type) params.media_type = data.media_type;
    if (data.children) params.children = data.children.join(',');

    const response = await this.makeRequest<{ id: string }>(
      accountId,
      'POST',
      '/me/media',
      params,
    );

    return response.data;
  }

  /**
   * Publish media container (step 2 of publishing)
   */
  async publishMedia(
    accountId: string,
    creationId: string,
  ): Promise<{ id: string }> {
    const token = await this.getAccessToken(accountId);

    const response = await this.makeRequest<{ id: string }>(
      accountId,
      'POST',
      '/me/media_publish',
      {
        creation_id: creationId,
        access_token: token,
      },
    );

    return response.data;
  }

  /**
   * Get account insights
   */
  async getAccountInsights(
    accountId: string,
    metrics: string[],
    period: 'day' | 'week' | 'days_28' | 'lifetime',
  ): Promise<InstagramInsightsResponse> {
    const token = await this.getAccessToken(accountId);

    const response = await this.makeRequest<InstagramInsightsResponse>(
      accountId,
      'GET',
      '/me/insights',
      {
        metric: metrics.join(','),
        period,
        access_token: token,
      },
    );

    return response.data;
  }

  /**
   * Get media insights
   */
  async getMediaInsights(
    accountId: string,
    mediaId: string,
    metrics: string[],
  ): Promise<InstagramInsightsResponse> {
    const token = await this.getAccessToken(accountId);

    const response = await this.makeRequest<InstagramInsightsResponse>(
      accountId,
      'GET',
      `/${mediaId}/insights`,
      {
        metric: metrics.join(','),
        access_token: token,
      },
    );

    return response.data;
  }

  /**
   * Get conversations (DMs)
   */
  async getConversations(
    accountId: string,
    options: { limit?: number; after?: string } = {},
  ): Promise<InstagramConversationsListResponse> {
    const token = await this.getAccessToken(accountId);

    const params: Record<string, any> = {
      fields: 'id,participants,updated_time',
      platform: 'instagram',
      limit: options.limit || 25,
      access_token: token,
    };

    if (options.after) params.after = options.after;

    const response = await this.makeRequest<InstagramConversationsListResponse>(
      accountId,
      'GET',
      '/me/conversations',
      params,
    );

    return response.data;
  }

  /**
   * Get messages from conversation
   */
  async getMessages(
    accountId: string,
    conversationId: string,
    options: { limit?: number; after?: string } = {},
  ): Promise<InstagramMessagesListResponse> {
    const token = await this.getAccessToken(accountId);

    const params: Record<string, any> = {
      fields: 'id,from,message,created_time,attachments',
      limit: options.limit || 25,
      access_token: token,
    };

    if (options.after) params.after = options.after;

    const response = await this.makeRequest<InstagramMessagesListResponse>(
      accountId,
      'GET',
      `/${conversationId}/messages`,
      params,
    );

    return response.data;
  }

  /**
   * Send message
   */
  async sendMessage(
    accountId: string,
    recipientId: string,
    message: string,
  ): Promise<{ id: string }> {
    const token = await this.getAccessToken(accountId);

    const response = await this.makeRequest<{ id: string }>(
      accountId,
      'POST',
      '/me/messages',
      {
        recipient: { id: recipientId },
        message: { text: message },
        access_token: token,
      },
    );

    return response.data;
  }

  /**
   * Revoke access token
   */
  async revokeToken(accountId: string): Promise<void> {
    try {
      const token = await this.getAccessToken(accountId);

      await this.client.delete('/me/permissions', {
        params: { access_token: token },
      });

      this.logger.log(`Token revoked successfully for account ${accountId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to revoke token for account ${accountId}: ${errorMessage}`,
      );
      // Don't throw - token revocation is best-effort
    }
  }

  /**
   * Test if token is valid by making a simple API call
   */
  async testToken(
    accountId: string,
    platformAccountId: string,
  ): Promise<boolean> {
    try {
      await this.getUserProfile(accountId, platformAccountId);
      return true;
    } catch (error) {
      this.logger.warn(`Token test failed for account ${accountId}:`, error);
      return false;
    }
  }

  /**
   * Make authenticated API request with retry logic
   */
  private async makeRequest<T = any>(
    accountId: string,
    method: 'GET' | 'POST' | 'DELETE',
    endpoint: string,
    params?: Record<string, any>,
    attempt: number = 0,
  ): Promise<AxiosResponse<T>> {
    // Check rate limit
    const waitMs = await this.rateLimiter.shouldWait(accountId);
    if (waitMs > 0) {
      this.logger.warn(
        `Rate limit reached for account ${accountId}, waiting ${waitMs}ms`,
      );
      await this.sleep(waitMs);
    }

    try {
      // Record API call
      await this.rateLimiter.recordApiCall(accountId);

      let response: AxiosResponse<T>;

      if (method === 'GET' || method === 'DELETE') {
        response = await this.client.request<T>({
          method,
          url: endpoint,
          params,
        });
      } else {
        response = await this.client.request<T>({
          method,
          url: endpoint,
          data: params,
        });
      }

      // Update rate limit from response headers
      if (response.headers) {
        await this.rateLimiter.updateFromHeaders(
          accountId,
          response.headers as Record<string, string | string[] | undefined>,
        );
      }

      return response;
    } catch (error) {
      if (error instanceof InstagramGraphApiException && error.isRetryable()) {
        if (attempt < this.MAX_RETRIES) {
          const backoffMs = this.rateLimiter.calculateBackoff(attempt);
          this.logger.warn(
            `Retrying request after ${backoffMs}ms (attempt ${attempt + 1}/${this.MAX_RETRIES})`,
          );
          await this.sleep(backoffMs);
          return this.makeRequest<T>(
            accountId,
            method,
            endpoint,
            params,
            attempt + 1,
          );
        }
      }

      throw error;
    }
  }

  /**
   * Get and decrypt access token
   * Falls back to system user token if available
   */
  private async getAccessToken(accountId: string): Promise<string> {
    // If accountId is 'system', use system token directly (skip database query)
    if (accountId === 'system') {
      const systemToken = this.getSystemUserToken();
      if (systemToken) {
        this.logger.log('Using system user token (accountId=system)');
        return systemToken;
      }
      throw new HttpException(
        'System user token not configured',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Try to get user-specific token first
    const token =
      await this.oauthTokenRepository.findByClientAccountId(accountId);

    if (!token) {
      // Fall back to system user token if available
      const systemToken = this.getSystemUserToken();
      if (systemToken) {
        this.logger.log(
          `Using system user token for account ${accountId} (no user token found)`,
        );
        return systemToken;
      }

      throw new HttpException(
        'Access token not found for account',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Check if token is expired
    const expiresAt = (token as any).props?.expiresAt;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      // Fall back to system user token if token is expired
      const systemToken = this.getSystemUserToken();
      if (systemToken) {
        this.logger.warn(
          `User token expired for account ${accountId}, falling back to system token`,
        );
        return systemToken;
      }

      throw new HttpException('Access token expired', HttpStatus.UNAUTHORIZED);
    }

    // Access the decrypted token (assumes OAuthToken entity has proper decryption)
    const decryptedToken = (token as any).props?.encryptedAccessToken;

    if (!decryptedToken) {
      // Fall back to system user token if decryption fails
      const systemToken = this.getSystemUserToken();
      if (systemToken) {
        this.logger.warn(
          `Failed to decrypt token for account ${accountId}, falling back to system token`,
        );
        return systemToken;
      }

      throw new HttpException(
        'Failed to decrypt access token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return decryptedToken;
  }

  /**
   * Handle API errors
   */
  private handleApiError(error: AxiosError): never {
    if (error.response?.data) {
      const apiError = error.response.data as { error?: InstagramApiError };

      if (apiError.error) {
        const exception = new InstagramGraphApiException(
          apiError.error.message,
          apiError.error.code,
          apiError.error.type,
          apiError.error.error_subcode,
          apiError.error.fbtrace_id,
          apiError.error.error_user_msg,
        );

        this.logger.error('Instagram API error:', exception.toObject());

        throw exception;
      }
    }

    // Network or timeout error
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new InstagramGraphApiException(
        'Request timeout',
        504,
        'NetworkError',
      );
    }

    if (error.code === 'ECONNREFUSED') {
      throw new InstagramGraphApiException(
        'Connection refused',
        503,
        'NetworkError',
      );
    }

    throw new InstagramGraphApiException(
      error.message || 'Unknown API error',
      500,
      'UnknownError',
    );
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

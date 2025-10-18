# IG-003: Instagram Graph API Wrapper Service

**Priority:** P0 (Critical Path)
**Effort:** 6 hours
**Day:** 7
**Dependencies:** IG-001 (Instagram OAuth 2.0 Flow)
**Domain:** Instagram Integration

---

## Overview

Create a comprehensive wrapper service for Instagram Graph API with robust error handling, rate limiting, retry logic with exponential backoff, token management, and type-safe API responses. This service provides a centralized interface for all Instagram API interactions including profile data, media, insights, comments, and more.

---

## Instagram Graph API Reference

### Base URL
```
https://graph.instagram.com/v18.0
```

### Key Endpoints
- `GET /{ig-user-id}` - Get user profile
- `GET /{ig-user-id}/media` - Get user media
- `POST /{ig-user-id}/media` - Create media container
- `POST /{ig-user-id}/media_publish` - Publish media
- `GET /{ig-user-id}/insights` - Get account insights
- `GET /{media-id}/insights` - Get media insights
- `GET /{ig-user-id}/conversations` - Get conversations
- `POST /{conversation-id}/messages` - Send message

---

## Data Models

### API Error Response

```typescript
// File: /backend/src/modules/instagram/dto/instagram-api-error.dto.ts

export interface InstagramApiError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  error_user_title?: string;
  error_user_msg?: string;
  fbtrace_id?: string;
}

export class InstagramGraphApiException extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly type: string,
    public readonly subcode?: number,
    public readonly fbtraceId?: string,
  ) {
    super(message);
    this.name = 'InstagramGraphApiException';
  }

  isRateLimitError(): boolean {
    return this.code === 4 || this.code === 32 || this.type === 'OAuthException';
  }

  isTokenExpired(): boolean {
    return this.code === 190 || this.subcode === 463;
  }

  isPermissionError(): boolean {
    return this.code === 10 || this.code === 200;
  }

  isRetryable(): boolean {
    return this.code >= 500 || this.code === 1 || this.code === 2;
  }
}
```

### Instagram Profile DTO

```typescript
// File: /backend/src/modules/instagram/dto/instagram-profile.dto.ts

export interface InstagramProfileDto {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  profile_picture_url?: string;
  website?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  ig_id?: number; // Instagram Business Account ID
  is_verified?: boolean;
  account_type?: 'BUSINESS' | 'CREATOR' | 'PERSONAL';
}
```

### Instagram Media DTO

```typescript
// File: /backend/src/modules/instagram/dto/instagram-media.dto.ts

export interface InstagramMediaDto {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  permalink?: string;
  caption?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  thumbnail_url?: string; // For videos
  children?: { data: InstagramMediaDto[] }; // For carousels
  owner?: { id: string; username: string };
}

export interface InstagramMediaListResponse {
  data: InstagramMediaDto[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
}
```

---

## Implementation

### Phase 1: Rate Limiter Utility (1 hour)

```typescript
// File: /backend/src/modules/instagram/utils/rate-limiter.ts

import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}

@Injectable()
export class InstagramRateLimiter {
  private readonly RATE_LIMIT_PREFIX = 'ig:rate_limit:';

  // Instagram Graph API rate limits (per access token per hour)
  private readonly DEFAULT_RATE_LIMIT = 200; // calls per hour
  private readonly WINDOW_MS = 60 * 60 * 1000; // 1 hour

  constructor(private readonly redis: Redis) {}

  /**
   * Check if request is allowed under rate limit
   */
  async checkRateLimit(accountId: string): Promise<RateLimitInfo> {
    const key = `${this.RATE_LIMIT_PREFIX}${accountId}`;
    const now = Date.now();
    const windowStart = now - this.WINDOW_MS;

    // Remove old entries outside the time window
    await this.redis.zremrangebyscore(key, '-inf', windowStart);

    // Count requests in current window
    const requestCount = await this.redis.zcard(key);

    const remaining = Math.max(0, this.DEFAULT_RATE_LIMIT - requestCount);
    const resetAt = new Date(now + this.WINDOW_MS);

    return {
      limit: this.DEFAULT_RATE_LIMIT,
      remaining,
      resetAt,
    };
  }

  /**
   * Record an API call
   */
  async recordApiCall(accountId: string): Promise<void> {
    const key = `${this.RATE_LIMIT_PREFIX}${accountId}`;
    const now = Date.now();

    // Add current request to sorted set
    await this.redis.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiration to clean up old data
    await this.redis.expire(key, Math.ceil(this.WINDOW_MS / 1000));
  }

  /**
   * Check if we should wait before making request
   */
  async shouldWait(accountId: string): Promise<number> {
    const rateLimit = await this.checkRateLimit(accountId);

    if (rateLimit.remaining === 0) {
      const waitMs = rateLimit.resetAt.getTime() - Date.now();
      return Math.max(0, waitMs);
    }

    return 0;
  }

  /**
   * Update rate limit info from API response headers
   */
  async updateFromHeaders(
    accountId: string,
    headers: Record<string, string>,
  ): Promise<void> {
    const remaining = parseInt(headers['x-app-usage-remaining'] || '200', 10);
    const resetTime = parseInt(headers['x-app-usage-reset'] || '0', 10);

    if (remaining !== undefined && resetTime) {
      const key = `${this.RATE_LIMIT_PREFIX}${accountId}:info`;
      await this.redis.setex(
        key,
        60 * 60,
        JSON.stringify({ remaining, resetAt: resetTime * 1000 }),
      );
    }
  }

  /**
   * Calculate backoff delay for retry
   */
  calculateBackoff(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const baseDelay = 1000;
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

    // Add jitter to avoid thundering herd
    const jitter = Math.random() * 0.3 * delay;

    return delay + jitter;
  }
}
```

### Phase 2: Instagram API Service (2.5 hours)

```typescript
// File: /backend/src/modules/instagram/services/instagram-api.service.ts

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { IOAuthTokenRepository } from '../../../domain/repositories/oauth-token.repository.interface';
import { InstagramRateLimiter } from '../utils/rate-limiter';
import {
  InstagramGraphApiException,
  InstagramApiError,
} from '../dto/instagram-api-error.dto';
import {
  InstagramProfileDto,
  InstagramMediaDto,
  InstagramMediaListResponse,
} from '../dto/instagram-media.dto';

@Injectable()
export class InstagramApiService {
  private readonly logger = new Logger(InstagramApiService.name);
  private readonly client: AxiosInstance;
  private readonly BASE_URL = 'https://graph.instagram.com/v18.0';
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly tokenRepository: IOAuthTokenRepository,
    private readonly rateLimiter: InstagramRateLimiter,
  ) {
    this.client = axios.create({
      baseURL: this.BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleApiError(error),
    );
  }

  /**
   * Get user profile from Instagram
   */
  async getUserProfile(accountId: string): Promise<InstagramProfileDto> {
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
      'ig_id',
    ];

    const response = await this.makeRequest<InstagramProfileDto>(
      accountId,
      'GET',
      '/me',
      {
        fields: fields.join(','),
        access_token: token,
      },
    );

    return response.data;
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
  async getMedia(accountId: string, mediaId: string): Promise<InstagramMediaDto> {
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
  ): Promise<any> {
    const token = await this.getAccessToken(accountId);

    const response = await this.makeRequest(
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
  ): Promise<any> {
    const token = await this.getAccessToken(accountId);

    const response = await this.makeRequest(
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
  ): Promise<any> {
    const token = await this.getAccessToken(accountId);

    const response = await this.makeRequest(
      accountId,
      'GET',
      '/me/conversations',
      {
        fields: 'id,participants,updated_time',
        platform: 'instagram',
        limit: options.limit || 25,
        after: options.after,
        access_token: token,
      },
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
  ): Promise<any> {
    const token = await this.getAccessToken(accountId);

    const response = await this.makeRequest(
      accountId,
      'GET',
      `/${conversationId}/messages`,
      {
        fields: 'id,from,message,created_time,attachments',
        limit: options.limit || 25,
        after: options.after,
        access_token: token,
      },
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
    const token = await this.getAccessToken(accountId);

    try {
      await this.client.delete('/me/permissions', {
        params: { access_token: token },
      });
    } catch (error) {
      this.logger.warn(`Failed to revoke token for account ${accountId}:`, error.message);
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
        await this.rateLimiter.updateFromHeaders(accountId, response.headers);
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
          return this.makeRequest<T>(accountId, method, endpoint, params, attempt + 1);
        }
      }

      throw error;
    }
  }

  /**
   * Get and decrypt access token
   */
  private async getAccessToken(accountId: string): Promise<string> {
    const token = await this.tokenRepository.findByAccountId(accountId);

    if (!token) {
      throw new HttpException(
        'Access token not found for account',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
      throw new HttpException(
        'Access token expired',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Decrypt token (encryption handled in repository)
    return token.accessToken;
  }

  /**
   * Handle API errors
   */
  private handleApiError(error: AxiosError): never {
    if (error.response?.data) {
      const apiError = error.response.data as { error?: InstagramApiError };

      if (apiError.error) {
        throw new InstagramGraphApiException(
          apiError.error.message,
          apiError.error.code,
          apiError.error.type,
          apiError.error.error_subcode,
          apiError.error.fbtrace_id,
        );
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
```

### Phase 3: OAuth Token Repository Extension (1 hour)

```typescript
// File: /backend/src/domain/repositories/oauth-token.repository.interface.ts

import { OAuthToken } from '../entities/oauth-token.entity';

export interface IOAuthTokenRepository {
  create(token: Partial<OAuthToken>): Promise<OAuthToken>;
  findByAccountId(accountId: string): Promise<OAuthToken | null>;
  findByUserId(userId: string): Promise<OAuthToken[]>;
  update(id: string, updates: Partial<OAuthToken>): Promise<OAuthToken>;
  delete(id: string): Promise<void>;
  findExpiringSoon(hours: number): Promise<OAuthToken[]>;
  refreshToken(accountId: string, newAccessToken: string, expiresAt: Date): Promise<void>;
}
```

```typescript
// File: /backend/src/domain/entities/oauth-token.entity.ts

export interface OAuthToken {
  id: string;
  accountId: string; // client_accounts.id
  userId: string;
  platform: 'instagram' | 'whatsapp';
  accessToken: string; // Encrypted
  refreshToken?: string; // Encrypted
  tokenType: string;
  scopes: string[];
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

```sql
-- File: /backend/migrations/003-create-oauth-tokens-table.sql

CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL, -- Encrypted with pgcrypto
  refresh_token TEXT,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  scopes JSONB DEFAULT '[]',
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_account_token UNIQUE (account_id)
);

CREATE INDEX idx_oauth_tokens_account ON oauth_tokens(account_id);
CREATE INDEX idx_oauth_tokens_user ON oauth_tokens(user_id);
CREATE INDEX idx_oauth_tokens_expires ON oauth_tokens(expires_at);

-- Trigger for updated_at
CREATE TRIGGER update_oauth_tokens_updated_at
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Phase 4: Module Configuration (30 minutes)

```typescript
// File: /backend/src/modules/instagram/instagram.module.ts

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { InstagramApiService } from './services/instagram-api.service';
import { InstagramAccountService } from './services/instagram-account.service';
import { InstagramOAuthService } from './services/instagram-oauth.service';
import { InstagramAccountController } from './controllers/instagram-account.controller';
import { InstagramOAuthController } from './controllers/instagram-oauth.controller';
import { InstagramRateLimiter } from './utils/rate-limiter';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { CacheModule } from '../../infrastructure/cache/cache.module';

@Module({
  imports: [
    HttpModule,
    DatabaseModule,
    CacheModule,
  ],
  providers: [
    InstagramApiService,
    InstagramAccountService,
    InstagramOAuthService,
    InstagramRateLimiter,
  ],
  controllers: [
    InstagramAccountController,
    InstagramOAuthController,
  ],
  exports: [
    InstagramApiService,
    InstagramAccountService,
  ],
})
export class InstagramModule {}
```

### Phase 5: Testing Service (1 hour)

```typescript
// File: /backend/src/modules/instagram/services/__tests__/instagram-api.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { InstagramApiService } from '../instagram-api.service';
import { InstagramRateLimiter } from '../../utils/rate-limiter';
import { IOAuthTokenRepository } from '../../../../domain/repositories/oauth-token.repository.interface';
import { InstagramGraphApiException } from '../../dto/instagram-api-error.dto';

describe('InstagramApiService', () => {
  let service: InstagramApiService;
  let tokenRepository: jest.Mocked<IOAuthTokenRepository>;
  let rateLimiter: jest.Mocked<InstagramRateLimiter>;

  beforeEach(async () => {
    const mockTokenRepository = {
      findByAccountId: jest.fn(),
    };

    const mockRateLimiter = {
      shouldWait: jest.fn().mockResolvedValue(0),
      recordApiCall: jest.fn().mockResolvedValue(undefined),
      updateFromHeaders: jest.fn().mockResolvedValue(undefined),
      calculateBackoff: jest.fn().mockReturnValue(1000),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstagramApiService,
        {
          provide: 'IOAuthTokenRepository',
          useValue: mockTokenRepository,
        },
        {
          provide: InstagramRateLimiter,
          useValue: mockRateLimiter,
        },
      ],
    }).compile();

    service = module.get<InstagramApiService>(InstagramApiService);
    tokenRepository = module.get('IOAuthTokenRepository');
    rateLimiter = module.get(InstagramRateLimiter);
  });

  describe('getUserProfile', () => {
    it('should fetch user profile successfully', async () => {
      const mockToken = {
        id: '1',
        accountId: 'account-123',
        accessToken: 'test-token',
        expiresAt: new Date(Date.now() + 3600000),
      };

      tokenRepository.findByAccountId.mockResolvedValue(mockToken as any);

      // Mock axios call would go here
      // For now, this is a structure example
    });

    it('should throw error if token not found', async () => {
      tokenRepository.findByAccountId.mockResolvedValue(null);

      await expect(service.getUserProfile('account-123')).rejects.toThrow();
    });

    it('should throw error if token expired', async () => {
      const expiredToken = {
        id: '1',
        accountId: 'account-123',
        accessToken: 'test-token',
        expiresAt: new Date(Date.now() - 3600000), // Expired
      };

      tokenRepository.findByAccountId.mockResolvedValue(expiredToken as any);

      await expect(service.getUserProfile('account-123')).rejects.toThrow();
    });
  });

  describe('Rate limiting', () => {
    it('should wait if rate limit reached', async () => {
      rateLimiter.shouldWait.mockResolvedValue(5000); // 5 seconds

      // Test would verify waiting behavior
    });

    it('should record API calls', async () => {
      // Test would verify recordApiCall is called
    });
  });

  describe('Retry logic', () => {
    it('should retry on retryable errors', async () => {
      // Test exponential backoff retry logic
    });

    it('should not retry on non-retryable errors', async () => {
      // Test immediate failure on permission errors
    });

    it('should give up after max retries', async () => {
      // Test max retry limit
    });
  });
});
```

---

## API Usage Examples

### Fetch User Profile

```typescript
const profile = await instagramApiService.getUserProfile('account-123');

console.log(profile);
// {
//   id: '17841405309211844',
//   username: 'johndoe',
//   name: 'John Doe',
//   biography: 'Digital creator',
//   profile_picture_url: 'https://...',
//   followers_count: 1250,
//   follows_count: 430,
//   media_count: 87
// }
```

### Fetch Media List

```typescript
const media = await instagramApiService.getMediaList('account-123', {
  limit: 10,
});

console.log(media);
// {
//   data: [
//     {
//       id: '17895695668004550',
//       media_type: 'IMAGE',
//       media_url: 'https://...',
//       caption: 'Great day!',
//       like_count: 45,
//       comments_count: 3,
//       timestamp: '2025-10-15T10:00:00+0000'
//     }
//   ],
//   paging: {
//     cursors: {
//       after: 'QVFIUmx...'
//     }
//   }
// }
```

### Publish Media

```typescript
// Step 1: Create container
const container = await instagramApiService.createMediaContainer('account-123', {
  image_url: 'https://minio.example.com/media/photo.jpg',
  caption: 'Check out this amazing photo! #instagram',
});

// Step 2: Publish
const published = await instagramApiService.publishMedia('account-123', container.id);

console.log(published);
// { id: '17895695668004550' }
```

### Get Insights

```typescript
const insights = await instagramApiService.getAccountInsights(
  'account-123',
  ['impressions', 'reach', 'profile_views'],
  'day',
);

console.log(insights);
// {
//   data: [
//     { name: 'impressions', period: 'day', values: [{ value: 1234 }] },
//     { name: 'reach', period: 'day', values: [{ value: 890 }] },
//     { name: 'profile_views', period: 'day', values: [{ value: 45 }] }
//   ]
// }
```

---

## Error Handling

### Rate Limit Example

```typescript
try {
  const profile = await instagramApiService.getUserProfile('account-123');
} catch (error) {
  if (error instanceof InstagramGraphApiException) {
    if (error.isRateLimitError()) {
      console.log('Rate limit reached, retry later');
      // Queue for retry
    } else if (error.isTokenExpired()) {
      console.log('Token expired, need to refresh');
      // Trigger OAuth refresh flow
    } else if (error.isPermissionError()) {
      console.log('Missing permissions');
      // Ask user to re-authorize
    }
  }
}
```

### Retry Example

```typescript
// Service automatically retries up to 3 times with exponential backoff
// Retry 1: 1s + jitter
// Retry 2: 2s + jitter
// Retry 3: 4s + jitter
// Retry 4: Fail
```

---

## Environment Variables

```bash
# .env
INSTAGRAM_GRAPH_API_URL=https://graph.instagram.com/v18.0
INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret
INSTAGRAM_RATE_LIMIT_PER_HOUR=200
INSTAGRAM_API_TIMEOUT_MS=30000
REDIS_URL=redis://localhost:6379
```

---

## Files to Create/Update

```
/backend/
├── src/
│   ├── modules/
│   │   └── instagram/
│   │       ├── services/
│   │       │   └── instagram-api.service.ts (NEW - 600 lines)
│   │       ├── utils/
│   │       │   └── rate-limiter.ts (NEW - 150 lines)
│   │       ├── dto/
│   │       │   ├── instagram-api-error.dto.ts (NEW - 60 lines)
│   │       │   ├── instagram-profile.dto.ts (NEW - 40 lines)
│   │       │   └── instagram-media.dto.ts (NEW - 60 lines)
│   │       ├── __tests__/
│   │       │   └── instagram-api.service.spec.ts (NEW - 200 lines)
│   │       └── instagram.module.ts (UPDATE)
│   ├── domain/
│   │   ├── entities/
│   │   │   └── oauth-token.entity.ts (NEW - 40 lines)
│   │   └── repositories/
│   │       └── oauth-token.repository.interface.ts (NEW - 30 lines)
│   └── infrastructure/
│       └── database/
│           └── repositories/
│               └── postgres-oauth-token.repository.ts (NEW - 150 lines)
└── migrations/
    └── 003-create-oauth-tokens-table.sql (NEW)
```

**Total Lines:** ~1,330 lines

---

## Acceptance Criteria

- [ ] InstagramApiService created with comprehensive API methods
- [ ] Rate limiting implemented with Redis-backed tracking
- [ ] Rate limit enforced at 200 calls per hour per account
- [ ] Exponential backoff retry logic implemented (max 3 retries)
- [ ] Token retrieval and decryption working
- [ ] Can fetch user profile from Instagram Graph API
- [ ] Can fetch media list with pagination support
- [ ] Can create and publish media containers
- [ ] Can fetch account-level insights
- [ ] Can fetch media-level insights
- [ ] Can fetch conversations (DMs)
- [ ] Can send messages via API
- [ ] Can revoke access tokens
- [ ] Graph API errors handled and converted to custom exceptions
- [ ] Token expiration detected and reported
- [ ] Permission errors detected and reported
- [ ] Network errors handled with appropriate retry
- [ ] Rate limit info updated from API response headers
- [ ] Jitter added to backoff to prevent thundering herd
- [ ] Type-safe responses with DTOs
- [ ] All methods fully typed with TypeScript
- [ ] Comprehensive error messages with fbtrace_id
- [ ] OAuth token repository created with encryption
- [ ] Database migration for oauth_tokens table created
- [ ] Unit tests written for InstagramApiService (>80% coverage)
- [ ] Integration tests for API endpoints
- [ ] Module properly configured with dependency injection

---

## Testing Procedure

```bash
# 1. Start backend
npm run start:dev

# 2. Test getUserProfile
curl -X GET http://localhost:4000/test/instagram/profile/account-123 \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Expected: Profile data returned

# 3. Test getMediaList
curl -X GET http://localhost:4000/test/instagram/media/account-123?limit=5 \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Expected: Array of media items

# 4. Test rate limiting
# Make 201 requests rapidly
for i in {1..201}; do
  curl -X GET http://localhost:4000/test/instagram/profile/account-123 \
    -H "Authorization: Bearer <JWT_TOKEN>"
done

# Expected: First 200 succeed, 201st waits or fails

# 5. Test retry logic
# Mock Instagram API to return 500 error
curl -X GET http://localhost:4000/test/instagram/profile/account-123 \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Mock-Error: 500"

# Expected: 3 retries with exponential backoff, then failure

# 6. Test token expiration
# Set token expiration to past date in database
psql -c "UPDATE oauth_tokens SET expires_at = NOW() - INTERVAL '1 hour' WHERE account_id = 'account-123'"

curl -X GET http://localhost:4000/test/instagram/profile/account-123 \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Expected: 401 Unauthorized with "Access token expired"

# 7. Run unit tests
npm run test -- instagram-api.service.spec.ts

# Expected: All tests pass

# 8. Check Redis rate limit data
redis-cli KEYS "ig:rate_limit:*"
redis-cli ZRANGE "ig:rate_limit:account-123" 0 -1 WITHSCORES

# Expected: API calls tracked in sorted set

# 9. Test concurrent requests (race condition)
# Make 10 concurrent requests
seq 10 | xargs -P10 -I{} curl -X GET http://localhost:4000/test/instagram/profile/account-123 \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Expected: All succeed, rate limit properly tracked

# 10. Monitor logs for errors
tail -f logs/app.log | grep "InstagramApiService"
```

---

## Performance Considerations

1. **Rate Limiting:** Redis-backed distributed rate limiting
2. **Caching:** Response caching can be added at service layer
3. **Connection Pooling:** Axios keeps connections alive
4. **Timeout:** 30-second timeout prevents hanging requests
5. **Retry Logic:** Exponential backoff prevents overwhelming API
6. **Parallel Requests:** Service supports concurrent requests safely
7. **Memory:** Rate limit data auto-expires after 1 hour

---

## Security Considerations

1. **Token Encryption:** Access tokens encrypted in database
2. **Token Expiration:** Tokens checked before use
3. **Input Validation:** All inputs validated
4. **Error Messages:** No sensitive data in error messages
5. **HTTPS Only:** All Instagram API calls over HTTPS
6. **Rate Limiting:** Prevents abuse and cost overruns
7. **Audit Logging:** All API calls logged with correlation IDs

---

## Cost Estimate

- **Instagram API:** Free (within rate limits)
- **Redis:** Included in existing infrastructure
- **Time Investment:** 6 hours
- **Total Additional Cost:** $0

---

## Dependencies

**Prerequisites:**
- IG-001 (Instagram OAuth - provides token)
- INFRA-004 (Redis - for rate limiting)
- BE-002 (Repository pattern)

**Blocks:**
- IG-004 (Direct Messages - uses this service)
- IG-006 (Post Scheduling - uses this service)
- IG-007 (Analytics - uses this service)

---

## Related Documents

- Architecture Design: `/tasks/social-selling/architecture-design.md`
- Implementation Plan: `/tasks/social-selling/implementation-plan.md`
- Instagram Graph API Docs: https://developers.facebook.com/docs/instagram-api
- Previous Task: IG-002 (Instagram Account Management)
- Next Tasks: IG-004 (Direct Messages), IG-006 (Post Scheduling)

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer

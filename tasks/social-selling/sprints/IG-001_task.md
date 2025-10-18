# IG-001: Instagram OAuth 2.0 Flow

**Priority:** P0 (Critical Path)
**Effort:** 6 hours
**Day:** 6
**Dependencies:** BE-004 (Authentication Module), BE-006 (Session Management)
**Domain:** Instagram Integration

---

## Overview

Implement Instagram OAuth 2.0 authorization flow to enable users to connect their Instagram accounts to the platform. This includes OAuth initiation, callback handling, token exchange, secure token storage with encryption, and token refresh logic.

---

## Data Models

### OAuth Token Entity

```typescript
// File: /backend/src/domain/entities/oauth-token.entity.ts

export interface OAuthToken {
  id: string; // UUID
  userId: string; // Foreign key to users table
  clientAccountId: string; // Foreign key to client_accounts table
  platform: 'instagram' | 'whatsapp';
  accessToken: string; // Encrypted with pgcrypto
  tokenType: 'Bearer';
  expiresAt: Date;
  scopes: string[]; // Array of granted permissions
  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
}
```

### Client Account Entity

```typescript
// File: /backend/src/domain/entities/client-account.entity.ts

export interface ClientAccount {
  id: string; // UUID
  userId: string; // Foreign key to users table
  platform: 'instagram' | 'whatsapp';
  platformAccountId: string; // Instagram User ID or WhatsApp Business Account ID
  username: string; // Instagram username
  profilePictureUrl: string | null;
  followerCount: number | null;
  status: AccountStatus;
  metadata: Record<string, any>; // JSONB for additional platform-specific data
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export enum AccountStatus {
  ACTIVE = 'active',
  TOKEN_EXPIRED = 'token_expired',
  TOKEN_REVOKED = 'token_revoked',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}
```

### OAuth State (Session Storage)

```typescript
// Stored in Redis during OAuth flow
export interface OAuthState {
  state: string; // Random CSRF token
  userId: string;
  redirectUri: string;
  createdAt: Date;
  expiresAt: Date;
}
```

### Instagram API Response Types

```typescript
// Access Token Exchange Response
export interface InstagramTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number; // Seconds until expiration (60 days)
}

// User Profile Response
export interface InstagramUserProfile {
  id: string;
  username: string;
  account_type: 'BUSINESS' | 'MEDIA_CREATOR' | 'PERSONAL';
  media_count: number;
}

// Long-Lived Token Exchange Response
export interface InstagramLongLivedTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number; // 5184000 seconds (60 days)
}
```

---

## API Endpoints

### GET /instagram/oauth/authorize

**Description:** Initiate Instagram OAuth flow by redirecting user to Instagram authorization page

**Query Parameters:** None

**Response (302 Redirect):**
```
Location: https://api.instagram.com/oauth/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://app-socialselling.willianbvsanches.com/api/instagram/oauth/callback
  &scope=user_profile,user_media,instagram_basic,instagram_manage_messages
  &response_type=code
  &state=RANDOM_CSRF_TOKEN
```

**Implementation:**
```typescript
@Get('oauth/authorize')
@UseGuards(JwtAuthGuard)
async authorize(@Request() req): Promise<void> {
  const redirectUrl = await this.instagramOAuthService.getAuthorizationUrl(req.user.id);
  return redirectUrl; // Frontend will handle redirect
}
```

---

### GET /instagram/oauth/callback

**Description:** Handle OAuth callback from Instagram, exchange code for access token, and store account

**Query Parameters:**
- `code` (string, required): Authorization code from Instagram
- `state` (string, required): CSRF token for validation
- `error` (string, optional): Error code if user denied access

**Response (302 Redirect to Frontend):**
```
Success: https://app-socialselling.willianbvsanches.com/clients?instagram_connected=true
Error: https://app-socialselling.willianbvsanches.com/clients?error=oauth_failed
```

**Error Handling:**
- If `error=access_denied`: User denied permission
- If state mismatch: CSRF attack detected
- If code exchange fails: Invalid authorization code

---

### POST /instagram/accounts/disconnect/:id

**Description:** Disconnect Instagram account and revoke OAuth token

**Path Parameters:**
- `id` (UUID): Client account ID

**Response (200 OK):**
```typescript
{
  "message": "Instagram account disconnected successfully",
  "accountId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Errors:**
- 404: Account not found
- 403: User doesn't own this account
- 500: Failed to revoke token with Instagram

---

## Implementation Approach

### Phase 1: Database Migration (45 minutes)

```sql
-- File: /backend/migrations/002-create-oauth-tables.sql

-- Client Accounts Table
CREATE TABLE client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  platform_account_id VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  profile_picture_url TEXT,
  follower_count INTEGER,
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  CONSTRAINT chk_platform CHECK (platform IN ('instagram', 'whatsapp')),
  CONSTRAINT chk_status CHECK (status IN ('active', 'token_expired', 'token_revoked', 'disconnected', 'error'))
);

CREATE UNIQUE INDEX idx_client_accounts_platform_account ON client_accounts(platform, platform_account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_client_accounts_user_id ON client_accounts(user_id) WHERE deleted_at IS NULL;

-- OAuth Tokens Table (with encryption)
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL, -- Encrypted with pgcrypto
  token_type VARCHAR(50) DEFAULT 'Bearer',
  expires_at TIMESTAMP NOT NULL,
  scopes TEXT[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  CONSTRAINT chk_oauth_platform CHECK (platform IN ('instagram', 'whatsapp'))
);

CREATE UNIQUE INDEX idx_oauth_tokens_client_account ON oauth_tokens(client_account_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX idx_oauth_tokens_expires_at ON oauth_tokens(expires_at) WHERE revoked_at IS NULL;

-- Encryption key for OAuth tokens (store in environment variable)
-- In application, use: pgp_sym_encrypt(token, encryption_key)
--                       pgp_sym_decrypt(access_token, encryption_key)

-- Trigger for updated_at
CREATE TRIGGER update_client_accounts_updated_at
  BEFORE UPDATE ON client_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_tokens_updated_at
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Phase 2: Instagram OAuth Service (2.5 hours)

```typescript
// File: /backend/src/modules/instagram/instagram-oauth.service.ts

import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { randomBytes } from 'crypto';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { IClientAccountRepository } from '../../domain/repositories/client-account.repository.interface';
import { IOAuthTokenRepository } from '../../domain/repositories/oauth-token.repository.interface';
import {
  InstagramTokenResponse,
  InstagramUserProfile,
  InstagramLongLivedTokenResponse,
} from './interfaces/instagram-api.interface';

@Injectable()
export class InstagramOAuthService {
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
    private readonly httpService: HttpService,
    private readonly redisService: RedisService,
    private readonly clientAccountRepository: IClientAccountRepository,
    private readonly oauthTokenRepository: IOAuthTokenRepository,
  ) {
    this.clientId = this.configService.get<string>('INSTAGRAM_APP_ID');
    this.clientSecret = this.configService.get<string>('INSTAGRAM_APP_SECRET');
    this.redirectUri = this.configService.get<string>('INSTAGRAM_REDIRECT_URI');
  }

  async getAuthorizationUrl(userId: string): Promise<string> {
    // Generate CSRF token (state)
    const state = this.generateState();

    // Store state in Redis with 10-minute expiration
    await this.redisService.set(
      `oauth:instagram:state:${state}`,
      JSON.stringify({ userId, createdAt: new Date() }),
      600, // 10 minutes
    );

    // Build authorization URL
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
    // 1. Validate state (CSRF protection)
    const stateData = await this.redisService.get(`oauth:instagram:state:${state}`);
    if (!stateData) {
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }

    const { userId } = JSON.parse(stateData);

    // Delete state from Redis (one-time use)
    await this.redisService.del(`oauth:instagram:state:${state}`);

    try {
      // 2. Exchange authorization code for short-lived access token
      const shortLivedToken = await this.exchangeCodeForToken(code);

      // 3. Exchange short-lived token for long-lived token (60 days)
      const longLivedToken = await this.exchangeForLongLivedToken(shortLivedToken.access_token);

      // 4. Fetch user profile from Instagram Graph API
      const userProfile = await this.fetchUserProfile(longLivedToken.access_token);

      // 5. Store or update client account
      const clientAccount = await this.storeClientAccount(userId, userProfile);

      // 6. Store encrypted OAuth token
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
      console.error('Instagram OAuth callback error:', error);
      throw new BadRequestException('Failed to connect Instagram account');
    }
  }

  async disconnectAccount(userId: string, accountId: string): Promise<void> {
    // 1. Verify account belongs to user
    const account = await this.clientAccountRepository.findById(accountId);
    if (!account || account.userId !== userId) {
      throw new UnauthorizedException('Account not found or unauthorized');
    }

    // 2. Get OAuth token
    const token = await this.oauthTokenRepository.findByClientAccountId(accountId);
    if (token) {
      // 3. Revoke token with Instagram (optional - Instagram doesn't have a revoke endpoint)
      // We just mark it as revoked in our database
      await this.oauthTokenRepository.revokeToken(token.id);
    }

    // 4. Update account status
    await this.clientAccountRepository.update(accountId, {
      status: 'disconnected',
    });
  }

  async refreshTokenIfNeeded(accountId: string): Promise<string> {
    const token = await this.oauthTokenRepository.findByClientAccountId(accountId);
    if (!token) {
      throw new UnauthorizedException('No OAuth token found for account');
    }

    // Check if token expires within 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    if (token.expiresAt < sevenDaysFromNow) {
      // Refresh token
      const decryptedToken = await this.oauthTokenRepository.getDecryptedToken(token.id);
      const refreshed = await this.refreshLongLivedToken(decryptedToken);

      // Update token in database
      await this.oauthTokenRepository.update(token.id, {
        accessToken: refreshed.access_token,
        expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      });

      return refreshed.access_token;
    }

    return await this.oauthTokenRepository.getDecryptedToken(token.id);
  }

  private async exchangeCodeForToken(code: string): Promise<InstagramTokenResponse> {
    const formData = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
      code,
    });

    const response = await firstValueFrom(
      this.httpService.post<InstagramTokenResponse>(
        `${this.authBaseUrl}/access_token`,
        formData.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      ),
    );

    return response.data;
  }

  private async exchangeForLongLivedToken(shortLivedToken: string): Promise<InstagramLongLivedTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: this.clientSecret,
      access_token: shortLivedToken,
    });

    const response = await firstValueFrom(
      this.httpService.get<InstagramLongLivedTokenResponse>(
        `${this.graphBaseUrl}/access_token?${params.toString()}`,
      ),
    );

    return response.data;
  }

  private async refreshLongLivedToken(token: string): Promise<InstagramLongLivedTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'ig_refresh_token',
      access_token: token,
    });

    const response = await firstValueFrom(
      this.httpService.get<InstagramLongLivedTokenResponse>(
        `${this.graphBaseUrl}/refresh_access_token?${params.toString()}`,
      ),
    );

    return response.data;
  }

  private async fetchUserProfile(accessToken: string): Promise<InstagramUserProfile> {
    const params = new URLSearchParams({
      fields: 'id,username,account_type,media_count',
      access_token: accessToken,
    });

    const response = await firstValueFrom(
      this.httpService.get<InstagramUserProfile>(
        `${this.graphBaseUrl}/me?${params.toString()}`,
      ),
    );

    return response.data;
  }

  private async storeClientAccount(userId: string, profile: InstagramUserProfile): Promise<any> {
    // Check if account already exists
    const existing = await this.clientAccountRepository.findByPlatformAccountId(
      'instagram',
      profile.id,
    );

    if (existing) {
      // Update existing account
      return this.clientAccountRepository.update(existing.id, {
        username: profile.username,
        status: 'active',
        metadata: { accountType: profile.account_type, mediaCount: profile.media_count },
      });
    }

    // Create new account
    return this.clientAccountRepository.create({
      userId,
      platform: 'instagram',
      platformAccountId: profile.id,
      username: profile.username,
      status: 'active',
      metadata: { accountType: profile.account_type, mediaCount: profile.media_count },
    });
  }

  private async storeOAuthToken(
    userId: string,
    clientAccountId: string,
    accessToken: string,
    expiresIn: number,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    // Revoke any existing tokens for this account
    await this.oauthTokenRepository.revokeByClientAccountId(clientAccountId);

    // Create new token (will be encrypted by repository)
    await this.oauthTokenRepository.create({
      userId,
      clientAccountId,
      platform: 'instagram',
      accessToken, // Repository will encrypt this
      tokenType: 'Bearer',
      expiresAt,
      scopes: this.scopes,
    });
  }

  private generateState(): string {
    return randomBytes(32).toString('hex');
  }
}
```

### Phase 3: Controller Implementation (1 hour)

```typescript
// File: /backend/src/modules/instagram/instagram.controller.ts

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Res,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InstagramOAuthService } from './instagram-oauth.service';

@ApiTags('Instagram Integration')
@Controller('instagram')
export class InstagramController {
  constructor(private readonly instagramOAuthService: InstagramOAuthService) {}

  @Get('oauth/authorize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Instagram OAuth flow' })
  @ApiResponse({ status: 200, description: 'Returns authorization URL' })
  async initiateOAuth(@Request() req): Promise<{ authorizationUrl: string }> {
    const authUrl = await this.instagramOAuthService.getAuthorizationUrl(req.user.id);
    return { authorizationUrl: authUrl };
  }

  @Get('oauth/callback')
  @ApiOperation({ summary: 'Handle Instagram OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend' })
  async handleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('APP_URL');

    if (error) {
      // User denied permission or error occurred
      return res.redirect(`${frontendUrl}/clients?error=access_denied`);
    }

    if (!code || !state) {
      return res.redirect(`${frontendUrl}/clients?error=invalid_request`);
    }

    try {
      const result = await this.instagramOAuthService.handleCallback(code, state);
      return res.redirect(`${frontendUrl}/clients?instagram_connected=true&account=${result.accountId}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      return res.redirect(`${frontendUrl}/clients?error=connection_failed`);
    }
  }

  @Delete('accounts/:id/disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Instagram account' })
  @ApiResponse({ status: 200, description: 'Account disconnected successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 403, description: 'Unauthorized' })
  async disconnectAccount(@Request() req, @Param('id') accountId: string) {
    await this.instagramOAuthService.disconnectAccount(req.user.id, accountId);
    return {
      message: 'Instagram account disconnected successfully',
      accountId,
    };
  }
}
```

### Phase 4: Token Repository with Encryption (1.5 hours)

```typescript
// File: /backend/src/infrastructure/database/repositories/postgres-oauth-token.repository.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Database } from '../database';
import { IOAuthTokenRepository } from '../../../domain/repositories/oauth-token.repository.interface';

@Injectable()
export class PostgresOAuthTokenRepository implements IOAuthTokenRepository {
  private readonly encryptionKey: string;

  constructor(
    private readonly db: Database,
    private readonly configService: ConfigService,
  ) {
    this.encryptionKey = this.configService.get<string>('OAUTH_ENCRYPTION_KEY');
  }

  async create(data: any): Promise<any> {
    const result = await this.db.one(
      `
      INSERT INTO oauth_tokens (
        user_id, client_account_id, platform, access_token,
        token_type, expires_at, scopes
      )
      VALUES ($1, $2, $3, pgp_sym_encrypt($4, $5), $6, $7, $8)
      RETURNING id, user_id, client_account_id, platform,
                token_type, expires_at, scopes, created_at
      `,
      [
        data.userId,
        data.clientAccountId,
        data.platform,
        data.accessToken, // Will be encrypted
        this.encryptionKey,
        data.tokenType,
        data.expiresAt,
        data.scopes,
      ],
    );
    return result;
  }

  async findByClientAccountId(clientAccountId: string): Promise<any | null> {
    return this.db.oneOrNone(
      `
      SELECT id, user_id, client_account_id, platform, token_type,
             expires_at, scopes, created_at, updated_at
      FROM oauth_tokens
      WHERE client_account_id = $1
        AND revoked_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [clientAccountId],
    );
  }

  async getDecryptedToken(tokenId: string): Promise<string> {
    const result = await this.db.one<{ decrypted: string }>(
      `
      SELECT pgp_sym_decrypt(access_token::bytea, $2) as decrypted
      FROM oauth_tokens
      WHERE id = $1 AND revoked_at IS NULL
      `,
      [tokenId, this.encryptionKey],
    );
    return result.decrypted;
  }

  async update(tokenId: string, data: any): Promise<any> {
    const result = await this.db.one(
      `
      UPDATE oauth_tokens
      SET access_token = pgp_sym_encrypt($2, $3),
          expires_at = $4,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, user_id, client_account_id, platform,
                token_type, expires_at, scopes, updated_at
      `,
      [tokenId, data.accessToken, this.encryptionKey, data.expiresAt],
    );
    return result;
  }

  async revokeToken(tokenId: string): Promise<void> {
    await this.db.none(
      `
      UPDATE oauth_tokens
      SET revoked_at = NOW()
      WHERE id = $1
      `,
      [tokenId],
    );
  }

  async revokeByClientAccountId(clientAccountId: string): Promise<void> {
    await this.db.none(
      `
      UPDATE oauth_tokens
      SET revoked_at = NOW()
      WHERE client_account_id = $1 AND revoked_at IS NULL
      `,
      [clientAccountId],
    );
  }
}
```

---

## Files to Create

```
/backend/src/
├── modules/
│   └── instagram/
│       ├── instagram.module.ts
│       ├── instagram.controller.ts
│       ├── instagram-oauth.service.ts
│       └── interfaces/
│           └── instagram-api.interface.ts
├── domain/
│   ├── entities/
│   │   ├── oauth-token.entity.ts
│   │   └── client-account.entity.ts
│   └── repositories/
│       ├── oauth-token.repository.interface.ts
│       └── client-account.repository.interface.ts
├── infrastructure/
│   └── database/
│       └── repositories/
│           ├── postgres-oauth-token.repository.ts
│           └── postgres-client-account.repository.ts
└── migrations/
    └── 002-create-oauth-tables.sql
```

---

## Dependencies

**Prerequisites:**
- BE-004 (Authentication Module with JWT)
- BE-006 (Session Management with Redis)
- INFRA-003 (PostgreSQL with pgcrypto extension)
- INFRA-004 (Redis for OAuth state storage)
- Meta Developer Account (Instagram App created)

**Blocks:**
- IG-002 (Instagram Account Management)
- IG-003 (Graph API Wrapper Service)
- FE-008 (Client Account Management UI)

---

## Acceptance Criteria

- [ ] User can initiate Instagram OAuth flow
- [ ] User redirected to Instagram authorization page with correct parameters
- [ ] CSRF state token generated and validated correctly
- [ ] OAuth callback handles authorization code exchange
- [ ] Short-lived token exchanged for long-lived token (60 days)
- [ ] User profile fetched from Instagram Graph API
- [ ] Client account created/updated in database
- [ ] OAuth token stored encrypted with pgcrypto
- [ ] Token expiration tracked (60 days from issuance)
- [ ] Can disconnect account and revoke token
- [ ] Token automatically refreshed when < 7 days until expiration
- [ ] Error handling for:
  - [ ] User denies permission
  - [ ] Invalid state (CSRF attack)
  - [ ] Code exchange failure
  - [ ] Network errors
- [ ] Scopes requested: `user_profile`, `user_media`, `instagram_basic`, `instagram_manage_messages`
- [ ] Redirects to frontend with success/error parameters
- [ ] All database operations use transactions
- [ ] Encryption key stored securely in environment variable

---

## Testing Procedure

```bash
# 1. Generate encryption key for OAuth tokens
openssl rand -base64 32

# Add to .env:
# OAUTH_ENCRYPTION_KEY=<generated_key>

# 2. Create Instagram App in Meta Developer Portal
# https://developers.facebook.com/apps/
# Note: App ID, App Secret, Redirect URI

# 3. Test OAuth initiation
curl -X GET http://localhost:4000/instagram/oauth/authorize \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Expected: Returns authorization URL

# 4. Open authorization URL in browser
# Expected: Redirects to Instagram login/authorization page

# 5. Authorize app
# Expected: Redirects to callback URL with code and state

# 6. Backend processes callback
# Expected: Account created, token stored, redirects to frontend

# 7. Verify account in database
psql -d social_selling -c "SELECT * FROM client_accounts WHERE platform='instagram';"

# 8. Verify encrypted token
psql -d social_selling -c "SELECT id, platform, token_type, expires_at FROM oauth_tokens;"

# 9. Test disconnect
curl -X DELETE http://localhost:4000/instagram/accounts/<ACCOUNT_ID>/disconnect \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Expected: 200 OK, token revoked

# 10. Verify token revoked
psql -d social_selling -c "SELECT revoked_at FROM oauth_tokens WHERE client_account_id='<ACCOUNT_ID>';"
```

---

## Meta Developer Portal Setup

### Required Steps:

1. **Create Instagram App**
   - Go to https://developers.facebook.com/apps/
   - Click "Create App"
   - Choose "Consumer" use case
   - Add Instagram Basic Display product

2. **Configure OAuth Settings**
   - Valid OAuth Redirect URIs: `https://app-socialselling.willianbvsanches.com/api/instagram/oauth/callback`
   - Deauthorize Callback URL: `https://app-socialselling.willianbvsanches.com/api/instagram/deauthorize`
   - Data Deletion Request URL: `https://app-socialselling.willianbvsanches.com/api/instagram/data-deletion`

3. **Add Test Users**
   - Go to Roles → Instagram Testers
   - Add your Instagram account as tester
   - Accept invitation in Instagram app

4. **Request Permissions Review** (Before Production)
   - Submit app for review
   - Provide demo video showing OAuth flow
   - Explain use case for each permission
   - Response time: 3-5 business days

---

## Security Considerations

1. **CSRF Protection:** Always validate state parameter
2. **Token Encryption:** Use pgcrypto for database encryption
3. **Token Storage:** Never log or expose decrypted tokens
4. **Secure Transmission:** Always use HTTPS
5. **Token Expiration:** Track and refresh before expiry
6. **Scope Minimization:** Only request necessary permissions
7. **Error Handling:** Don't leak sensitive info in error messages
8. **Rate Limiting:** Instagram API has rate limits (200 calls/hour)

---

## Cost Estimate

- **Instagram API:** Free
- **Meta App:** Free
- **Infrastructure:** Included in existing setup
- **Time Investment:** 6 hours
- **Total Additional Cost:** $0

---

## Related Documents

- Meta Instagram Basic Display API: https://developers.facebook.com/docs/instagram-basic-display-api
- Architecture Design: `/tasks/social-selling/architecture-design.md`
- Previous Tasks: BE-004, BE-006
- Next Tasks: IG-002, IG-003, FE-008

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer

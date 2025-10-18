# IG-002: Instagram Account Management

**Priority:** P0 (Critical Path)
**Effort:** 4 hours
**Day:** 7
**Dependencies:** IG-001 (Instagram OAuth 2.0 Flow)
**Domain:** Instagram Integration

---

## Overview

Implement comprehensive Instagram account management including listing connected accounts, fetching account metadata from Instagram Graph API, storing account information in PostgreSQL, tracking account status, and implementing account switching logic. This task provides the foundation for managing multiple Instagram accounts per user.

---

## Data Models

### ClientAccount Entity

```typescript
// File: /backend/src/domain/entities/client-account.entity.ts

export interface ClientAccount {
  id: string; // UUID
  userId: string; // User UUID (foreign key)
  platform: SocialPlatform;
  platformAccountId: string; // Instagram account ID
  username: string;
  displayName?: string;
  profilePictureUrl?: string;
  followerCount?: number;
  followingCount?: number;
  mediaCount?: number;
  biography?: string;
  website?: string;
  status: AccountStatus;
  accountType: InstagramAccountType;
  metadata: AccountMetadata;
  permissions: string[]; // Scopes granted during OAuth
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt?: Date;
  tokenExpiresAt?: Date;
}

export enum SocialPlatform {
  INSTAGRAM = 'instagram',
  WHATSAPP = 'whatsapp', // For future use
}

export enum AccountStatus {
  ACTIVE = 'active',
  TOKEN_EXPIRED = 'token_expired',
  DISCONNECTED = 'disconnected',
  RATE_LIMITED = 'rate_limited',
  ERROR = 'error',
}

export enum InstagramAccountType {
  PERSONAL = 'personal',
  BUSINESS = 'business',
  CREATOR = 'creator',
}

export interface AccountMetadata {
  igId?: string; // Instagram user ID
  igBusinessAccountId?: string; // Instagram Business Account ID
  facebookPageId?: string; // Connected Facebook Page ID (for business accounts)
  isVerified?: boolean;
  lastMetadataUpdate?: Date;
  errorDetails?: {
    code: string;
    message: string;
    timestamp: Date;
  };
}
```

### Database Schema Migration

```sql
-- File: /backend/migrations/002-create-client-accounts-table.sql

CREATE TABLE client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  platform_account_id VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  profile_picture_url TEXT,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  media_count INTEGER DEFAULT 0,
  biography TEXT,
  website VARCHAR(500),
  status VARCHAR(50) DEFAULT 'active',
  account_type VARCHAR(50) DEFAULT 'personal',
  metadata JSONB DEFAULT '{}',
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_sync_at TIMESTAMP,
  token_expires_at TIMESTAMP,

  CONSTRAINT unique_platform_account UNIQUE (platform, platform_account_id),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_client_accounts_user_id ON client_accounts(user_id);
CREATE INDEX idx_client_accounts_platform ON client_accounts(platform);
CREATE INDEX idx_client_accounts_status ON client_accounts(status);
CREATE INDEX idx_client_accounts_platform_account ON client_accounts(platform, platform_account_id);
CREATE INDEX idx_client_accounts_token_expires ON client_accounts(token_expires_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_accounts_updated_at
  BEFORE UPDATE ON client_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Implementation Approach

### Phase 1: Repository Layer (1 hour)

```typescript
// File: /backend/src/domain/repositories/client-account.repository.interface.ts

import { ClientAccount, AccountStatus } from '../entities/client-account.entity';

export interface IClientAccountRepository {
  create(account: Partial<ClientAccount>): Promise<ClientAccount>;
  findById(id: string): Promise<ClientAccount | null>;
  findByUserId(userId: string): Promise<ClientAccount[]>;
  findByPlatformAccountId(platform: string, platformAccountId: string): Promise<ClientAccount | null>;
  update(id: string, updates: Partial<ClientAccount>): Promise<ClientAccount>;
  delete(id: string): Promise<void>;
  updateStatus(id: string, status: AccountStatus): Promise<void>;
  updateMetadata(id: string, metadata: any): Promise<void>;
  findExpiringSoon(hours: number): Promise<ClientAccount[]>;
  countByUserId(userId: string): Promise<number>;
}
```

```typescript
// File: /backend/src/infrastructure/database/repositories/postgres-client-account.repository.ts

import { Injectable } from '@nestjs/common';
import { IDatabase } from 'pg-promise';
import { ClientAccount, AccountStatus } from '../../../domain/entities/client-account.entity';
import { IClientAccountRepository } from '../../../domain/repositories/client-account.repository.interface';

@Injectable()
export class PostgresClientAccountRepository implements IClientAccountRepository {
  constructor(private readonly db: IDatabase<any>) {}

  async create(accountData: Partial<ClientAccount>): Promise<ClientAccount> {
    const query = `
      INSERT INTO client_accounts (
        user_id, platform, platform_account_id, username, display_name,
        profile_picture_url, follower_count, following_count, media_count,
        biography, website, status, account_type, metadata, permissions,
        token_expires_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
      RETURNING *
    `;

    const result = await this.db.one(query, [
      accountData.userId,
      accountData.platform,
      accountData.platformAccountId,
      accountData.username,
      accountData.displayName,
      accountData.profilePictureUrl,
      accountData.followerCount || 0,
      accountData.followingCount || 0,
      accountData.mediaCount || 0,
      accountData.biography,
      accountData.website,
      accountData.status || 'active',
      accountData.accountType || 'personal',
      JSON.stringify(accountData.metadata || {}),
      JSON.stringify(accountData.permissions || []),
      accountData.tokenExpiresAt,
    ]);

    return this.mapToEntity(result);
  }

  async findById(id: string): Promise<ClientAccount | null> {
    const query = 'SELECT * FROM client_accounts WHERE id = $1';
    const result = await this.db.oneOrNone(query, [id]);
    return result ? this.mapToEntity(result) : null;
  }

  async findByUserId(userId: string): Promise<ClientAccount[]> {
    const query = `
      SELECT * FROM client_accounts
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const results = await this.db.manyOrNone(query, [userId]);
    return results.map(this.mapToEntity);
  }

  async findByPlatformAccountId(
    platform: string,
    platformAccountId: string,
  ): Promise<ClientAccount | null> {
    const query = `
      SELECT * FROM client_accounts
      WHERE platform = $1 AND platform_account_id = $2
    `;
    const result = await this.db.oneOrNone(query, [platform, platformAccountId]);
    return result ? this.mapToEntity(result) : null;
  }

  async update(id: string, updates: Partial<ClientAccount>): Promise<ClientAccount> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        const snakeKey = this.toSnakeCase(key);
        fields.push(`${snakeKey} = $${paramIndex++}`);

        if (key === 'metadata' || key === 'permissions') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    });

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE client_accounts
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.one(query, values);
    return this.mapToEntity(result);
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM client_accounts WHERE id = $1';
    await this.db.none(query, [id]);
  }

  async updateStatus(id: string, status: AccountStatus): Promise<void> {
    const query = 'UPDATE client_accounts SET status = $1 WHERE id = $2';
    await this.db.none(query, [status, id]);
  }

  async updateMetadata(id: string, metadata: any): Promise<void> {
    const query = 'UPDATE client_accounts SET metadata = $1, last_sync_at = NOW() WHERE id = $2';
    await this.db.none(query, [JSON.stringify(metadata), id]);
  }

  async findExpiringSoon(hours: number): Promise<ClientAccount[]> {
    const query = `
      SELECT * FROM client_accounts
      WHERE token_expires_at IS NOT NULL
      AND token_expires_at < NOW() + INTERVAL '${hours} hours'
      AND status = 'active'
    `;
    const results = await this.db.manyOrNone(query);
    return results.map(this.mapToEntity);
  }

  async countByUserId(userId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM client_accounts WHERE user_id = $1';
    const result = await this.db.one(query, [userId]);
    return parseInt(result.count, 10);
  }

  private mapToEntity(row: any): ClientAccount {
    return {
      id: row.id,
      userId: row.user_id,
      platform: row.platform,
      platformAccountId: row.platform_account_id,
      username: row.username,
      displayName: row.display_name,
      profilePictureUrl: row.profile_picture_url,
      followerCount: row.follower_count,
      followingCount: row.following_count,
      mediaCount: row.media_count,
      biography: row.biography,
      website: row.website,
      status: row.status,
      accountType: row.account_type,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastSyncAt: row.last_sync_at,
      tokenExpiresAt: row.token_expires_at,
    };
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
```

### Phase 2: Service Layer (1.5 hours)

```typescript
// File: /backend/src/modules/instagram/services/instagram-account.service.ts

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IClientAccountRepository } from '../../../domain/repositories/client-account.repository.interface';
import { ClientAccount, AccountStatus } from '../../../domain/entities/client-account.entity';
import { InstagramApiService } from './instagram-api.service';
import { CreateAccountDto, UpdateAccountDto } from '../dto/account.dto';

@Injectable()
export class InstagramAccountService {
  constructor(
    private readonly accountRepository: IClientAccountRepository,
    private readonly instagramApi: InstagramApiService,
  ) {}

  /**
   * Create new Instagram account after OAuth
   */
  async createAccount(userId: string, accountData: CreateAccountDto): Promise<ClientAccount> {
    // Check if account already exists
    const existing = await this.accountRepository.findByPlatformAccountId(
      'instagram',
      accountData.platformAccountId,
    );

    if (existing) {
      // Update existing account instead of creating duplicate
      return this.updateAccount(existing.id, userId, {
        username: accountData.username,
        displayName: accountData.displayName,
        profilePictureUrl: accountData.profilePictureUrl,
        status: AccountStatus.ACTIVE,
      });
    }

    // Create new account
    const account = await this.accountRepository.create({
      userId,
      platform: 'instagram',
      platformAccountId: accountData.platformAccountId,
      username: accountData.username,
      displayName: accountData.displayName,
      profilePictureUrl: accountData.profilePictureUrl,
      accountType: accountData.accountType || 'personal',
      permissions: accountData.permissions || [],
      status: AccountStatus.ACTIVE,
      tokenExpiresAt: accountData.tokenExpiresAt,
      metadata: {},
    });

    // Fetch and store account metadata in background
    this.syncAccountMetadata(account.id).catch((error) => {
      console.error(`Failed to sync metadata for account ${account.id}:`, error);
    });

    return account;
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
  async getAccountById(accountId: string, userId: string): Promise<ClientAccount> {
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
    return this.accountRepository.update(accountId, updates);
  }

  /**
   * Delete/disconnect account
   */
  async deleteAccount(accountId: string, userId: string): Promise<void> {
    const account = await this.getAccountById(accountId, userId);

    // Revoke Instagram access token
    try {
      await this.instagramApi.revokeToken(accountId);
    } catch (error) {
      console.error(`Failed to revoke token for account ${accountId}:`, error);
    }

    await this.accountRepository.delete(accountId);
  }

  /**
   * Sync account metadata from Instagram API
   */
  async syncAccountMetadata(accountId: string): Promise<ClientAccount> {
    const account = await this.accountRepository.findById(accountId);

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    try {
      // Fetch profile data from Instagram Graph API
      const profile = await this.instagramApi.getUserProfile(accountId);

      // Update account with fresh metadata
      const updates: Partial<ClientAccount> = {
        username: profile.username,
        displayName: profile.name,
        profilePictureUrl: profile.profile_picture_url,
        followerCount: profile.followers_count,
        followingCount: profile.follows_count,
        mediaCount: profile.media_count,
        biography: profile.biography,
        website: profile.website,
        metadata: {
          ...account.metadata,
          igId: profile.id,
          igBusinessAccountId: profile.ig_id,
          isVerified: profile.is_verified,
          lastMetadataUpdate: new Date(),
        },
        lastSyncAt: new Date(),
        status: AccountStatus.ACTIVE,
      };

      return this.accountRepository.update(accountId, updates);
    } catch (error) {
      console.error(`Failed to sync metadata for account ${accountId}:`, error);

      // Update account status to error
      await this.accountRepository.update(accountId, {
        status: AccountStatus.ERROR,
        metadata: {
          ...account.metadata,
          errorDetails: {
            code: error.code || 'SYNC_ERROR',
            message: error.message,
            timestamp: new Date(),
          },
        },
      });

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
    if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) < new Date()) {
      await this.accountRepository.updateStatus(accountId, AccountStatus.TOKEN_EXPIRED);
      return AccountStatus.TOKEN_EXPIRED;
    }

    // Test API connection
    try {
      await this.instagramApi.getUserProfile(accountId);
      await this.accountRepository.updateStatus(accountId, AccountStatus.ACTIVE);
      return AccountStatus.ACTIVE;
    } catch (error) {
      if (error.code === 'OAuthException') {
        await this.accountRepository.updateStatus(accountId, AccountStatus.TOKEN_EXPIRED);
        return AccountStatus.TOKEN_EXPIRED;
      }

      await this.accountRepository.updateStatus(accountId, AccountStatus.ERROR);
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
```

### Phase 3: DTOs and Validation (30 minutes)

```typescript
// File: /backend/src/modules/instagram/dto/account.dto.ts

import { IsString, IsOptional, IsEnum, IsArray, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus, InstagramAccountType } from '../../../domain/entities/client-account.entity';

export class CreateAccountDto {
  @ApiProperty()
  @IsString()
  platformAccountId: string;

  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  profilePictureUrl?: string;

  @ApiProperty({ enum: InstagramAccountType, required: false })
  @IsEnum(InstagramAccountType)
  @IsOptional()
  accountType?: InstagramAccountType;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  permissions?: string[];

  @ApiProperty({ required: false })
  @IsDate()
  @IsOptional()
  tokenExpiresAt?: Date;
}

export class UpdateAccountDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  profilePictureUrl?: string;

  @ApiProperty({ enum: AccountStatus, required: false })
  @IsEnum(AccountStatus)
  @IsOptional()
  status?: AccountStatus;
}

export class AccountResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  platform: string;

  @ApiProperty()
  username: string;

  @ApiProperty({ required: false })
  displayName?: string;

  @ApiProperty({ required: false })
  profilePictureUrl?: string;

  @ApiProperty({ required: false })
  followerCount?: number;

  @ApiProperty({ required: false })
  followingCount?: number;

  @ApiProperty({ required: false })
  mediaCount?: number;

  @ApiProperty()
  status: AccountStatus;

  @ApiProperty()
  accountType: InstagramAccountType;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  lastSyncAt?: Date;

  @ApiProperty({ required: false })
  tokenExpiresAt?: Date;
}
```

### Phase 4: Controller with API Endpoints (1 hour)

```typescript
// File: /backend/src/modules/instagram/controllers/instagram-account.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { InstagramAccountService } from '../services/instagram-account.service';
import { SessionGuard } from '../../../common/guards/session.guard';
import { GetUserId } from '../../../common/decorators/session.decorator';
import { UpdateAccountDto, AccountResponseDto } from '../dto/account.dto';

@ApiTags('Instagram Accounts')
@Controller('instagram/accounts')
@UseGuards(SessionGuard)
@ApiBearerAuth()
export class InstagramAccountController {
  constructor(private readonly accountService: InstagramAccountService) {}

  @Get()
  @ApiOperation({ summary: 'List all connected Instagram accounts' })
  @ApiResponse({ status: 200, description: 'Returns list of accounts', type: [AccountResponseDto] })
  async listAccounts(@GetUserId() userId: string) {
    const accounts = await this.accountService.getUserAccounts(userId);

    return {
      accounts: accounts.map(this.mapToResponse),
      total: accounts.length,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single account by ID' })
  @ApiResponse({ status: 200, description: 'Returns account details', type: AccountResponseDto })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async getAccount(
    @Param('id') accountId: string,
    @GetUserId() userId: string,
  ) {
    const account = await this.accountService.getAccountById(accountId, userId);
    return this.mapToResponse(account);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update account information' })
  @ApiResponse({ status: 200, description: 'Account updated successfully', type: AccountResponseDto })
  async updateAccount(
    @Param('id') accountId: string,
    @Body() updateDto: UpdateAccountDto,
    @GetUserId() userId: string,
  ) {
    const account = await this.accountService.updateAccount(accountId, userId, updateDto);
    return this.mapToResponse(account);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect Instagram account' })
  @ApiResponse({ status: 204, description: 'Account disconnected successfully' })
  async deleteAccount(
    @Param('id') accountId: string,
    @GetUserId() userId: string,
  ) {
    await this.accountService.deleteAccount(accountId, userId);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Sync account metadata from Instagram' })
  @ApiResponse({ status: 200, description: 'Account synced successfully', type: AccountResponseDto })
  async syncAccount(
    @Param('id') accountId: string,
    @GetUserId() userId: string,
  ) {
    // Verify ownership
    await this.accountService.getAccountById(accountId, userId);

    const account = await this.accountService.syncAccountMetadata(accountId);
    return this.mapToResponse(account);
  }

  @Post(':id/refresh-status')
  @ApiOperation({ summary: 'Refresh account status (check token validity)' })
  @ApiResponse({ status: 200, description: 'Status refreshed' })
  async refreshStatus(
    @Param('id') accountId: string,
    @GetUserId() userId: string,
  ) {
    // Verify ownership
    await this.accountService.getAccountById(accountId, userId);

    const status = await this.accountService.refreshAccountStatus(accountId);
    return { status };
  }

  private mapToResponse(account: any): AccountResponseDto {
    return {
      id: account.id,
      platform: account.platform,
      username: account.username,
      displayName: account.displayName,
      profilePictureUrl: account.profilePictureUrl,
      followerCount: account.followerCount,
      followingCount: account.followingCount,
      mediaCount: account.mediaCount,
      status: account.status,
      accountType: account.accountType,
      createdAt: account.createdAt,
      lastSyncAt: account.lastSyncAt,
      tokenExpiresAt: account.tokenExpiresAt,
    };
  }
}
```

---

## API Endpoints

### 1. List Connected Accounts

```bash
curl -X GET http://localhost:4000/instagram/accounts \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Cookie: ssell_session=<SESSION_ID>"
```

**Response:**
```json
{
  "accounts": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "platform": "instagram",
      "username": "johndoe",
      "displayName": "John Doe",
      "profilePictureUrl": "https://instagram.com/profile.jpg",
      "followerCount": 1250,
      "followingCount": 430,
      "mediaCount": 87,
      "status": "active",
      "accountType": "business",
      "createdAt": "2025-10-15T10:00:00Z",
      "lastSyncAt": "2025-10-18T08:30:00Z",
      "tokenExpiresAt": "2025-11-18T10:00:00Z"
    }
  ],
  "total": 1
}
```

### 2. Get Single Account

```bash
curl -X GET http://localhost:4000/instagram/accounts/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### 3. Update Account

```bash
curl -X PATCH http://localhost:4000/instagram/accounts/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "John Doe - Business"
  }'
```

### 4. Disconnect Account

```bash
curl -X DELETE http://localhost:4000/instagram/accounts/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### 5. Sync Account Metadata

```bash
curl -X POST http://localhost:4000/instagram/accounts/123e4567-e89b-12d3-a456-426614174000/sync \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### 6. Refresh Account Status

```bash
curl -X POST http://localhost:4000/instagram/accounts/123e4567-e89b-12d3-a456-426614174000/refresh-status \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

---

## Files to Create/Update

```
/backend/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   └── client-account.entity.ts (NEW)
│   │   └── repositories/
│   │       └── client-account.repository.interface.ts (NEW)
│   ├── infrastructure/
│   │   └── database/
│   │       └── repositories/
│   │           └── postgres-client-account.repository.ts (NEW)
│   ├── modules/
│   │   └── instagram/
│   │       ├── services/
│   │       │   └── instagram-account.service.ts (NEW)
│   │       ├── controllers/
│   │       │   └── instagram-account.controller.ts (NEW)
│   │       ├── dto/
│   │       │   └── account.dto.ts (NEW)
│   │       └── instagram.module.ts (UPDATE)
│   └── migrations/
│       └── 002-create-client-accounts-table.sql (NEW)
```

---

## Acceptance Criteria

- [ ] Can list all connected Instagram accounts for user
- [ ] Account metadata fetched from Instagram Graph API on connection
- [ ] Account metadata stored in PostgreSQL database
- [ ] Account status tracked correctly (active, token_expired, disconnected, error)
- [ ] Can fetch single account by ID with authorization check
- [ ] Can update account metadata (manual sync)
- [ ] Can disconnect/delete account
- [ ] Token revocation attempted when disconnecting account
- [ ] Authorization check prevents accessing other users' accounts
- [ ] Pagination support for large account lists (future enhancement)
- [ ] Account sync updates follower count, media count, profile picture
- [ ] Account status refresh checks token validity via API call
- [ ] Duplicate account prevention (same platformAccountId)
- [ ] Database indexes created for performance
- [ ] Updated_at timestamp automatically updated on changes
- [ ] Unique constraint on (platform, platform_account_id)
- [ ] Foreign key cascade delete when user deleted
- [ ] Error details stored in metadata when sync fails
- [ ] Can query accounts expiring soon for proactive refresh
- [ ] Background metadata sync doesn't block account creation
- [ ] All API endpoints documented with Swagger
- [ ] Unit tests written for InstagramAccountService
- [ ] Integration tests written for API endpoints
- [ ] Error handling comprehensive (404, 403, 500)

---

## Testing Procedure

```bash
# 1. Create account via OAuth (done in IG-001)
# Account automatically created after OAuth callback

# 2. List all accounts for user
curl -X GET http://localhost:4000/instagram/accounts \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -c cookies.txt

# Expected: 200 OK with array of accounts

# 3. Get single account
curl -X GET http://localhost:4000/instagram/accounts/<ACCOUNT_ID> \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Expected: 200 OK with account details

# 4. Try to access another user's account
curl -X GET http://localhost:4000/instagram/accounts/<OTHER_USER_ACCOUNT_ID> \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Expected: 403 Forbidden

# 5. Sync account metadata
curl -X POST http://localhost:4000/instagram/accounts/<ACCOUNT_ID>/sync \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Expected: 200 OK with updated account data

# 6. Refresh account status
curl -X POST http://localhost:4000/instagram/accounts/<ACCOUNT_ID>/refresh-status \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Expected: 200 OK with status: "active" or "token_expired"

# 7. Update account
curl -X PATCH http://localhost:4000/instagram/accounts/<ACCOUNT_ID> \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"displayName": "Updated Name"}'

# Expected: 200 OK with updated account

# 8. Disconnect account
curl -X DELETE http://localhost:4000/instagram/accounts/<ACCOUNT_ID> \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Expected: 204 No Content

# 9. Verify account deleted
curl -X GET http://localhost:4000/instagram/accounts/<ACCOUNT_ID> \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Expected: 404 Not Found

# 10. Check database directly
psql -U postgres -d social_selling
SELECT * FROM client_accounts;

# 11. Test database constraints
# Try to create duplicate account (should fail with unique constraint)

# 12. Test cascade delete
# Delete user, verify accounts deleted
```

---

## Environment Variables

```bash
# .env
INSTAGRAM_GRAPH_API_URL=https://graph.instagram.com/v18.0
DATABASE_URL=postgresql://postgres:password@localhost:5432/social_selling
```

---

## Dependencies

**Prerequisites:**
- IG-001 (Instagram OAuth 2.0 Flow - creates accounts)
- BE-002 (Repository pattern implemented)
- BE-003 (Database migrations system)
- INFRA-003 (PostgreSQL operational)

**Blocks:**
- IG-004 (Instagram Direct Messages - needs account selection)
- IG-006 (Post Scheduling - needs account selection)
- IG-007 (Analytics - needs account selection)
- FE-004 (Instagram Accounts Page - displays accounts)

---

## Security Considerations

1. **Authorization:** Users can only access their own accounts
2. **Token Storage:** Access tokens stored encrypted (handled in IG-001)
3. **Cascade Delete:** Accounts deleted when user deleted
4. **Input Validation:** All DTOs validated with class-validator
5. **SQL Injection:** Parameterized queries prevent SQL injection
6. **Rate Limiting:** API endpoints rate-limited at Nginx level
7. **Token Revocation:** Attempt to revoke token when disconnecting
8. **Error Messages:** Don't expose sensitive info in error messages

---

## Performance Considerations

1. **Database Indexes:** Indexes on user_id, platform, status for fast queries
2. **Async Metadata Sync:** Background sync doesn't block account creation
3. **Caching:** Consider Redis caching for frequently accessed accounts (future)
4. **Pagination:** Implement pagination for users with many accounts (future)
5. **Batch Operations:** Batch metadata sync for multiple accounts (future)

---

## Cost Estimate

- **Infrastructure:** Included in existing PostgreSQL setup
- **Instagram API Calls:** ~10 calls per account connection (metadata fetch)
- **Time Investment:** 4 hours
- **Total Additional Cost:** $0

---

## Related Documents

- Architecture Design: `/tasks/social-selling/architecture-design.md`
- Implementation Plan: `/tasks/social-selling/implementation-plan.md`
- Previous Task: IG-001 (Instagram OAuth)
- Next Tasks: IG-003 (Instagram Graph API Wrapper), IG-004 (Direct Messages)

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer

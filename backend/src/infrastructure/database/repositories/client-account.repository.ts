import { Injectable } from '@nestjs/common';
import { IClientAccountRepository } from '../../../domain/repositories/client-account.repository.interface';
import {
  ClientAccount,
  Platform,
  AccountStatus,
  InstagramAccountType,
} from '../../../domain/entities/client-account.entity';
import { Database } from '../database';
import { BaseRepository } from './base.repository';

@Injectable()
export class ClientAccountRepository extends BaseRepository implements IClientAccountRepository {
  constructor(database: Database) {
    super(database.getDb(), ClientAccountRepository.name);
  }

  async findById(id: string): Promise<ClientAccount | null> {
    const query = `
      SELECT
        id,
        user_id,
        platform,
        platform_account_id,
        username,
        display_name,
        profile_picture_url,
        follower_count,
        following_count,
        media_count,
        biography,
        website,
        status,
        account_type,
        metadata,
        permissions,
        last_sync_at,
        token_expires_at,
        created_at,
        updated_at
      FROM client_accounts
      WHERE id = $1
        AND deleted_at IS NULL
    `;

    const row = await this.db.oneOrNone(query, [id]);
    if (!row) return null;
    return this.mapToEntity(row);
  }

  async findByUserId(userId: string): Promise<ClientAccount[]> {
    const query = `
      SELECT
        id,
        user_id,
        platform,
        platform_account_id,
        username,
        display_name,
        profile_picture_url,
        follower_count,
        following_count,
        media_count,
        biography,
        website,
        status,
        account_type,
        metadata,
        permissions,
        last_sync_at,
        token_expires_at,
        created_at,
        updated_at
      FROM client_accounts
      WHERE user_id = $1
        AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;

    const rows = await this.db.manyOrNone(query, [userId]);
    return rows ? rows.map((row) => this.mapToEntity(row)) : [];
  }

  async findByPlatformAccountId(platform: Platform, platformAccountId: string): Promise<ClientAccount | null> {
    const query = `
      SELECT
        id,
        user_id,
        platform,
        platform_account_id,
        username,
        display_name,
        profile_picture_url,
        follower_count,
        following_count,
        media_count,
        biography,
        website,
        status,
        account_type,
        metadata,
        permissions,
        last_sync_at,
        token_expires_at,
        created_at,
        updated_at
      FROM client_accounts
      WHERE platform = $1
        AND platform_account_id = $2
        AND deleted_at IS NULL
      LIMIT 1
    `;

    const row = await this.db.oneOrNone(query, [platform, platformAccountId]);
    if (!row) return null;
    return this.mapToEntity(row);
  }

  async findExpiringSoon(hours: number): Promise<ClientAccount[]> {
    const query = `
      SELECT
        id,
        user_id,
        platform,
        platform_account_id,
        username,
        display_name,
        profile_picture_url,
        follower_count,
        following_count,
        media_count,
        biography,
        website,
        status,
        account_type,
        metadata,
        permissions,
        last_sync_at,
        token_expires_at,
        created_at,
        updated_at
      FROM client_accounts
      WHERE token_expires_at IS NOT NULL
        AND token_expires_at < NOW() + INTERVAL '${hours} hours'
        AND status = 'active'
        AND deleted_at IS NULL
      ORDER BY token_expires_at ASC
    `;

    const rows = await this.db.manyOrNone(query);
    return rows ? rows.map((row) => this.mapToEntity(row)) : [];
  }

  async countByUserId(userId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM client_accounts
      WHERE user_id = $1
        AND deleted_at IS NULL
    `;

    const result = await this.db.one(query, [userId]);
    return parseInt(result.count, 10);
  }

  async create(clientAccount: ClientAccount): Promise<ClientAccount> {
    const json = clientAccount.toJSON();

    const query = `
      INSERT INTO client_accounts (
        id,
        user_id,
        platform,
        platform_account_id,
        username,
        display_name,
        profile_picture_url,
        follower_count,
        following_count,
        media_count,
        biography,
        website,
        status,
        account_type,
        metadata,
        permissions,
        last_sync_at,
        token_expires_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;

    const values = [
      json.id,
      json.userId,
      json.platform,
      json.platformAccountId,
      json.username,
      json.displayName || null,
      json.profilePictureUrl || null,
      json.followerCount || 0,
      json.followingCount || 0,
      json.mediaCount || 0,
      json.biography || null,
      json.website || null,
      json.status,
      json.accountType,
      JSON.stringify(json.metadata),
      JSON.stringify(json.permissions),
      json.lastSyncAt || null,
      json.tokenExpiresAt || null,
      json.createdAt,
      json.updatedAt,
    ];

    const row = await this.db.one(query, values);
    return this.mapToEntity(row);
  }

  async update(clientAccount: ClientAccount): Promise<ClientAccount> {
    const json = clientAccount.toJSON();

    const query = `
      UPDATE client_accounts
      SET
        username = $2,
        display_name = $3,
        profile_picture_url = $4,
        follower_count = $5,
        following_count = $6,
        media_count = $7,
        biography = $8,
        website = $9,
        status = $10,
        account_type = $11,
        metadata = $12,
        permissions = $13,
        last_sync_at = $14,
        token_expires_at = $15,
        updated_at = $16
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING *
    `;

    const values = [
      json.id,
      json.username,
      json.displayName || null,
      json.profilePictureUrl || null,
      json.followerCount || 0,
      json.followingCount || 0,
      json.mediaCount || 0,
      json.biography || null,
      json.website || null,
      json.status,
      json.accountType,
      JSON.stringify(json.metadata),
      JSON.stringify(json.permissions),
      json.lastSyncAt || null,
      json.tokenExpiresAt || null,
      new Date(),
    ];

    const row = await this.db.one(query, values);
    return this.mapToEntity(row);
  }

  async updateStatus(id: string, status: AccountStatus): Promise<void> {
    const query = `
      UPDATE client_accounts
      SET status = $2, updated_at = NOW()
      WHERE id = $1
        AND deleted_at IS NULL
    `;
    await this.db.none(query, [id, status]);
  }

  async delete(id: string): Promise<void> {
    const query = `
      UPDATE client_accounts
      SET deleted_at = NOW()
      WHERE id = $1
    `;
    await this.db.none(query, [id]);
  }

  private mapToEntity(row: any): ClientAccount {
    const mapped = this.mapToCamelCase<any>(row);

    return ClientAccount.reconstitute({
      id: mapped.id,
      userId: mapped.userId,
      platform: mapped.platform as Platform,
      platformAccountId: mapped.platformAccountId,
      username: mapped.username,
      displayName: mapped.displayName,
      profilePictureUrl: mapped.profilePictureUrl,
      followerCount: mapped.followerCount,
      followingCount: mapped.followingCount,
      mediaCount: mapped.mediaCount,
      biography: mapped.biography,
      website: mapped.website,
      status: mapped.status as AccountStatus,
      accountType: (mapped.accountType as InstagramAccountType) || InstagramAccountType.PERSONAL,
      metadata: mapped.metadata || {},
      permissions: mapped.permissions || [],
      lastSyncAt: mapped.lastSyncAt ? new Date(mapped.lastSyncAt) : undefined,
      tokenExpiresAt: mapped.tokenExpiresAt ? new Date(mapped.tokenExpiresAt) : undefined,
      createdAt: new Date(mapped.createdAt),
      updatedAt: new Date(mapped.updatedAt),
    });
  }
}

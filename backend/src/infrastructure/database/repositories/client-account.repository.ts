import { Injectable } from '@nestjs/common';
import { IClientAccountRepository } from '../../../domain/repositories/client-account.repository.interface';
import { ClientAccount, Platform } from '../../../domain/entities/client-account.entity';
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
        profile_picture_url,
        follower_count,
        status,
        metadata,
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
        profile_picture_url,
        follower_count,
        status,
        metadata,
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
        profile_picture_url,
        follower_count,
        status,
        metadata,
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

  async create(clientAccount: ClientAccount): Promise<ClientAccount> {
    const json = clientAccount.toJSON();

    const query = `
      INSERT INTO client_accounts (
        id,
        user_id,
        platform,
        platform_account_id,
        username,
        profile_picture_url,
        follower_count,
        status,
        metadata,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      json.id,
      json.userId,
      json.platform,
      json.platformAccountId,
      json.username,
      json.profilePictureUrl || null,
      json.followerCount || 0,
      json.status,
      JSON.stringify(json.metadata),
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
        profile_picture_url = $3,
        follower_count = $4,
        status = $5,
        metadata = $6,
        updated_at = $7
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING *
    `;

    const values = [
      json.id,
      json.username,
      json.profilePictureUrl || null,
      json.followerCount || 0,
      json.status,
      JSON.stringify(json.metadata),
      new Date(),
    ];

    const row = await this.db.one(query, values);
    return this.mapToEntity(row);
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
      profilePictureUrl: mapped.profilePictureUrl,
      followerCount: mapped.followerCount,
      status: mapped.status,
      metadata: mapped.metadata || {},
      createdAt: new Date(mapped.createdAt),
      updatedAt: new Date(mapped.updatedAt),
    });
  }
}

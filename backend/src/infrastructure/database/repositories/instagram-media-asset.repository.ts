import { Injectable } from '@nestjs/common';
import { IInstagramMediaAssetRepository } from '../../../domain/repositories/instagram-media-asset.repository.interface';
import {
  InstagramMediaAsset,
  MediaAssetType,
} from '../../../domain/entities/instagram-media-asset.entity';
import { Database } from '../database';
import { BaseRepository } from './base.repository';

/**
 * Instagram Media Asset Repository
 * Concrete implementation using raw SQL
 */
@Injectable()
export class InstagramMediaAssetRepository
  extends BaseRepository
  implements IInstagramMediaAssetRepository
{
  constructor(database: Database) {
    super(database.getDb(), InstagramMediaAssetRepository.name);
  }

  async create(asset: InstagramMediaAsset): Promise<InstagramMediaAsset> {
    const assetData = asset.toJSON();

    const query = `
      INSERT INTO instagram_media_assets (
        id, user_id, client_account_id, filename, original_filename,
        mime_type, file_size, media_type, s3_bucket, s3_key, s3_url,
        width, height, duration, thumbnail_url, used_in_posts,
        last_used_at, tags, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
    `;

    await this.db.query(query, [
      assetData.id,
      assetData.userId,
      assetData.clientAccountId || null,
      assetData.filename,
      assetData.originalFilename,
      assetData.mimeType,
      assetData.fileSize,
      assetData.mediaType,
      assetData.s3Bucket,
      assetData.s3Key,
      assetData.s3Url,
      assetData.width || null,
      assetData.height || null,
      assetData.duration || null,
      assetData.thumbnailUrl || null,
      assetData.usedInPosts,
      assetData.lastUsedAt || null,
      JSON.stringify(assetData.tags),
      assetData.createdAt,
    ]);

    return asset;
  }

  async findById(id: string): Promise<InstagramMediaAsset | null> {
    const query = `
      SELECT * FROM instagram_media_assets WHERE id = $1
    `;

    const row = await this.db.oneOrNone(query, [id]);

    if (!row) {
      return null;
    }

    return this.mapRowToEntity(row);
  }

  async findByUser(userId: string): Promise<InstagramMediaAsset[]> {
    const query = `
      SELECT * FROM instagram_media_assets
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const rows = await this.db.manyOrNone(query, [userId]);

    return rows.map((row) => this.mapRowToEntity(row));
  }

  async findByClientAccount(
    clientAccountId: string,
  ): Promise<InstagramMediaAsset[]> {
    const query = `
      SELECT * FROM instagram_media_assets
      WHERE client_account_id = $1
      ORDER BY created_at DESC
    `;

    const rows = await this.db.manyOrNone(query, [clientAccountId]);

    return rows.map((row) => this.mapRowToEntity(row));
  }

  async findByS3Key(s3Key: string): Promise<InstagramMediaAsset | null> {
    const query = `
      SELECT * FROM instagram_media_assets WHERE s3_key = $1
    `;

    const row = await this.db.oneOrNone(query, [s3Key]);

    if (!row) {
      return null;
    }

    return this.mapRowToEntity(row);
  }

  async update(asset: InstagramMediaAsset): Promise<InstagramMediaAsset> {
    const assetData = asset.toJSON();

    const query = `
      UPDATE instagram_media_assets SET
        width = $2,
        height = $3,
        duration = $4,
        thumbnail_url = $5,
        used_in_posts = $6,
        last_used_at = $7,
        tags = $8
      WHERE id = $1
    `;

    await this.db.query(query, [
      assetData.id,
      assetData.width || null,
      assetData.height || null,
      assetData.duration || null,
      assetData.thumbnailUrl || null,
      assetData.usedInPosts,
      assetData.lastUsedAt || null,
      JSON.stringify(assetData.tags),
    ]);

    return asset;
  }

  async delete(id: string): Promise<void> {
    const query = `DELETE FROM instagram_media_assets WHERE id = $1`;
    await this.db.query(query, [id]);
  }

  private mapRowToEntity(row: any): InstagramMediaAsset {
    const camelRow = this.mapToCamelCase<any>(row);

    return InstagramMediaAsset.reconstitute({
      id: camelRow.id,
      userId: camelRow.userId,
      clientAccountId: camelRow.clientAccountId,
      filename: camelRow.filename,
      originalFilename: camelRow.originalFilename,
      mimeType: camelRow.mimeType,
      fileSize: camelRow.fileSize,
      mediaType: camelRow.mediaType as MediaAssetType,
      s3Bucket: camelRow.s3Bucket,
      s3Key: camelRow.s3Key,
      s3Url: camelRow.s3Url,
      width: camelRow.width,
      height: camelRow.height,
      duration: camelRow.duration,
      thumbnailUrl: camelRow.thumbnailUrl,
      usedInPosts: camelRow.usedInPosts,
      lastUsedAt: camelRow.lastUsedAt,
      tags: JSON.parse(camelRow.tags),
      createdAt: camelRow.createdAt,
    });
  }
}

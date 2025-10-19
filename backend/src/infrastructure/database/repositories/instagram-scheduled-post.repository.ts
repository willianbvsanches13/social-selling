import { Injectable } from '@nestjs/common';
import { IInstagramScheduledPostRepository } from '../../../domain/repositories/instagram-scheduled-post.repository.interface';
import {
  InstagramScheduledPost,
  PostStatus,
  PostMediaType,
} from '../../../domain/entities/instagram-scheduled-post.entity';
import { Database } from '../database';
import { BaseRepository } from './base.repository';

/**
 * Instagram Scheduled Post Repository
 * Concrete implementation using raw SQL
 */
@Injectable()
export class InstagramScheduledPostRepository
  extends BaseRepository
  implements IInstagramScheduledPostRepository
{
  constructor(database: Database) {
    super(database.getDb(), InstagramScheduledPostRepository.name);
  }

  async create(post: InstagramScheduledPost): Promise<InstagramScheduledPost> {
    const postData = post.toJSON();

    const query = `
      INSERT INTO instagram_scheduled_posts (
        id, client_account_id, user_id, scheduled_for, published_at,
        caption, media_urls, media_type, product_tags, location_id,
        template_id, template_variables, status, publish_attempts,
        last_publish_error, instagram_media_id, instagram_media_url,
        permalink, initial_likes, initial_comments, initial_reach,
        metadata, created_at, updated_at, cancelled_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25
      )
    `;

    await this.db.query(query, [
      postData.id,
      postData.clientAccountId,
      postData.userId,
      postData.scheduledFor,
      postData.publishedAt || null,
      postData.caption,
      JSON.stringify(postData.mediaUrls),
      postData.mediaType,
      postData.productTags ? JSON.stringify(postData.productTags) : null,
      postData.locationId || null,
      postData.templateId || null,
      postData.templateVariables
        ? JSON.stringify(postData.templateVariables)
        : null,
      postData.status,
      postData.publishAttempts,
      postData.lastPublishError || null,
      postData.instagramMediaId || null,
      postData.instagramMediaUrl || null,
      postData.permalink || null,
      postData.initialLikes || null,
      postData.initialComments || null,
      postData.initialReach || null,
      postData.metadata ? JSON.stringify(postData.metadata) : null,
      postData.createdAt,
      postData.updatedAt,
      postData.cancelledAt || null,
    ]);

    return post;
  }

  async findById(id: string): Promise<InstagramScheduledPost | null> {
    const query = `
      SELECT * FROM instagram_scheduled_posts WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToEntity(result.rows[0]);
  }

  async findByClientAccount(
    clientAccountId: string,
  ): Promise<InstagramScheduledPost[]> {
    const query = `
      SELECT * FROM instagram_scheduled_posts
      WHERE client_account_id = $1
      ORDER BY scheduled_for ASC
    `;

    const result = await this.db.query(query, [clientAccountId]);
    return result.rows.map((row: any) => this.mapToEntity(row));
  }

  async update(post: InstagramScheduledPost): Promise<InstagramScheduledPost> {
    const postData = post.toJSON();

    const query = `
      UPDATE instagram_scheduled_posts SET
        scheduled_for = $1,
        published_at = $2,
        caption = $3,
        media_urls = $4,
        media_type = $5,
        product_tags = $6,
        location_id = $7,
        template_id = $8,
        template_variables = $9,
        status = $10,
        publish_attempts = $11,
        last_publish_error = $12,
        instagram_media_id = $13,
        instagram_media_url = $14,
        permalink = $15,
        initial_likes = $16,
        initial_comments = $17,
        initial_reach = $18,
        metadata = $19,
        updated_at = $20,
        cancelled_at = $21
      WHERE id = $22
    `;

    await this.db.query(query, [
      postData.scheduledFor,
      postData.publishedAt || null,
      postData.caption,
      JSON.stringify(postData.mediaUrls),
      postData.mediaType,
      postData.productTags ? JSON.stringify(postData.productTags) : null,
      postData.locationId || null,
      postData.templateId || null,
      postData.templateVariables
        ? JSON.stringify(postData.templateVariables)
        : null,
      postData.status,
      postData.publishAttempts,
      postData.lastPublishError || null,
      postData.instagramMediaId || null,
      postData.instagramMediaUrl || null,
      postData.permalink || null,
      postData.initialLikes || null,
      postData.initialComments || null,
      postData.initialReach || null,
      postData.metadata ? JSON.stringify(postData.metadata) : null,
      postData.updatedAt,
      postData.cancelledAt || null,
      postData.id,
    ]);

    return post;
  }

  async delete(id: string): Promise<void> {
    const query = `
      DELETE FROM instagram_scheduled_posts WHERE id = $1
    `;

    await this.db.query(query, [id]);
  }

  async findScheduledForPublishing(
    now: Date,
  ): Promise<InstagramScheduledPost[]> {
    const query = `
      SELECT * FROM instagram_scheduled_posts
      WHERE status = $1 AND scheduled_for <= $2
      ORDER BY scheduled_for ASC
    `;

    const result = await this.db.query(query, [PostStatus.SCHEDULED, now]);
    return result.rows.map((row: any) => this.mapToEntity(row));
  }

  async list(
    clientAccountId: string,
    filters?: {
      status?: string;
      scheduledAfter?: Date;
      scheduledBefore?: Date;
      skip?: number;
      take?: number;
    },
  ): Promise<{ items: InstagramScheduledPost[]; total: number }> {
    const params: any[] = [clientAccountId];
    let paramIndex = 2;

    let whereClause = 'WHERE client_account_id = $1';

    if (filters?.status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.scheduledAfter) {
      whereClause += ` AND scheduled_for >= $${paramIndex}`;
      params.push(filters.scheduledAfter);
      paramIndex++;
    }

    if (filters?.scheduledBefore) {
      whereClause += ` AND scheduled_for <= $${paramIndex}`;
      params.push(filters.scheduledBefore);
      paramIndex++;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM instagram_scheduled_posts
      ${whereClause}
    `;

    const countResult = await this.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get items with pagination
    let dataQuery = `
      SELECT * FROM instagram_scheduled_posts
      ${whereClause}
      ORDER BY scheduled_for DESC
    `;

    if (filters?.take) {
      dataQuery += ` LIMIT $${paramIndex}`;
      params.push(filters.take);
      paramIndex++;
    }

    if (filters?.skip) {
      dataQuery += ` OFFSET $${paramIndex}`;
      params.push(filters.skip);
    }

    const result = await this.db.query(dataQuery, params);
    const items = result.rows.map((row: any) => this.mapToEntity(row));

    return { items, total };
  }

  /**
   * Map database row to domain entity
   */
  private mapToEntity(row: any): InstagramScheduledPost {
    return InstagramScheduledPost.reconstitute({
      id: row.id,
      clientAccountId: row.client_account_id,
      userId: row.user_id,
      scheduledFor: row.scheduled_for,
      publishedAt: row.published_at || undefined,
      caption: row.caption,
      mediaUrls: JSON.parse(row.media_urls),
      mediaType: row.media_type as PostMediaType,
      productTags: row.product_tags ? JSON.parse(row.product_tags) : undefined,
      locationId: row.location_id || undefined,
      templateId: row.template_id || undefined,
      templateVariables: row.template_variables
        ? JSON.parse(row.template_variables)
        : undefined,
      status: row.status as PostStatus,
      publishAttempts: row.publish_attempts,
      lastPublishError: row.last_publish_error || undefined,
      instagramMediaId: row.instagram_media_id || undefined,
      instagramMediaUrl: row.instagram_media_url || undefined,
      permalink: row.permalink || undefined,
      initialLikes: row.initial_likes || undefined,
      initialComments: row.initial_comments || undefined,
      initialReach: row.initial_reach || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      cancelledAt: row.cancelled_at || undefined,
    });
  }
}

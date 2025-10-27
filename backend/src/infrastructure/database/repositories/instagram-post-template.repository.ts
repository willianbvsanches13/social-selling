import { Injectable } from '@nestjs/common';
import { IInstagramPostTemplateRepository } from '../../../domain/repositories/instagram-post-template.repository.interface';
import {
  InstagramPostTemplate,
  TemplateCategory,
} from '../../../domain/entities/instagram-post-template.entity';
import { PostMediaType } from '../../../domain/entities/instagram-scheduled-post.entity';
import { Database } from '../database';
import { BaseRepository } from './base.repository';

/**
 * Instagram Post Template Repository
 * Concrete implementation using raw SQL
 */
@Injectable()
export class InstagramPostTemplateRepository
  extends BaseRepository
  implements IInstagramPostTemplateRepository
{
  constructor(database: Database) {
    super(database.getDb(), InstagramPostTemplateRepository.name);
  }

  async create(
    template: InstagramPostTemplate,
  ): Promise<InstagramPostTemplate> {
    const templateData = template.toJSON();

    const query = `
      INSERT INTO instagram_post_templates (
        id, user_id, client_account_id, name, category, caption_template,
        variables, default_media_type, suggested_hashtags, suggested_mentions,
        is_active, usage_count, last_used_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
    `;

    await this.db.query(query, [
      templateData.id,
      templateData.userId,
      templateData.clientAccountId || null,
      templateData.name,
      templateData.category || null,
      templateData.captionTemplate,
      JSON.stringify(templateData.variables),
      templateData.defaultMediaType,
      JSON.stringify(templateData.suggestedHashtags),
      JSON.stringify(templateData.suggestedMentions),
      templateData.isActive,
      templateData.usageCount,
      templateData.lastUsedAt || null,
      templateData.createdAt,
      templateData.updatedAt,
    ]);

    return template;
  }

  async findById(id: string): Promise<InstagramPostTemplate | null> {
    const query = `
      SELECT * FROM instagram_post_templates WHERE id = $1
    `;

    const row = await this.db.oneOrNone(query, [id]);

    if (!row) {
      return null;
    }

    return this.mapRowToEntity(row);
  }

  async findByUser(userId: string): Promise<InstagramPostTemplate[]> {
    const query = `
      SELECT * FROM instagram_post_templates
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const rows = await this.db.manyOrNone(query, [userId]);

    return rows.map((row) => this.mapRowToEntity(row));
  }

  async update(
    template: InstagramPostTemplate,
  ): Promise<InstagramPostTemplate> {
    const templateData = template.toJSON();

    const query = `
      UPDATE instagram_post_templates SET
        name = $2,
        category = $3,
        caption_template = $4,
        variables = $5,
        default_media_type = $6,
        suggested_hashtags = $7,
        suggested_mentions = $8,
        is_active = $9,
        usage_count = $10,
        last_used_at = $11,
        updated_at = $12
      WHERE id = $1
    `;

    await this.db.query(query, [
      templateData.id,
      templateData.name,
      templateData.category || null,
      templateData.captionTemplate,
      JSON.stringify(templateData.variables),
      templateData.defaultMediaType,
      JSON.stringify(templateData.suggestedHashtags),
      JSON.stringify(templateData.suggestedMentions),
      templateData.isActive,
      templateData.usageCount,
      templateData.lastUsedAt || null,
      templateData.updatedAt,
    ]);

    return template;
  }

  async delete(id: string): Promise<void> {
    const query = `DELETE FROM instagram_post_templates WHERE id = $1`;
    await this.db.query(query, [id]);
  }

  private mapRowToEntity(row: any): InstagramPostTemplate {
    const camelRow = this.mapToCamelCase<any>(row);

    return InstagramPostTemplate.reconstitute({
      id: camelRow.id,
      userId: camelRow.userId,
      clientAccountId: camelRow.clientAccountId,
      name: camelRow.name,
      category: camelRow.category as TemplateCategory,
      captionTemplate: camelRow.captionTemplate,
      variables: JSON.parse(camelRow.variables),
      defaultMediaType: camelRow.defaultMediaType as PostMediaType,
      suggestedHashtags: JSON.parse(camelRow.suggestedHashtags),
      suggestedMentions: JSON.parse(camelRow.suggestedMentions),
      isActive: camelRow.isActive,
      usageCount: camelRow.usageCount,
      lastUsedAt: camelRow.lastUsedAt,
      createdAt: camelRow.createdAt,
      updatedAt: camelRow.updatedAt,
    });
  }
}

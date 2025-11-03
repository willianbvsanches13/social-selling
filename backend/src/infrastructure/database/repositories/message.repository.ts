import { Injectable, Inject } from '@nestjs/common';
import { Database } from '../database';
import { IMessageRepository } from '../../../domain/repositories/message.repository.interface';
import {
  Message,
  MessageType,
  SenderType,
  Attachment,
  AttachmentType,
} from '../../../domain/entities/message.entity';

@Injectable()
export class MessageRepository implements IMessageRepository {
  constructor(@Inject(Database) private database: Database) {}

  async findById(id: string): Promise<Message | null> {
    const rows = await this.database.query(
      'SELECT * FROM messages WHERE id = $1 LIMIT 1',
      [id],
    );

    if (!rows || rows.length === 0) {
      return null;
    }

    return this.toDomain(rows[0]);
  }

  async findByPlatformId(platformMessageId: string): Promise<Message | null> {
    const rows = await this.database.query(
      'SELECT * FROM messages WHERE platform_message_id = $1 LIMIT 1',
      [platformMessageId],
    );

    if (!rows || rows.length === 0) {
      return null;
    }

    return this.toDomain(rows[0]);
  }

  async findByConversation(
    conversationId: string,
    options?: {
      messageType?: MessageType;
      isRead?: boolean;
      afterDate?: Date;
      beforeDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<Message[]> {
    const {
      messageType,
      isRead,
      afterDate,
      beforeDate,
      limit = 100,
      offset = 0,
    } = options || {};

    let query = 'SELECT * FROM messages WHERE conversation_id = $1';
    const params: any[] = [conversationId];
    let paramCount = 2;

    if (messageType) {
      query += ` AND message_type = $${paramCount}`;
      params.push(messageType);
      paramCount++;
    }

    if (isRead !== undefined) {
      query += ` AND is_read = $${paramCount}`;
      params.push(isRead);
      paramCount++;
    }

    if (afterDate) {
      query += ` AND sent_at > $${paramCount}`;
      params.push(afterDate);
      paramCount++;
    }

    if (beforeDate) {
      query += ` AND sent_at < $${paramCount}`;
      params.push(beforeDate);
      paramCount++;
    }

    query += ` ORDER BY sent_at ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const rows = await this.database.query(query, params);

    return rows ? rows.map((row) => this.toDomain(row)) : [];
  }

  async create(message: Message): Promise<Message> {
    const data = message.toJSON();

    const rows = await this.database.query(
      `INSERT INTO messages (
        id, conversation_id, platform_message_id, sender_type,
        sender_platform_id, message_type, content, media_url,
        media_type, is_read, sent_at, delivered_at, read_at,
        metadata, created_at, replied_to_message_id, attachments
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        data.id,
        data.conversationId,
        data.platformMessageId,
        data.senderType,
        data.senderPlatformId,
        data.messageType,
        data.content,
        data.mediaUrl,
        data.mediaType,
        data.isRead,
        data.sentAt,
        data.deliveredAt,
        data.readAt,
        JSON.stringify(data.metadata),
        data.createdAt,
        data.repliedToMessageId,
        JSON.stringify(data.attachments),
      ],
    );

    return this.toDomain(rows[0]);
  }

  async markAsRead(messageId: string): Promise<void> {
    await this.database.query(
      `UPDATE messages
       SET is_read = TRUE,
           read_at = CASE WHEN read_at IS NULL THEN NOW() ELSE read_at END
       WHERE id = $1`,
      [messageId],
    );
  }

  async markAsDelivered(messageId: string): Promise<void> {
    await this.database.query(
      `UPDATE messages
       SET delivered_at = CASE WHEN delivered_at IS NULL THEN NOW() ELSE delivered_at END
       WHERE id = $1`,
      [messageId],
    );
  }

  async update(message: Message): Promise<Message> {
    const data = message.toJSON();

    const rows = await this.database.query(
      `UPDATE messages
       SET is_read = $1,
           delivered_at = $2,
           read_at = $3,
           metadata = $4
       WHERE id = $5
       RETURNING *`,
      [
        data.isRead,
        data.deliveredAt,
        data.readAt,
        JSON.stringify(data.metadata),
        data.id,
      ],
    );

    if (!rows || rows.length === 0) {
      throw new Error(`Message ${data.id} not found for update`);
    }

    return this.toDomain(rows[0]);
  }

  async bulkMarkAsRead(messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) {
      return;
    }

    await this.database.query(
      `UPDATE messages
       SET is_read = TRUE,
           read_at = CASE WHEN read_at IS NULL THEN NOW() ELSE read_at END
       WHERE id = ANY($1)`,
      [messageIds],
    );
  }

  async markAllAsReadByConversation(conversationId: string): Promise<number> {
    const result = await this.database.query(
      `UPDATE messages
       SET is_read = TRUE,
           read_at = CASE WHEN read_at IS NULL THEN NOW() ELSE read_at END
       WHERE conversation_id = $1
       AND is_read = FALSE
       AND sender_type = 'customer'`,
      [conversationId],
    );

    // Return number of updated rows
    return result?.length || 0;
  }

  async searchInContent(
    searchTerm: string,
    conversationId?: string,
  ): Promise<Message[]> {
    let query = `SELECT * FROM messages WHERE content ILIKE $1`;
    const params: any[] = [`%${searchTerm}%`];

    if (conversationId) {
      query += ` AND conversation_id = $2`;
      params.push(conversationId);
    }

    query += ` ORDER BY sent_at ASC`;

    const rows = await this.database.query(query, params);

    return rows ? rows.map((row) => this.toDomain(row)) : [];
  }

  async countUnreadByConversation(conversationId: string): Promise<number> {
    const rows = await this.database.query(
      `SELECT COUNT(*) as count
       FROM messages
       WHERE conversation_id = $1
       AND is_read = FALSE
       AND sender_type = 'customer'`,
      [conversationId],
    );

    return rows && rows.length > 0 ? parseInt(rows[0].count) : 0;
  }

  /**
   * Convert database row to domain entity
   */
  private toDomain(row: any): Message {
    // Parse attachments from JSONB
    let attachments: Attachment[] | undefined;
    if (row.attachments) {
      try {
        const parsed = typeof row.attachments === 'string'
          ? JSON.parse(row.attachments)
          : row.attachments;
        attachments = Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
      } catch {
        attachments = undefined;
      }
    }

    return Message.reconstitute({
      id: row.id,
      conversationId: row.conversation_id,
      platformMessageId: row.platform_message_id,
      senderType: row.sender_type as SenderType,
      senderPlatformId: row.sender_platform_id,
      messageType: row.message_type as MessageType,
      content: row.content,
      mediaUrl: row.media_url,
      mediaType: row.media_type,
      isRead: row.is_read,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      readAt: row.read_at,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      repliedToMessageId: row.replied_to_message_id,
      attachments,
    });
  }
}

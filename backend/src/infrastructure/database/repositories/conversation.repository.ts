import { Injectable, Inject } from '@nestjs/common';
import { Database } from '../database';
import { IConversationRepository } from '../../../domain/repositories/conversation.repository.interface';
import {
  Conversation,
  ConversationStatus,
} from '../../../domain/entities/conversation.entity';

@Injectable()
export class ConversationRepository implements IConversationRepository {
  constructor(@Inject(Database) private database: Database) {}

  async findById(id: string): Promise<Conversation | null> {
    const rows = await this.database.query(
      'SELECT * FROM conversations WHERE id = $1 LIMIT 1',
      [id],
    );

    if (!rows || rows.length === 0) {
      return null;
    }

    return this.toDomain(rows[0]);
  }

  async findByPlatformId(
    clientAccountId: string,
    platformConversationId: string,
  ): Promise<Conversation | null> {
    const rows = await this.database.query(
      `SELECT * FROM conversations
       WHERE client_account_id = $1
       AND platform_conversation_id = $2
       LIMIT 1`,
      [clientAccountId, platformConversationId],
    );

    if (!rows || rows.length === 0) {
      return null;
    }

    return this.toDomain(rows[0]);
  }

  async findByClientAccount(
    clientAccountId: string,
    options?: {
      status?: ConversationStatus;
      hasUnread?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<Conversation[]> {
    const { status, hasUnread, limit = 50, offset = 0 } = options || {};

    let query = 'SELECT * FROM conversations WHERE client_account_id = $1';
    const params: any[] = [clientAccountId];
    let paramCount = 2;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (hasUnread !== undefined) {
      if (hasUnread) {
        query += ` AND unread_count > 0`;
      } else {
        query += ` AND unread_count = 0`;
      }
    }

    query += ` ORDER BY last_message_at DESC NULLS LAST LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const rows = await this.database.query(query, params);

    return rows ? rows.map((row) => this.toDomain(row)) : [];
  }

  async countUnread(clientAccountId: string): Promise<number> {
    const rows = await this.database.query(
      `SELECT COUNT(*) as count
       FROM conversations
       WHERE client_account_id = $1
       AND unread_count > 0`,
      [clientAccountId],
    );

    return rows && rows.length > 0 ? parseInt(rows[0].count) : 0;
  }

  async findStaleConversations(days: number): Promise<Conversation[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const rows = await this.database.query(
      `SELECT * FROM conversations
       WHERE last_message_at < $1
       AND status = $2
       ORDER BY last_message_at ASC`,
      [cutoffDate, ConversationStatus.OPEN],
    );

    return rows ? rows.map((row) => this.toDomain(row)) : [];
  }

  async create(conversation: Conversation): Promise<Conversation> {
    const data = conversation.toJSON();

    const rows = await this.database.query(
      `INSERT INTO conversations (
        id, client_account_id, platform_conversation_id,
        participant_platform_id, participant_username, participant_profile_pic,
        last_message_at, unread_count, status, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        data.id,
        data.clientAccountId,
        data.platformConversationId,
        data.participantPlatformId,
        data.participantUsername,
        data.participantProfilePic,
        data.lastMessageAt,
        data.unreadCount,
        data.status,
        JSON.stringify(data.metadata),
        data.createdAt,
        data.updatedAt,
      ],
    );

    return this.toDomain(rows[0]);
  }

  async update(conversation: Conversation): Promise<Conversation> {
    const data = conversation.toJSON();

    const rows = await this.database.query(
      `UPDATE conversations
       SET participant_username = $1,
           participant_profile_pic = $2,
           last_message_at = $3,
           unread_count = $4,
           status = $5,
           metadata = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        data.participantUsername,
        data.participantProfilePic,
        data.lastMessageAt,
        data.unreadCount,
        data.status,
        JSON.stringify(data.metadata),
        data.id,
      ],
    );

    if (!rows || rows.length === 0) {
      throw new Error(`Conversation ${data.id} not found for update`);
    }

    return this.toDomain(rows[0]);
  }

  /**
   * Convert database row to domain entity
   */
  private toDomain(row: any): Conversation {
    return Conversation.reconstitute({
      id: row.id,
      clientAccountId: row.client_account_id,
      platformConversationId: row.platform_conversation_id,
      participantPlatformId: row.participant_platform_id,
      participantUsername: row.participant_username,
      participantProfilePic: row.participant_profile_pic,
      lastMessageAt: row.last_message_at,
      unreadCount: parseInt(row.unread_count, 10),
      status: row.status as ConversationStatus,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}

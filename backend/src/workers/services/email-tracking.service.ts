import { Injectable, Logger } from '@nestjs/common';
import { Database } from '../../infrastructure/database/database';

export enum EmailStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  OPENED = 'OPENED',
  CLICKED = 'CLICKED',
  BOUNCED = 'BOUNCED',
  COMPLAINED = 'COMPLAINED',
  FAILED = 'FAILED',
}

export interface EmailLog {
  id: string;
  user_id: string | null;
  to_address: string;
  from_address: string;
  subject: string;
  template: string;
  status: EmailStatus;
  message_id?: string;
  provider: string;
  sent_at?: Date;
  delivered_at?: Date;
  opened_at?: Date;
  clicked_at?: Date;
  bounced_at?: Date;
  bounce_reason?: string;
  complained_at?: Date;
  error?: string;
  context?: Record<string, any>;
  tags?: string[];
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class EmailTrackingService {
  private readonly logger = new Logger(EmailTrackingService.name);

  constructor(private db: Database) {}

  async logEmailSent(
    to: string | string[],
    subject: string,
    template: string,
    messageId: string,
    provider: string,
    userId?: string,
    fromAddress?: string,
    context?: Record<string, any>,
    tags?: string[],
  ): Promise<string> {
    const recipients = Array.isArray(to) ? to.join(',') : to;

    const result = (await this.db.query(
      `
      INSERT INTO email_logs (
        user_id,
        to_address,
        from_address,
        subject,
        template,
        status,
        message_id,
        provider,
        sent_at,
        context,
        tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
      RETURNING id
    `,
      [
        userId || null,
        recipients,
        fromAddress || 'noreply@socialselling.com',
        subject,
        template,
        EmailStatus.SENT,
        messageId,
        provider,
        context ? JSON.stringify(context) : null,
        tags || null,
      ],
    )) as { id: string }[];

    return result[0].id;
  }

  async logEmailFailed(
    to: string | string[],
    subject: string,
    template: string,
    error: string,
    userId?: string,
    fromAddress?: string,
  ): Promise<void> {
    const recipients = Array.isArray(to) ? to.join(',') : to;

    await this.db.query(
      `
      INSERT INTO email_logs (
        user_id,
        to_address,
        from_address,
        subject,
        template,
        status,
        error
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [
        userId || null,
        recipients,
        fromAddress || 'noreply@socialselling.com',
        subject,
        template,
        EmailStatus.FAILED,
        error,
      ],
    );
  }

  async updateEmailStatus(
    messageId: string,
    status: EmailStatus,
    metadata?: {
      deliveredAt?: Date;
      openedAt?: Date;
      clickedAt?: Date;
      bouncedAt?: Date;
      bounceReason?: string;
      complainedAt?: Date;
    },
  ): Promise<void> {
    const updates: string[] = ['status = $2'];
    const values: any[] = [messageId, status];
    let paramIndex = 3;

    if (metadata?.deliveredAt) {
      updates.push(`delivered_at = $${paramIndex}`);
      values.push(metadata.deliveredAt);
      paramIndex++;
    }

    if (metadata?.openedAt) {
      updates.push(`opened_at = $${paramIndex}`);
      values.push(metadata.openedAt);
      paramIndex++;
    }

    if (metadata?.clickedAt) {
      updates.push(`clicked_at = $${paramIndex}`);
      values.push(metadata.clickedAt);
      paramIndex++;
    }

    if (metadata?.bouncedAt) {
      updates.push(`bounced_at = $${paramIndex}`);
      values.push(metadata.bouncedAt);
      paramIndex++;
    }

    if (metadata?.bounceReason) {
      updates.push(`bounce_reason = $${paramIndex}`);
      values.push(metadata.bounceReason);
      paramIndex++;
    }

    if (metadata?.complainedAt) {
      updates.push(`complained_at = $${paramIndex}`);
      values.push(metadata.complainedAt);
      paramIndex++;
    }

    await this.db.query(
      `
      UPDATE email_logs
      SET ${updates.join(', ')}
      WHERE message_id = $1
    `,
      values,
    );
  }

  async handleBounce(
    messageId: string,
    bounceType: string,
    reason: string,
  ): Promise<void> {
    await this.updateEmailStatus(messageId, EmailStatus.BOUNCED, {
      bouncedAt: new Date(),
      bounceReason: `${bounceType}: ${reason}`,
    });

    // Get email from log
    const log = (await this.db.query(
      `SELECT * FROM email_logs WHERE message_id = $1 LIMIT 1`,
      [messageId],
    )) as EmailLog[];

    if (!log || log.length === 0) return;

    // Mark email as bounced in user table
    if (bounceType === 'hard') {
      const emailAddresses = log[0].to_address.split(',');
      await this.db.query(
        `
        UPDATE users
        SET email_bounced = TRUE, email_bounced_at = NOW()
        WHERE email = ANY($1)
      `,
        [emailAddresses],
      );

      this.logger.warn(`Hard bounce for email: ${log[0].to_address}`);
    }
  }

  async handleComplaint(messageId: string): Promise<void> {
    await this.updateEmailStatus(messageId, EmailStatus.COMPLAINED, {
      complainedAt: new Date(),
    });

    const log = (await this.db.query(
      `SELECT * FROM email_logs WHERE message_id = $1 LIMIT 1`,
      [messageId],
    )) as EmailLog[];

    if (!log || log.length === 0) return;

    // Mark user as complained (opt-out)
    const emailAddresses = log[0].to_address.split(',');
    await this.db.query(
      `
      UPDATE users
      SET email_opt_out = TRUE, email_opt_out_at = NOW()
      WHERE email = ANY($1)
    `,
      [emailAddresses],
    );

    this.logger.warn(`Email complaint received for: ${log[0].to_address}`);
  }

  async getEmailStats(days: number = 30): Promise<Record<string, number>> {
    const stats = (await this.db.query(
      `
      SELECT status, COUNT(*)::text as count
      FROM email_logs
      WHERE sent_at >= NOW() - INTERVAL '${days} days'
      GROUP BY status
    `,
    )) as { status: string; count: string }[];

    return stats.reduce<Record<string, number>>(
      (
        acc: Record<string, number>,
        stat: { status: string; count: string },
      ) => {
        acc[stat.status] = parseInt(stat.count, 10);
        return acc;
      },
      {},
    );
  }

  async getEmailHistory(
    userId: string,
    limit: number = 20,
  ): Promise<EmailLog[]> {
    const user = (await this.db.query(`SELECT email FROM users WHERE id = $1`, [
      userId,
    ])) as { email: string }[];

    if (!user || user.length === 0) return [];

    const logs = (await this.db.query(
      `
      SELECT *
      FROM email_logs
      WHERE to_address LIKE $1
      ORDER BY sent_at DESC
      LIMIT $2
    `,
      [`%${user[0].email}%`, limit],
    )) as EmailLog[];

    return logs;
  }

  async isEmailDeliverable(email: string): Promise<boolean> {
    const user = (await this.db.query(
      `
      SELECT email_bounced, email_opt_out
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
      [email],
    )) as {
      email_bounced: boolean;
      email_opt_out: boolean;
    }[];

    if (!user || user.length === 0) return true;

    return !user[0].email_bounced && !user[0].email_opt_out;
  }
}

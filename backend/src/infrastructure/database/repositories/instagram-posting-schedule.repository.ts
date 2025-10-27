import { Injectable } from '@nestjs/common';
import { IInstagramPostingScheduleRepository } from '../../../domain/repositories/instagram-posting-schedule.repository.interface';
import { InstagramPostingSchedule } from '../../../domain/entities/instagram-posting-schedule.entity';
import { Database } from '../database';
import { BaseRepository } from './base.repository';

/**
 * Instagram Posting Schedule Repository
 * Concrete implementation using raw SQL
 */
@Injectable()
export class InstagramPostingScheduleRepository
  extends BaseRepository
  implements IInstagramPostingScheduleRepository
{
  constructor(database: Database) {
    super(database.getDb(), InstagramPostingScheduleRepository.name);
  }

  async create(
    schedule: InstagramPostingSchedule,
  ): Promise<InstagramPostingSchedule> {
    const scheduleData = schedule.toJSON();

    const query = `
      INSERT INTO instagram_posting_schedules (
        id, client_account_id, day_of_week, time_slots, timezone,
        is_optimal, engagement_score, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
    `;

    await this.db.query(query, [
      scheduleData.id,
      scheduleData.clientAccountId,
      scheduleData.dayOfWeek,
      JSON.stringify(scheduleData.timeSlots),
      scheduleData.timezone,
      scheduleData.isOptimal,
      scheduleData.engagementScore || null,
      scheduleData.isActive,
      scheduleData.createdAt,
      scheduleData.updatedAt,
    ]);

    return schedule;
  }

  async findById(id: string): Promise<InstagramPostingSchedule | null> {
    const query = `
      SELECT * FROM instagram_posting_schedules WHERE id = $1
    `;

    const row = await this.db.oneOrNone(query, [id]);

    if (!row) {
      return null;
    }

    return this.mapRowToEntity(row);
  }

  async findByClientAccount(
    clientAccountId: string,
  ): Promise<InstagramPostingSchedule[]> {
    const query = `
      SELECT * FROM instagram_posting_schedules
      WHERE client_account_id = $1
      ORDER BY day_of_week, time_slots
    `;

    const rows = await this.db.manyOrNone(query, [clientAccountId]);

    return rows.map((row) => this.mapRowToEntity(row));
  }

  async findByClientAccountAndDay(
    clientAccountId: string,
    dayOfWeek: number,
  ): Promise<InstagramPostingSchedule | null> {
    const query = `
      SELECT * FROM instagram_posting_schedules
      WHERE client_account_id = $1 AND day_of_week = $2
    `;

    const row = await this.db.oneOrNone(query, [clientAccountId, dayOfWeek]);

    if (!row) {
      return null;
    }

    return this.mapRowToEntity(row);
  }

  async update(
    schedule: InstagramPostingSchedule,
  ): Promise<InstagramPostingSchedule> {
    const scheduleData = schedule.toJSON();

    const query = `
      UPDATE instagram_posting_schedules SET
        time_slots = $2,
        timezone = $3,
        is_optimal = $4,
        engagement_score = $5,
        is_active = $6,
        updated_at = $7
      WHERE id = $1
    `;

    await this.db.query(query, [
      scheduleData.id,
      JSON.stringify(scheduleData.timeSlots),
      scheduleData.timezone,
      scheduleData.isOptimal,
      scheduleData.engagementScore || null,
      scheduleData.isActive,
      scheduleData.updatedAt,
    ]);

    return schedule;
  }

  private mapRowToEntity(row: any): InstagramPostingSchedule {
    const camelRow = this.mapToCamelCase<any>(row);

    return InstagramPostingSchedule.reconstitute({
      id: camelRow.id,
      clientAccountId: camelRow.clientAccountId,
      dayOfWeek: camelRow.dayOfWeek,
      timeSlots: JSON.parse(camelRow.timeSlots),
      timezone: camelRow.timezone,
      isOptimal: camelRow.isOptimal,
      engagementScore: camelRow.engagementScore,
      isActive: camelRow.isActive,
      createdAt: camelRow.createdAt,
      updatedAt: camelRow.updatedAt,
    });
  }
}

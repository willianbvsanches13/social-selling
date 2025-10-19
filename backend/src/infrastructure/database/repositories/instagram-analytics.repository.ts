import { Injectable, Logger } from '@nestjs/common';
import { IDatabase } from 'pg-promise';
import { BaseRepository } from './base.repository';
import { Inject } from '@nestjs/common';

@Injectable()
export class InstagramAccountInsightRepository extends BaseRepository {
  constructor(@Inject('DB_CONNECTION') protected readonly db: IDatabase<any>) {
    super(db, 'InstagramAccountInsightRepository');
  }

  async findByClientAccountAndDate(
    clientAccountId: string,
    date: string,
    period: string,
  ): Promise<any> {
    const query = `
      SELECT * FROM instagram_account_insights
      WHERE client_account_id = $1 AND date = $2 AND period = $3
    `;
    const row = await this.db.oneOrNone(query, [clientAccountId, date, period]);
    return row ? this.mapToCamelCase(row) : null;
  }

  async save(data: any): Promise<any> {
    const snakeData = this.mapToSnakeCase(data);

    if (data.id) {
      // Update
      const { query, values } = this.buildUpdateQuery(
        'instagram_account_insights',
        data.id,
        data,
      );
      const row = await this.db.one(query, values);
      return this.mapToCamelCase(row);
    } else {
      // Insert
      const keys = Object.keys(snakeData);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const columns = keys.join(', ');
      const queryValues = keys.map((k) => snakeData[k]);

      const query = `
        INSERT INTO instagram_account_insights (${columns})
        VALUES (${placeholders})
        RETURNING *
      `;

      const row = await this.db.one(query, queryValues);
      return this.mapToCamelCase(row);
    }
  }

  async findByClientAccountAndDateRange(
    clientAccountId: string,
    period: string,
    startDate: string,
    endDate: string,
  ): Promise<any[]> {
    const query = `
      SELECT * FROM instagram_account_insights
      WHERE client_account_id = $1 AND period = $2 AND date BETWEEN $3 AND $4
      ORDER BY date ASC
    `;
    const rows = await this.db.any(query, [
      clientAccountId,
      period,
      startDate,
      endDate,
    ]);
    return this.mapArrayToCamelCase(rows);
  }

  async getPreviousPeriodInsight(
    clientAccountId: string,
    date: string,
    period: string,
  ): Promise<any> {
    let previousDate: string;

    switch (period) {
      case 'day':
        previousDate = new Date(new Date(date).getTime() - 86400000)
          .toISOString()
          .split('T')[0];
        break;
      case 'week':
        previousDate = new Date(new Date(date).getTime() - 604800000)
          .toISOString()
          .split('T')[0];
        break;
      case 'days_28':
        previousDate = new Date(new Date(date).getTime() - 2419200000)
          .toISOString()
          .split('T')[0];
        break;
      default:
        return null;
    }

    const query = `
      SELECT * FROM instagram_account_insights
      WHERE client_account_id = $1 AND date = $2 AND period = $3
    `;
    const row = await this.db.oneOrNone(query, [
      clientAccountId,
      previousDate,
      period,
    ]);
    return row ? this.mapToCamelCase(row) : null;
  }
}

@Injectable()
export class InstagramMediaInsightRepository extends BaseRepository {
  constructor(@Inject('DB_CONNECTION') protected readonly db: IDatabase<any>) {
    super(db, 'InstagramMediaInsightRepository');
  }

  async findByMediaId(clientAccountId: string, mediaIgId: string): Promise<any> {
    const query = `
      SELECT * FROM instagram_media_insights
      WHERE client_account_id = $1 AND media_ig_id = $2
    `;
    const row = await this.db.oneOrNone(query, [clientAccountId, mediaIgId]);
    return row ? this.mapToCamelCase(row) : null;
  }

  async save(data: any): Promise<any> {
    const snakeData = this.mapToSnakeCase(data);

    if (data.id) {
      // Update
      const { query, values } = this.buildUpdateQuery(
        'instagram_media_insights',
        data.id,
        data,
      );
      const row = await this.db.one(query, values);
      return this.mapToCamelCase(row);
    } else {
      // Insert
      const keys = Object.keys(snakeData);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const columns = keys.join(', ');
      const queryValues = keys.map((k) => snakeData[k]);

      const query = `
        INSERT INTO instagram_media_insights (${columns})
        VALUES (${placeholders})
        RETURNING *
      `;

      const row = await this.db.one(query, queryValues);
      return this.mapToCamelCase(row);
    }
  }

  async findByClientAccountAndDateRange(
    clientAccountId: string,
    startDate: string,
    endDate: string,
  ): Promise<any[]> {
    const query = `
      SELECT * FROM instagram_media_insights
      WHERE client_account_id = $1 AND timestamp BETWEEN $2 AND $3
      ORDER BY timestamp DESC
    `;
    const rows = await this.db.any(query, [clientAccountId, startDate, endDate]);
    return this.mapArrayToCamelCase(rows);
  }

  async getTopPosts(
    clientAccountId: string,
    metric: 'engagement' | 'reach' | 'impressions',
    limit: number,
    startDate?: string,
    endDate?: string,
  ): Promise<any[]> {
    let orderBy: string;
    switch (metric) {
      case 'engagement':
        orderBy = 'engagement_rate DESC';
        break;
      case 'reach':
        orderBy = 'reach DESC';
        break;
      case 'impressions':
        orderBy = 'impressions DESC';
        break;
      default:
        orderBy = 'engagement_rate DESC';
    }

    let query = `
      SELECT * FROM instagram_media_insights
      WHERE client_account_id = $1
    `;
    const params: any[] = [clientAccountId];

    if (startDate) {
      params.push(startDate);
      query += ` AND timestamp >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND timestamp <= $${params.length}`;
    }

    query += ` ORDER BY ${orderBy} LIMIT $${params.length + 1}`;
    params.push(limit);

    const rows = await this.db.any(query, params);
    return this.mapArrayToCamelCase(rows);
  }
}

@Injectable()
export class InstagramStoryInsightRepository extends BaseRepository {
  constructor(@Inject('DB_CONNECTION') protected readonly db: IDatabase<any>) {
    super(db, 'InstagramStoryInsightRepository');
  }

  async findByStoryId(clientAccountId: string, storyIgId: string): Promise<any> {
    const query = `
      SELECT * FROM instagram_story_insights
      WHERE client_account_id = $1 AND story_ig_id = $2
    `;
    const row = await this.db.oneOrNone(query, [clientAccountId, storyIgId]);
    return row ? this.mapToCamelCase(row) : null;
  }

  async save(data: any): Promise<any> {
    const snakeData = this.mapToSnakeCase(data);

    if (data.id) {
      // Update
      const { query, values } = this.buildUpdateQuery(
        'instagram_story_insights',
        data.id,
        data,
      );
      const row = await this.db.one(query, values);
      return this.mapToCamelCase(row);
    } else {
      // Insert
      const keys = Object.keys(snakeData);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const columns = keys.join(', ');
      const queryValues = keys.map((k) => snakeData[k]);

      const query = `
        INSERT INTO instagram_story_insights (${columns})
        VALUES (${placeholders})
        RETURNING *
      `;

      const row = await this.db.one(query, queryValues);
      return this.mapToCamelCase(row);
    }
  }
}

@Injectable()
export class InstagramAnalyticsReportRepository extends BaseRepository {
  constructor(@Inject('DB_CONNECTION') protected readonly db: IDatabase<any>) {
    super(db, 'InstagramAnalyticsReportRepository');
  }

  async save(data: any): Promise<any> {
    const snakeData = this.mapToSnakeCase(data);

    const keys = Object.keys(snakeData);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.join(', ');
    const queryValues = keys.map((k) => snakeData[k]);

    const query = `
      INSERT INTO instagram_analytics_reports (${columns})
      VALUES (${placeholders})
      RETURNING *
    `;

    const row = await this.db.one(query, queryValues);
    return this.mapToCamelCase(row);
  }

  async findByClientAccountId(clientAccountId: string, limit: number = 10): Promise<any[]> {
    const query = `
      SELECT * FROM instagram_analytics_reports
      WHERE client_account_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const rows = await this.db.any(query, [clientAccountId, limit]);
    return this.mapArrayToCamelCase(rows);
  }

  async findById(id: string): Promise<any> {
    const query = `
      SELECT * FROM instagram_analytics_reports WHERE id = $1
    `;
    const row = await this.db.oneOrNone(query, [id]);
    return row ? this.mapToCamelCase(row) : null;
  }
}

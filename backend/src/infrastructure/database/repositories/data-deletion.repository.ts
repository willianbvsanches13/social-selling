import { Injectable } from '@nestjs/common';
import { IDataDeletionRepository } from '../../../domain/repositories/data-deletion.repository.interface';
import {
  DataDeletionRequest,
  DeletionRequestStatus,
} from '../../../domain/entities/data-deletion-request.entity';
import { Database } from '../database';
import { BaseRepository } from './base.repository';

@Injectable()
export class DataDeletionRepository
  extends BaseRepository
  implements IDataDeletionRepository
{
  constructor(database: Database) {
    super(database.getDb(), DataDeletionRepository.name);
  }

  async findById(id: string): Promise<DataDeletionRequest | null> {
    const query = `
      SELECT
        id,
        user_id,
        confirmation_code,
        source,
        status,
        requested_at,
        completed_at,
        error_message,
        metadata,
        created_at,
        updated_at
      FROM data_deletion_requests
      WHERE id = $1
    `;

    const row = await this.db.oneOrNone(query, [id]);
    if (!row) return null;
    const mapped: any = this.mapToCamelCase(row);
    return DataDeletionRequest.reconstitute({
      ...mapped,
      metadata: mapped.metadata || undefined,
      completedAt: mapped.completedAt || undefined,
      errorMessage: mapped.errorMessage || undefined,
    });
  }

  async findByConfirmationCode(
    confirmationCode: string,
  ): Promise<DataDeletionRequest | null> {
    const query = `
      SELECT
        id,
        user_id,
        confirmation_code,
        source,
        status,
        requested_at,
        completed_at,
        error_message,
        metadata,
        created_at,
        updated_at
      FROM data_deletion_requests
      WHERE confirmation_code = $1
    `;

    const row = await this.db.oneOrNone(query, [confirmationCode]);
    if (!row) return null;
    const mapped: any = this.mapToCamelCase(row);
    return DataDeletionRequest.reconstitute({
      ...mapped,
      metadata: mapped.metadata || undefined,
      completedAt: mapped.completedAt || undefined,
      errorMessage: mapped.errorMessage || undefined,
    });
  }

  async findByUserId(userId: string): Promise<DataDeletionRequest[]> {
    const query = `
      SELECT
        id,
        user_id,
        confirmation_code,
        source,
        status,
        requested_at,
        completed_at,
        error_message,
        metadata,
        created_at,
        updated_at
      FROM data_deletion_requests
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const rows = await this.db.manyOrNone(query, [userId]);
    if (!rows || rows.length === 0) return [];
    return rows.map((row) => {
      const mapped: any = this.mapToCamelCase(row);
      return DataDeletionRequest.reconstitute({
        ...mapped,
        metadata: mapped.metadata || undefined,
        completedAt: mapped.completedAt || undefined,
        errorMessage: mapped.errorMessage || undefined,
      });
    });
  }

  async findPendingRequests(): Promise<DataDeletionRequest[]> {
    const query = `
      SELECT
        id,
        user_id,
        confirmation_code,
        source,
        status,
        requested_at,
        completed_at,
        error_message,
        metadata,
        created_at,
        updated_at
      FROM data_deletion_requests
      WHERE status = $1
      ORDER BY created_at ASC
    `;

    const rows = await this.db.manyOrNone(query, [
      DeletionRequestStatus.PENDING,
    ]);
    if (!rows || rows.length === 0) return [];
    return rows.map((row) => {
      const mapped: any = this.mapToCamelCase(row);
      return DataDeletionRequest.reconstitute({
        ...mapped,
        metadata: mapped.metadata || undefined,
        completedAt: mapped.completedAt || undefined,
        errorMessage: mapped.errorMessage || undefined,
      });
    });
  }

  async create(request: DataDeletionRequest): Promise<DataDeletionRequest> {
    const query = `
      INSERT INTO data_deletion_requests (
        id,
        user_id,
        confirmation_code,
        source,
        status,
        requested_at,
        completed_at,
        error_message,
        metadata,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const json = request.toJSON();
    const values = [
      json.id,
      json.userId,
      json.confirmationCode,
      json.source,
      json.status,
      json.requestedAt,
      json.completedAt || null,
      json.errorMessage || null,
      json.metadata ? JSON.stringify(json.metadata) : null,
      json.createdAt,
      json.updatedAt,
    ];

    const row = await this.db.one(query, values);
    const mapped: any = this.mapToCamelCase(row);
    return DataDeletionRequest.reconstitute({
      ...mapped,
      metadata: mapped.metadata || undefined,
      completedAt: mapped.completedAt || undefined,
      errorMessage: mapped.errorMessage || undefined,
    });
  }

  async updateStatus(
    id: string,
    status: DeletionRequestStatus,
    errorMessage?: string,
  ): Promise<DataDeletionRequest> {
    const completedAt =
      status === DeletionRequestStatus.COMPLETED ? new Date() : null;
    const query = `
      UPDATE data_deletion_requests
      SET
        status = $2,
        completed_at = $3,
        error_message = $4,
        updated_at = $5
      WHERE id = $1
      RETURNING *
    `;

    const values = [id, status, completedAt, errorMessage || null, new Date()];

    const row = await this.db.one(query, values);
    const mapped: any = this.mapToCamelCase(row);
    return DataDeletionRequest.reconstitute({
      ...mapped,
      metadata: mapped.metadata || undefined,
      completedAt: mapped.completedAt || undefined,
      errorMessage: mapped.errorMessage || undefined,
    });
  }
}

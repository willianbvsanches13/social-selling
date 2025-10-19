import { Injectable } from '@nestjs/common';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { User, CreateUserDto, UpdateUserDto } from '../../../domain/entities/user.entity';
import { Database } from '../database';
import { BaseRepository } from './base.repository';

@Injectable()
export class UserRepository extends BaseRepository implements IUserRepository {
  constructor(database: Database) {
    super(database.getDb(), UserRepository.name);
  }

  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT
        id,
        email,
        password_hash,
        name,
        timezone,
        language,
        subscription_tier,
        email_verified,
        email_verification_token,
        password_reset_token,
        password_reset_expires,
        last_login_at,
        last_login_ip,
        created_at,
        updated_at,
        deleted_at
      FROM users
      WHERE id = $1
        AND deleted_at IS NULL
    `;

    const row = await this.db.oneOrNone(query, [id]);
    return row ? this.mapToCamelCase<User>(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT
        id,
        email,
        password_hash,
        name,
        timezone,
        language,
        subscription_tier,
        email_verified,
        email_verification_token,
        password_reset_token,
        password_reset_expires,
        last_login_at,
        last_login_ip,
        created_at,
        updated_at,
        deleted_at
      FROM users
      WHERE email = $1
        AND deleted_at IS NULL
    `;

    const row = await this.db.oneOrNone(query, [email]);
    return row ? this.mapToCamelCase<User>(row) : null;
  }

  async findAll(limit: number = 50, offset: number = 0): Promise<User[]> {
    const query = `
      SELECT
        id,
        email,
        password_hash,
        name,
        timezone,
        language,
        subscription_tier,
        email_verified,
        email_verification_token,
        password_reset_token,
        password_reset_expires,
        last_login_at,
        last_login_ip,
        created_at,
        updated_at,
        deleted_at
      FROM users
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const rows = await this.db.manyOrNone(query, [limit, offset]);
    return this.mapArrayToCamelCase<User>(rows || []);
  }

  async create(data: CreateUserDto): Promise<User> {
    const query = `
      INSERT INTO users (
        email,
        password_hash,
        name,
        timezone,
        language,
        subscription_tier
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      data.email,
      data.passwordHash,
      data.name,
      data.timezone || 'America/Sao_Paulo',
      data.language || 'pt-BR',
      data.subscriptionTier || 'free',
    ];

    const row = await this.db.one(query, values);
    return this.mapToCamelCase<User>(row);
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    const { query, values } = this.buildUpdateQuery('users', id, data);
    const row = await this.db.one(query, values);
    return this.mapToCamelCase<User>(row);
  }

  async delete(id: string): Promise<void> {
    const query = `
      DELETE FROM users
      WHERE id = $1
    `;
    await this.db.none(query, [id]);
  }

  async softDelete(id: string): Promise<void> {
    const query = `
      UPDATE users
      SET deleted_at = NOW()
      WHERE id = $1
    `;
    await this.db.none(query, [id]);
  }

  async count(): Promise<number> {
    const query = `
      SELECT COUNT(*)::int as count
      FROM users
      WHERE deleted_at IS NULL
    `;
    const result = await this.db.one(query);
    return result.count;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1
        FROM users
        WHERE email = $1
          AND deleted_at IS NULL
      ) as exists
    `;
    const result = await this.db.one(query, [email]);
    return result.exists;
  }
}

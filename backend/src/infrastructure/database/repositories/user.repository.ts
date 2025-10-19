import { Injectable } from '@nestjs/common';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
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
    if (!row) return null;
    const mapped: any = this.mapToCamelCase(row);
    return User.reconstitute({
      ...mapped,
      email: new Email(mapped.email),
    });
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
    if (!row) return null;
    const mapped: any = this.mapToCamelCase(row);
    return User.reconstitute({
      ...mapped,
      email: new Email(mapped.email),
    });
  }

  async findByVerificationToken(token: string): Promise<User | null> {
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
      WHERE email_verification_token = $1
        AND deleted_at IS NULL
    `;

    const row = await this.db.oneOrNone(query, [token]);
    if (!row) return null;
    const mapped: any = this.mapToCamelCase(row);
    return User.reconstitute({
      ...mapped,
      email: new Email(mapped.email),
    });
  }

  async create(user: User): Promise<User> {
    const query = `
      INSERT INTO users (
        id,
        email,
        password_hash,
        name,
        timezone,
        language,
        subscription_tier,
        email_verified,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      user.id,
      user.email.value,
      user.passwordHash,
      user.name,
      user.toJSON().timezone,
      user.toJSON().language,
      user.subscriptionTier,
      user.emailVerified,
      user.toJSON().createdAt,
      user.toJSON().updatedAt,
    ];

    const row = await this.db.one(query, values);
    const mapped: any = this.mapToCamelCase(row);
    return User.reconstitute({
      ...mapped,
      email: new Email(mapped.email),
    });
  }

  async update(user: User): Promise<User> {
    const query = `
      UPDATE users
      SET
        email = $2,
        name = $3,
        timezone = $4,
        language = $5,
        subscription_tier = $6,
        email_verified = $7,
        password_hash = $8,
        email_verification_token = $9,
        deleted_at = $10,
        updated_at = $11
      WHERE id = $1
      RETURNING *
    `;

    const json = user.toJSON();
    // Access private props through reflection for fields not in toJSON
    const userPrivateProps = (user as any).props;

    const values = [
      user.id,
      user.email.value,
      user.name,
      json.timezone,
      json.language,
      user.subscriptionTier,
      user.emailVerified,
      user.passwordHash,
      userPrivateProps.emailVerificationToken || null,
      userPrivateProps.deletedAt || null,
      new Date(),
    ];

    const row = await this.db.one(query, values);
    const mapped: any = this.mapToCamelCase(row);
    return User.reconstitute({
      ...mapped,
      email: new Email(mapped.email),
    });
  }

  async delete(id: string): Promise<void> {
    const query = `
      DELETE FROM users
      WHERE id = $1
    `;
    await this.db.none(query, [id]);
  }

  async updateLastLogin(id: string, ip: string): Promise<void> {
    const query = `
      UPDATE users
      SET last_login_at = NOW(), last_login_ip = $2
      WHERE id = $1
    `;
    await this.db.none(query, [id, ip]);
  }

  async storeRefreshToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    const query = `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
    `;
    await this.db.none(query, [userId, tokenHash, expiresAt]);
  }

  async findRefreshToken(
    tokenHash: string,
  ): Promise<{ userId: string; expiresAt: Date } | null> {
    const query = `
      SELECT user_id, expires_at
      FROM refresh_tokens
      WHERE token_hash = $1
        AND revoked_at IS NULL
        AND expires_at > NOW()
    `;
    const row = await this.db.oneOrNone(query, [tokenHash]);
    if (!row) return null;
    return this.mapToCamelCase(row);
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    const query = `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE token_hash = $1
    `;
    await this.db.none(query, [tokenHash]);
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    const query = `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE user_id = $1
        AND revoked_at IS NULL
    `;
    await this.db.none(query, [userId]);
  }
}

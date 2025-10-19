import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IOAuthTokenRepository } from '../../../domain/repositories/oauth-token.repository.interface';
import { OAuthToken } from '../../../domain/entities/oauth-token.entity';
import { Database } from '../database';
import { BaseRepository } from './base.repository';

@Injectable()
export class OAuthTokenRepository
  extends BaseRepository
  implements IOAuthTokenRepository
{
  private readonly encryptionKey: string;

  constructor(
    database: Database,
    private readonly configService: ConfigService,
  ) {
    super(database.getDb(), OAuthTokenRepository.name);
    this.encryptionKey =
      this.configService.get<string>('OAUTH_ENCRYPTION_KEY') || '';
    if (!this.encryptionKey) {
      this.logger.error(
        'OAUTH_ENCRYPTION_KEY is not set in environment variables',
      );
      throw new Error(
        'OAUTH_ENCRYPTION_KEY is required for OAuth token encryption',
      );
    }
  }

  async findById(id: string): Promise<OAuthToken | null> {
    const query = `
      SELECT
        id,
        client_account_id,
        pgp_sym_decrypt(access_token::bytea, $2) as access_token,
        token_type,
        expires_at,
        scopes,
        created_at,
        updated_at,
        revoked_at
      FROM oauth_tokens
      WHERE id = $1
        AND revoked_at IS NULL
    `;

    const row = await this.db.oneOrNone(query, [id, this.encryptionKey]);
    if (!row) return null;
    return this.mapToEntity(row);
  }

  async findByClientAccountId(
    clientAccountId: string,
  ): Promise<OAuthToken | null> {
    const query = `
      SELECT
        id,
        client_account_id,
        pgp_sym_decrypt(access_token::bytea, $2) as access_token,
        token_type,
        expires_at,
        scopes,
        created_at,
        updated_at,
        revoked_at
      FROM oauth_tokens
      WHERE client_account_id = $1
        AND revoked_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const row = await this.db.oneOrNone(query, [
      clientAccountId,
      this.encryptionKey,
    ]);
    if (!row) return null;
    return this.mapToEntity(row);
  }

  async create(oauthToken: OAuthToken): Promise<OAuthToken> {
    const json = oauthToken.toJSON();
    const privateProps = (oauthToken as any).props;

    const query = `
      INSERT INTO oauth_tokens (
        id,
        client_account_id,
        access_token,
        token_type,
        expires_at,
        scopes,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2,
        pgp_sym_encrypt($3, $4),
        $5, $6, $7, $8, $9
      )
      RETURNING
        id,
        client_account_id,
        pgp_sym_decrypt(access_token::bytea, $4) as access_token,
        token_type,
        expires_at,
        scopes,
        created_at,
        updated_at,
        revoked_at
    `;

    const scopesArray = privateProps.scope
      ? privateProps.scope.split(',').map((s: string) => s.trim())
      : [];

    const values = [
      json.id,
      json.clientAccountId,
      privateProps.encryptedAccessToken, // Will be encrypted by pgp_sym_encrypt
      this.encryptionKey,
      json.tokenType || 'Bearer',
      json.expiresAt,
      scopesArray,
      json.createdAt,
      json.updatedAt,
    ];

    const row = await this.db.one(query, values);
    return this.mapToEntity(row);
  }

  async update(oauthToken: OAuthToken): Promise<OAuthToken> {
    const json = oauthToken.toJSON();
    const privateProps = (oauthToken as any).props;

    const query = `
      UPDATE oauth_tokens
      SET
        access_token = pgp_sym_encrypt($2, $3),
        token_type = $4,
        expires_at = $5,
        scopes = $6,
        updated_at = $7
      WHERE id = $1
        AND revoked_at IS NULL
      RETURNING
        id,
        client_account_id,
        pgp_sym_decrypt(access_token::bytea, $3) as access_token,
        token_type,
        expires_at,
        scopes,
        created_at,
        updated_at,
        revoked_at
    `;

    const scopesArray = privateProps.scope
      ? privateProps.scope.split(',').map((s: string) => s.trim())
      : [];

    const values = [
      json.id,
      privateProps.encryptedAccessToken, // Will be encrypted by pgp_sym_encrypt
      this.encryptionKey,
      json.tokenType || 'Bearer',
      json.expiresAt,
      scopesArray,
      new Date(),
    ];

    const row = await this.db.one(query, values);
    return this.mapToEntity(row);
  }

  async delete(id: string): Promise<void> {
    const query = `
      UPDATE oauth_tokens
      SET revoked_at = NOW()
      WHERE id = $1
    `;
    await this.db.none(query, [id]);
  }

  async findExpiring(thresholdDays: number): Promise<OAuthToken[]> {
    const query = `
      SELECT
        id,
        client_account_id,
        pgp_sym_decrypt(access_token::bytea, $2) as access_token,
        token_type,
        expires_at,
        scopes,
        created_at,
        updated_at,
        revoked_at
      FROM oauth_tokens
      WHERE revoked_at IS NULL
        AND expires_at <= NOW() + INTERVAL '1 day' * $1
        AND expires_at > NOW()
      ORDER BY expires_at ASC
    `;

    const rows = await this.db.manyOrNone(query, [
      thresholdDays,
      this.encryptionKey,
    ]);
    return rows ? rows.map((row) => this.mapToEntity(row)) : [];
  }

  private mapToEntity(row: any): OAuthToken {
    const mapped = this.mapToCamelCase<any>(row);
    const scopeString = Array.isArray(mapped.scopes)
      ? mapped.scopes.join(',')
      : '';

    return OAuthToken.reconstitute({
      id: mapped.id,
      clientAccountId: mapped.clientAccountId,
      encryptedAccessToken: mapped.accessToken, // Already decrypted from DB
      tokenType: mapped.tokenType,
      expiresAt: new Date(mapped.expiresAt),
      scope: scopeString,
      createdAt: new Date(mapped.createdAt),
      updatedAt: new Date(mapped.updatedAt),
    });
  }
}

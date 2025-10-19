"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UserRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const common_1 = require("@nestjs/common");
const user_entity_1 = require("../../../domain/entities/user.entity");
const email_vo_1 = require("../../../domain/value-objects/email.vo");
const database_1 = require("../database");
const base_repository_1 = require("./base.repository");
let UserRepository = UserRepository_1 = class UserRepository extends base_repository_1.BaseRepository {
    constructor(database) {
        super(database.getDb(), UserRepository_1.name);
    }
    async findById(id) {
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
        if (!row)
            return null;
        const mapped = this.mapToCamelCase(row);
        return user_entity_1.User.reconstitute({
            ...mapped,
            email: new email_vo_1.Email(mapped.email),
        });
    }
    async findByEmail(email) {
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
        if (!row)
            return null;
        const mapped = this.mapToCamelCase(row);
        return user_entity_1.User.reconstitute({
            ...mapped,
            email: new email_vo_1.Email(mapped.email),
        });
    }
    async findByVerificationToken(token) {
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
        if (!row)
            return null;
        const mapped = this.mapToCamelCase(row);
        return user_entity_1.User.reconstitute({
            ...mapped,
            email: new email_vo_1.Email(mapped.email),
        });
    }
    async create(user) {
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
        const mapped = this.mapToCamelCase(row);
        return user_entity_1.User.reconstitute({
            ...mapped,
            email: new email_vo_1.Email(mapped.email),
        });
    }
    async update(user) {
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
        const userPrivateProps = user.props;
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
        const mapped = this.mapToCamelCase(row);
        return user_entity_1.User.reconstitute({
            ...mapped,
            email: new email_vo_1.Email(mapped.email),
        });
    }
    async delete(id) {
        const query = `
      DELETE FROM users
      WHERE id = $1
    `;
        await this.db.none(query, [id]);
    }
    async updateLastLogin(id, ip) {
        const query = `
      UPDATE users
      SET last_login_at = NOW(), last_login_ip = $2
      WHERE id = $1
    `;
        await this.db.none(query, [id, ip]);
    }
    async storeRefreshToken(userId, tokenHash, expiresAt) {
        const query = `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
    `;
        await this.db.none(query, [userId, tokenHash, expiresAt]);
    }
    async findRefreshToken(tokenHash) {
        const query = `
      SELECT user_id, expires_at
      FROM refresh_tokens
      WHERE token_hash = $1
        AND revoked_at IS NULL
        AND expires_at > NOW()
    `;
        const row = await this.db.oneOrNone(query, [tokenHash]);
        if (!row)
            return null;
        return this.mapToCamelCase(row);
    }
    async revokeRefreshToken(tokenHash) {
        const query = `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE token_hash = $1
    `;
        await this.db.none(query, [tokenHash]);
    }
    async revokeAllUserRefreshTokens(userId) {
        const query = `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE user_id = $1
        AND revoked_at IS NULL
    `;
        await this.db.none(query, [userId]);
    }
};
exports.UserRepository = UserRepository;
exports.UserRepository = UserRepository = UserRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_1.Database])
], UserRepository);
//# sourceMappingURL=user.repository.js.map
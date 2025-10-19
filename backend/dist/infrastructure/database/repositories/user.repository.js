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
        return row ? this.mapToCamelCase(row) : null;
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
        return row ? this.mapToCamelCase(row) : null;
    }
    async findAll(limit = 50, offset = 0) {
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
        return this.mapArrayToCamelCase(rows || []);
    }
    async create(data) {
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
        return this.mapToCamelCase(row);
    }
    async update(id, data) {
        const { query, values } = this.buildUpdateQuery('users', id, data);
        const row = await this.db.one(query, values);
        return this.mapToCamelCase(row);
    }
    async delete(id) {
        const query = `
      DELETE FROM users
      WHERE id = $1
    `;
        await this.db.none(query, [id]);
    }
    async softDelete(id) {
        const query = `
      UPDATE users
      SET deleted_at = NOW()
      WHERE id = $1
    `;
        await this.db.none(query, [id]);
    }
    async count() {
        const query = `
      SELECT COUNT(*)::int as count
      FROM users
      WHERE deleted_at IS NULL
    `;
        const result = await this.db.one(query);
        return result.count;
    }
    async existsByEmail(email) {
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
};
exports.UserRepository = UserRepository;
exports.UserRepository = UserRepository = UserRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_1.Database])
], UserRepository);
//# sourceMappingURL=user.repository.js.map
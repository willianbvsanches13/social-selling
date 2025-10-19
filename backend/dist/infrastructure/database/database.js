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
var Database_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const pgPromise = require("pg-promise");
let Database = Database_1 = class Database {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(Database_1.name);
        this.isConnected = false;
        this.initializeDatabase();
    }
    async onModuleInit() {
        await this.testConnection();
    }
    initializeDatabase() {
        const isDevMode = this.configService.get('NODE_ENV') === 'development';
        const initOptions = {
            error: (error, e) => {
                if (e.cn) {
                    this.logger.error(`Database connection error: ${error.message || error}`);
                }
                else if (e.query) {
                    this.logger.error(`Query error: ${error.message || error}`);
                    this.logger.error(`Query: ${e.query}`);
                }
                else {
                    this.logger.error(`Database error: ${error.message || error}`);
                }
            },
            ...(isDevMode && {
                query: (e) => {
                    this.logger.debug(`QUERY: ${e.query}`);
                    if (e.params) {
                        this.logger.debug(`PARAMS: ${JSON.stringify(e.params)}`);
                    }
                },
            }),
        };
        this.pgp = pgPromise(initOptions);
        const config = {
            host: this.configService.get('POSTGRES_HOST', 'localhost'),
            port: this.configService.get('POSTGRES_PORT', 5432),
            database: this.configService.get('POSTGRES_DB', 'social_selling'),
            user: this.configService.get('POSTGRES_USER', 'postgres'),
            password: this.configService.get('POSTGRES_PASSWORD', 'postgres'),
            min: 2,
            max: this.configService.get('DB_POOL_SIZE', 20),
            idleTimeoutMillis: this.configService.get('DB_IDLE_TIMEOUT', 30000),
            connectionTimeoutMillis: this.configService.get('DB_CONNECTION_TIMEOUT', 2000),
        };
        this.db = this.pgp(config);
        this.logger.log('Database connection pool initialized');
    }
    async testConnection() {
        try {
            await this.db.connect();
            this.isConnected = true;
            this.logger.log('Database connected successfully');
        }
        catch (error) {
            this.isConnected = false;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to connect to database: ${errorMessage}`);
            throw error;
        }
    }
    getDb() {
        return this.db;
    }
    getPgp() {
        return this.pgp;
    }
    async query(sql, params) {
        return this.db.any(sql, params);
    }
    async one(sql, params) {
        return this.db.one(sql, params);
    }
    async oneOrNone(sql, params) {
        return this.db.oneOrNone(sql, params);
    }
    async many(sql, params) {
        return this.db.many(sql, params);
    }
    async none(sql, params) {
        return this.db.none(sql, params);
    }
    async tx(callback) {
        return this.db.tx(callback);
    }
    async isHealthy() {
        try {
            await this.db.one('SELECT 1 as result');
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Database health check failed: ${errorMessage}`);
            return false;
        }
    }
    getConnectionStatus() {
        return this.isConnected;
    }
    async onModuleDestroy() {
        if (this.db) {
            await this.db.$pool.end();
            this.isConnected = false;
            this.logger.log('Database connection closed');
        }
    }
};
exports.Database = Database;
exports.Database = Database = Database_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], Database);
//# sourceMappingURL=database.js.map
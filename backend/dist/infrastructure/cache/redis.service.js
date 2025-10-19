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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
let RedisService = class RedisService {
    constructor(configService) {
        this.configService = configService;
        this.defaultTTL = 3600;
    }
    async onModuleInit() {
        const redisConfig = this.configService.get('redis');
        this.client = new ioredis_1.default({
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            db: 0,
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            reconnectOnError: (err) => {
                const targetError = 'READONLY';
                if (err.message.includes(targetError)) {
                    return true;
                }
                return false;
            },
        });
        this.client.on('connect', () => {
            console.log('Redis connected');
        });
        this.client.on('error', (err) => {
            console.error('Redis error:', err);
        });
    }
    async onModuleDestroy() {
        await this.client.quit();
    }
    async get(key) {
        return this.client.get(key);
    }
    async set(key, value, ttl) {
        const seconds = ttl || this.defaultTTL;
        await this.client.setex(key, seconds, value);
    }
    async del(key) {
        return this.client.del(key);
    }
    async exists(key) {
        const result = await this.client.exists(key);
        return result === 1;
    }
    async ttl(key) {
        return this.client.ttl(key);
    }
    async incr(key) {
        return this.client.incr(key);
    }
    async expire(key, seconds) {
        const result = await this.client.expire(key, seconds);
        return result === 1;
    }
    async hget(key, field) {
        return this.client.hget(key, field);
    }
    async hset(key, field, value) {
        return this.client.hset(key, field, value);
    }
    async hgetall(key) {
        return this.client.hgetall(key);
    }
    async keys(pattern) {
        return this.client.keys(pattern);
    }
    async flushdb() {
        return this.client.flushdb();
    }
    async isHealthy() {
        try {
            const result = await this.client.ping();
            return result === 'PONG';
        }
        catch (error) {
            return false;
        }
    }
    getClient() {
        return this.client;
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisService);
//# sourceMappingURL=redis.service.js.map
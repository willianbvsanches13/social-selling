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
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const terminus_1 = require("@nestjs/terminus");
const health_check_1 = require("../../infrastructure/database/health-check");
const redis_health_indicator_1 = require("../../infrastructure/cache/redis-health.indicator");
let HealthController = class HealthController {
    constructor(health, dbHealth, redisHealth) {
        this.health = health;
        this.dbHealth = dbHealth;
        this.redisHealth = redisHealth;
    }
    check() {
        return this.health.check([
            () => this.dbHealth.pingCheck('database'),
            () => this.redisHealth.pingCheck('redis'),
        ]);
    }
    checkDatabase() {
        return this.health.check([
            () => this.dbHealth.isHealthy('database'),
        ]);
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    (0, terminus_1.HealthCheck)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Check application health',
        description: 'Returns health status of all critical services (database and Redis)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'All services are healthy',
        schema: {
            example: {
                status: 'ok',
                info: {
                    database: { status: 'up' },
                    redis: { status: 'up' },
                },
                error: {},
                details: {
                    database: { status: 'up' },
                    redis: { status: 'up' },
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 503,
        description: 'One or more services are unhealthy',
        schema: {
            example: {
                status: 'error',
                info: {},
                error: {
                    database: { status: 'down', message: 'Connection timeout' },
                },
                details: {
                    database: { status: 'down', message: 'Connection timeout' },
                    redis: { status: 'up' },
                },
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "check", null);
__decorate([
    (0, common_1.Get)('db'),
    (0, terminus_1.HealthCheck)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Check database health',
        description: 'Returns health status of the PostgreSQL database connection',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Database is healthy',
        schema: {
            example: {
                status: 'ok',
                info: {
                    database: { status: 'up' },
                },
                error: {},
                details: {
                    database: { status: 'up' },
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 503,
        description: 'Database is unhealthy',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "checkDatabase", null);
exports.HealthController = HealthController = __decorate([
    (0, swagger_1.ApiTags)('Health'),
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [terminus_1.HealthCheckService,
        health_check_1.DatabaseHealthIndicator,
        redis_health_indicator_1.RedisHealthIndicator])
], HealthController);
//# sourceMappingURL=health.controller.js.map
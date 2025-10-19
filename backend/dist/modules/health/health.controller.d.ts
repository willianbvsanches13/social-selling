import { HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from '../../infrastructure/database/health-check';
import { RedisHealthIndicator } from '../../infrastructure/cache/redis-health.indicator';
export declare class HealthController {
    private readonly health;
    private readonly dbHealth;
    private readonly redisHealth;
    constructor(health: HealthCheckService, dbHealth: DatabaseHealthIndicator, redisHealth: RedisHealthIndicator);
    check(): Promise<HealthCheckResult>;
    checkDatabase(): Promise<HealthCheckResult>;
}

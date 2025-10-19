import { HealthCheckService, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import { RedisHealthIndicator } from './indicators/redis-health.indicator';
import { HealthService } from './health.service';
export declare class HealthController {
    private readonly healthService;
    private health;
    private memory;
    private disk;
    private redis;
    constructor(healthService: HealthService, health: HealthCheckService, memory: MemoryHealthIndicator, disk: DiskHealthIndicator, redis: RedisHealthIndicator);
    check(): Promise<import("@nestjs/terminus").HealthCheckResult>;
    readiness(): {
        status: string;
    };
    liveness(): {
        status: string;
        timestamp: string;
        uptime: number;
        environment: string;
    };
}

import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, HealthCheckResult } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from '../../infrastructure/database/health-check';
import { RedisHealthIndicator } from '../../infrastructure/cache/redis-health.indicator';

/**
 * HealthController
 *
 * Provides health check endpoints for monitoring the application status.
 * Includes database and Redis connectivity checks and overall application health.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly dbHealth: DatabaseHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
  ) {}

  /**
   * Health check endpoint
   *
   * Returns the health status of the application including:
   * - Database connectivity
   * - Redis connectivity
   *
   * @returns HealthCheckResult with status of all health indicators
   */
  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.dbHealth.pingCheck('database'),
      () => this.redisHealth.pingCheck('redis'),
    ]);
  }

  /**
   * Database-specific health check endpoint
   *
   * @returns HealthCheckResult with database status only
   */
  @Get('db')
  @HealthCheck()
  checkDatabase(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.dbHealth.isHealthy('database'),
    ]);
  }
}

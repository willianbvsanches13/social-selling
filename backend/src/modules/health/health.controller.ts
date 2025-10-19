import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService, HealthCheck, HealthCheckResult } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from '../../infrastructure/database/health-check';
import { RedisHealthIndicator } from '../../infrastructure/cache/redis-health.indicator';

/**
 * HealthController
 *
 * Provides health check endpoints for monitoring the application status.
 * Includes database and Redis connectivity checks and overall application health.
 */
@ApiTags('Health')
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
  @ApiOperation({
    summary: 'Check application health',
    description: 'Returns health status of all critical services (database and Redis)',
  })
  @ApiResponse({
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
  })
  @ApiResponse({
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
  })
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
  @ApiOperation({
    summary: 'Check database health',
    description: 'Returns health status of the PostgreSQL database connection',
  })
  @ApiResponse({
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
  })
  @ApiResponse({
    status: 503,
    description: 'Database is unhealthy',
  })
  checkDatabase(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.dbHealth.isHealthy('database'),
    ]);
  }
}

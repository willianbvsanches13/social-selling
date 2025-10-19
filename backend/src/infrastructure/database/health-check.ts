import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { Database } from './database';

/**
 * DatabaseHealthIndicator
 *
 * Provides health check functionality for the PostgreSQL database connection.
 * Integrates with @nestjs/terminus for standardized health check reporting.
 */
@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(private readonly database: Database) {
    super();
  }

  /**
   * Check if the database is healthy
   *
   * @param key - The key to identify this health check in the response
   * @returns HealthIndicatorResult with database status
   * @throws HealthCheckError if database is unhealthy
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isHealthy = await this.database.isHealthy();
    const result = this.getStatus(key, isHealthy, {
      connection: this.database.getConnectionStatus() ? 'active' : 'inactive',
    });

    if (isHealthy) {
      return result;
    }

    throw new HealthCheckError('Database health check failed', result);
  }

  /**
   * Ping check - Simple connectivity test
   *
   * @param key - The key to identify this health check in the response
   * @returns HealthIndicatorResult with ping status
   * @throws HealthCheckError if ping fails
   */
  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    return this.isHealthy(key);
  }
}

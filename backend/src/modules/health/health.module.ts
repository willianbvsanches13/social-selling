import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

/**
 * HealthModule
 *
 * Provides health check functionality for the application.
 * Uses @nestjs/terminus for standardized health check responses.
 */
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { WorkersModule } from './workers/workers.module';

/**
 * Worker Module
 * Bootstraps only the workers and their dependencies
 * Does not include HTTP-related modules (routes, controllers, etc.)
 */
@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    // Workers module with all processors
    WorkersModule,
  ],
})
export class WorkerModule {}

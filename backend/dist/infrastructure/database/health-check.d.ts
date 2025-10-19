import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { Database } from './database';
export declare class DatabaseHealthIndicator extends HealthIndicator {
    private readonly database;
    constructor(database: Database);
    isHealthy(key: string): Promise<HealthIndicatorResult>;
    pingCheck(key: string): Promise<HealthIndicatorResult>;
}

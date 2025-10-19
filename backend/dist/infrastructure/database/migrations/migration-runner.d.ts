import { IDatabase } from 'pg-promise';
export declare class MigrationRunner {
    private readonly db;
    private readonly migrationsDir;
    constructor(db: IDatabase<any>);
    initialize(): Promise<void>;
    run(): Promise<void>;
    rollback(steps?: number): Promise<void>;
    status(): Promise<void>;
    private getAllMigrationFiles;
    private getPendingMigrations;
    private executeMigration;
    private rollbackMigration;
    private extractUpMigration;
    private extractRollbackMigration;
}

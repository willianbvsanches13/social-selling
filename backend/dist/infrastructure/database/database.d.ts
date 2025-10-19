import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IDatabase, IMain } from 'pg-promise';
export declare class Database implements OnModuleInit, OnModuleDestroy {
    private configService;
    private readonly logger;
    private db;
    private pgp;
    private isConnected;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    private initializeDatabase;
    private testConnection;
    getDb(): IDatabase<any>;
    getPgp(): IMain;
    query(sql: string, params?: any[]): Promise<any[]>;
    one<T>(sql: string, params?: any[]): Promise<T>;
    oneOrNone<T>(sql: string, params?: any[]): Promise<T | null>;
    many<T>(sql: string, params?: any[]): Promise<T[]>;
    none(sql: string, params?: any[]): Promise<null>;
    tx<T>(callback: (t: any) => Promise<T>): Promise<T>;
    isHealthy(): Promise<boolean>;
    getConnectionStatus(): boolean;
    onModuleDestroy(): Promise<void>;
}

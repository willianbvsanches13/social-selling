import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as pgPromise from 'pg-promise';
import { IDatabase, IInitOptions, IMain } from 'pg-promise';

@Injectable()
export class Database implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Database.name);
  private db!: IDatabase<any>;
  private pgp!: IMain;
  private isConnected = false;

  constructor(private configService: ConfigService) {
    this.initializeDatabase();
  }

  async onModuleInit() {
    await this.testConnection();
  }

  private initializeDatabase(): void {
    const isDevMode =
      this.configService.get<string>('NODE_ENV') === 'development';

    // Initialize pg-promise with enhanced error handling
    const initOptions: IInitOptions = {
      // Error handling
      error: (error, e) => {
        if (e.cn) {
          this.logger.error(
            `Database connection error: ${error.message || error}`,
          );
        } else if (e.query) {
          this.logger.error(`Query error: ${error.message || error}`);
          this.logger.error(`Query: ${e.query}`);
        } else {
          this.logger.error(`Database error: ${error.message || error}`);
        }
      },
      // Query monitoring (development only)
      ...(isDevMode && {
        query: (e) => {
          this.logger.debug(`QUERY: ${e.query}`);
          if (e.params) {
            this.logger.debug(`PARAMS: ${JSON.stringify(e.params)}`);
          }
        },
      }),
    };

    this.pgp = pgPromise(initOptions);

    // Database connection configuration with connection pooling
    const config = {
      host: this.configService.get<string>('POSTGRES_HOST', 'localhost'),
      port: this.configService.get<number>('POSTGRES_PORT', 5432),
      database: this.configService.get<string>('POSTGRES_DB', 'social_selling'),
      user: this.configService.get<string>('POSTGRES_USER', 'postgres'),
      password: this.configService.get<string>('POSTGRES_PASSWORD', 'postgres'),
      // Connection pool settings
      min: 2, // Minimum pool size
      max: this.configService.get<number>('DB_POOL_SIZE', 20), // Maximum pool size
      idleTimeoutMillis: this.configService.get<number>(
        'DB_IDLE_TIMEOUT',
        30000,
      ), // 30 seconds
      connectionTimeoutMillis: this.configService.get<number>(
        'DB_CONNECTION_TIMEOUT',
        2000,
      ), // 2 seconds
    };

    this.db = this.pgp(config);
    this.logger.log('Database connection pool initialized');
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<void> {
    try {
      await this.db.connect();
      this.isConnected = true;
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.isConnected = false;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to connect to database: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  getDb(): IDatabase<any> {
    return this.db;
  }

  /**
   * Get pg-promise instance
   */
  getPgp(): IMain {
    return this.pgp;
  }

  /**
   * Execute a query that returns any number of rows (including zero)
   */
  async query(sql: string, params?: any[]): Promise<any[]> {
    return this.db.any(sql, params);
  }

  /**
   * Execute a query that expects exactly one row
   * Throws an error if no rows or more than one row is returned
   */
  async one<T>(sql: string, params?: any[]): Promise<T> {
    return this.db.one<T>(sql, params);
  }

  /**
   * Execute a query that expects either one row or no rows
   * Returns null if no rows are found
   */
  async oneOrNone<T>(sql: string, params?: any[]): Promise<T | null> {
    return this.db.oneOrNone<T>(sql, params);
  }

  /**
   * Execute a query that expects one or more rows
   * Throws an error if no rows are returned
   */
  async many<T>(sql: string, params?: any[]): Promise<T[]> {
    return this.db.many<T>(sql, params);
  }

  /**
   * Execute a query that expects no rows to be returned
   * Typically used for INSERT, UPDATE, DELETE operations
   */
  async none(sql: string, params?: any[]): Promise<null> {
    return this.db.none(sql, params);
  }

  /**
   * Execute queries within a transaction
   * Automatically commits on success or rolls back on error
   */
  async tx<T>(callback: (t: any) => Promise<T>): Promise<T> {
    return this.db.tx(callback);
  }

  /**
   * Health check - verifies database connectivity
   * Returns true if database is reachable, false otherwise
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.db.one('SELECT 1 as result');
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Database health check failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Get database connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    if (this.db) {
      await this.db.$pool.end();
      this.isConnected = false;
      this.logger.log('Database connection closed');
    }
  }
}

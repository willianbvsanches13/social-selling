import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Redis as RedisClient } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: RedisClient;
  private readonly defaultTTL = 3600; // 1 hour

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisConfig = this.configService.get('redis');

    console.log(`🔄 Initializing Redis connection to ${redisConfig.host}:${redisConfig.port}...`);

    this.client = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: 0,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy: (times: number) => {
        if (times > 10) {
          console.error(`❌ Redis connection failed after ${times} attempts. Giving up.`);
          return null; // Stop retrying
        }
        const delay = Math.min(times * 500, 3000);
        console.log(`⏳ Redis retry attempt ${times}, waiting ${delay}ms...`);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    this.client.on('ready', () => {
      console.log('✅ Redis is ready to accept commands');
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
      console.error(`Connection details: host=${redisConfig.host}, port=${redisConfig.port}`);
    });

    this.client.on('close', () => {
      console.warn('⚠️  Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    // Wait for Redis to be ready
    try {
      await this.client.ping();
      console.log('✅ Redis ping successful');
    } catch (error) {
      console.error('❌ Redis ping failed:', error instanceof Error ? error.message : error);
      throw new Error(`Failed to connect to Redis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // Basic operations
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const seconds = ttl || this.defaultTTL;
    await this.client.setex(key, seconds, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.client.expire(key, seconds);
    return result === 1;
  }

  // Advanced operations
  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async flushdb(): Promise<'OK'> {
    return this.client.flushdb();
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (_error) {
      return false;
    }
  }

  // Get raw client for BullMQ
  getClient(): RedisClient {
    return this.client;
  }
}

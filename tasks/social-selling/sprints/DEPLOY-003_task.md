# DEPLOY-003: Performance Optimization

## Overview
Comprehensive performance optimization strategy covering database queries, caching, image optimization, CDN integration, compression, and load testing to achieve sub-second response times and handle 10,000+ concurrent users.

## Epic
Epic 13: Deployment & DevOps

## Story Points
13

## Priority
High

## Status
Ready for Implementation

---

## Table of Contents
1. [Database Query Optimization](#database-query-optimization)
2. [Redis Caching Strategy](#redis-caching-strategy)
3. [Image Optimization](#image-optimization)
4. [CDN Setup](#cdn-setup)
5. [Compression](#compression)
6. [Database Connection Pooling](#database-connection-pooling)
7. [Query Result Caching](#query-result-caching)
8. [Load Testing](#load-testing)
9. [Performance Monitoring](#performance-monitoring)
10. [Optimization Checklist](#optimization-checklist)

---

## 1. Database Query Optimization

### 1.1 Query Analysis Tools

**File:** `src/database/optimization/query-analyzer.ts`
```typescript
import { DataSource } from 'typeorm';
import { Logger } from '../utils/logger';

export class QueryAnalyzer {
  private logger = new Logger('QueryAnalyzer');
  private slowQueryThreshold = 100; // ms

  constructor(private dataSource: DataSource) {}

  /**
   * Analyze query performance using EXPLAIN
   */
  async analyzeQuery(query: string, params: any[] = []): Promise<any> {
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;

    try {
      const result = await this.dataSource.query(explainQuery, params);
      const plan = result[0]['QUERY PLAN'][0];

      const analysis = {
        executionTime: plan['Execution Time'],
        planningTime: plan['Planning Time'],
        totalTime: plan['Execution Time'] + plan['Planning Time'],
        plan: plan.Plan,
        recommendations: this.generateRecommendations(plan)
      };

      if (analysis.totalTime > this.slowQueryThreshold) {
        this.logger.warn(`Slow query detected (${analysis.totalTime}ms)`, {
          query,
          analysis
        });
      }

      return analysis;
    } catch (error) {
      this.logger.error('Query analysis failed', { error, query });
      throw error;
    }
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(plan: any): string[] {
    const recommendations: string[] = [];
    const rootPlan = plan.Plan;

    // Check for sequential scans
    if (this.hasSequentialScan(rootPlan)) {
      recommendations.push('Consider adding indexes to avoid sequential scans');
    }

    // Check for high cost operations
    if (rootPlan['Total Cost'] > 1000) {
      recommendations.push('Query cost is high. Review joins and filters');
    }

    // Check for missing indexes
    if (rootPlan['Node Type'] === 'Seq Scan' && rootPlan['Rows Removed by Filter'] > 0) {
      recommendations.push(`Add index on filtered columns to improve performance`);
    }

    // Check for inefficient joins
    if (this.hasNestedLoopJoin(rootPlan) && rootPlan['Actual Rows'] > 1000) {
      recommendations.push('Nested loop join on large dataset. Consider hash or merge join');
    }

    return recommendations;
  }

  private hasSequentialScan(plan: any): boolean {
    if (plan['Node Type'] === 'Seq Scan') return true;
    if (plan.Plans) {
      return plan.Plans.some((p: any) => this.hasSequentialScan(p));
    }
    return false;
  }

  private hasNestedLoopJoin(plan: any): boolean {
    if (plan['Node Type'] === 'Nested Loop') return true;
    if (plan.Plans) {
      return plan.Plans.some((p: any) => this.hasNestedLoopJoin(p));
    }
    return false;
  }

  /**
   * Find missing indexes
   */
  async findMissingIndexes(): Promise<any[]> {
    const query = `
      SELECT
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats
      WHERE schemaname = 'public'
        AND n_distinct > 100
        AND correlation < 0.1
      ORDER BY tablename, attname;
    `;

    return this.dataSource.query(query);
  }

  /**
   * Get slow queries from pg_stat_statements
   */
  async getSlowQueries(limit: number = 20): Promise<any[]> {
    const query = `
      SELECT
        query,
        calls,
        total_exec_time,
        mean_exec_time,
        max_exec_time,
        stddev_exec_time,
        rows
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
      ORDER BY mean_exec_time DESC
      LIMIT $1;
    `;

    return this.dataSource.query(query, [limit]);
  }
}
```

### 1.2 Index Creation Script

**File:** `src/database/migrations/1700000000000-AddPerformanceIndexes.ts`
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users table indexes
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower
      ON users (LOWER(email));
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_status
      ON users (role, status)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at
      ON users (created_at DESC);
    `);

    // Products table indexes
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_user_status
      ON products (user_id, status)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_status
      ON products (category, status)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_price
      ON products (price)
      WHERE status = 'active' AND deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_created_at
      ON products (created_at DESC)
      WHERE deleted_at IS NULL;
    `);

    // Full-text search index for products
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_search
      ON products USING gin(
        to_tsvector('english',
          coalesce(title, '') || ' ' ||
          coalesce(description, '') || ' ' ||
          coalesce(category, '')
        )
      );
    `);

    // Orders table indexes
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_status
      ON orders (user_id, status, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_seller_status
      ON orders (seller_id, status, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created
      ON orders (status, created_at DESC);
    `);

    // Order items table indexes
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order
      ON order_items (order_id);
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_product
      ON order_items (product_id);
    `);

    // Messages table indexes
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_created
      ON messages (conversation_id, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender
      ON messages (sender_id, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_unread
      ON messages (receiver_id, read_at)
      WHERE read_at IS NULL;
    `);

    // Conversations table indexes
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_participants
      ON conversations (participant1_id, participant2_id);
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_updated
      ON conversations (updated_at DESC);
    `);

    // Notifications table indexes
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread
      ON notifications (user_id, read_at, created_at DESC)
      WHERE read_at IS NULL;
    `);

    // Reviews table indexes
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_product_rating
      ON reviews (product_id, rating, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_user
      ON reviews (user_id, created_at DESC);
    `);

    // Partial indexes for common queries
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active
      ON products (created_at DESC)
      WHERE status = 'active' AND deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_pending
      ON orders (created_at DESC)
      WHERE status IN ('pending', 'processing');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all indexes created above
    const indexes = [
      'idx_users_email_lower',
      'idx_users_role_status',
      'idx_users_created_at',
      'idx_products_user_status',
      'idx_products_category_status',
      'idx_products_price',
      'idx_products_created_at',
      'idx_products_search',
      'idx_orders_user_status',
      'idx_orders_seller_status',
      'idx_orders_status_created',
      'idx_order_items_order',
      'idx_order_items_product',
      'idx_messages_conversation_created',
      'idx_messages_sender',
      'idx_messages_unread',
      'idx_conversations_participants',
      'idx_conversations_updated',
      'idx_notifications_user_unread',
      'idx_reviews_product_rating',
      'idx_reviews_user',
      'idx_products_active',
      'idx_orders_pending'
    ];

    for (const index of indexes) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${index};`);
    }
  }
}
```

### 1.3 Query Optimization Service

**File:** `src/services/query-optimization.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class QueryOptimizationService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource
  ) {}

  /**
   * Optimized product search with full-text search
   */
  async searchProducts(searchTerm: string, filters: any = {}): Promise<any[]> {
    const query = this.dataSource
      .createQueryBuilder()
      .select('p')
      .from('products', 'p')
      .where('p.deleted_at IS NULL')
      .andWhere('p.status = :status', { status: 'active' });

    // Full-text search
    if (searchTerm) {
      query.andWhere(
        `to_tsvector('english', p.title || ' ' || p.description || ' ' || p.category)
         @@ plainto_tsquery('english', :search)`,
        { search: searchTerm }
      );
      query.orderBy(
        `ts_rank(
          to_tsvector('english', p.title || ' ' || p.description || ' ' || p.category),
          plainto_tsquery('english', :search)
        )`,
        'DESC'
      );
    }

    // Apply filters
    if (filters.category) {
      query.andWhere('p.category = :category', { category: filters.category });
    }

    if (filters.minPrice) {
      query.andWhere('p.price >= :minPrice', { minPrice: filters.minPrice });
    }

    if (filters.maxPrice) {
      query.andWhere('p.price <= :maxPrice', { maxPrice: filters.maxPrice });
    }

    // Add default ordering
    if (!searchTerm) {
      query.orderBy('p.created_at', 'DESC');
    }

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    query.skip((page - 1) * limit).take(limit);

    return query.getMany();
  }

  /**
   * Optimized user orders with eager loading
   */
  async getUserOrders(userId: string, options: any = {}): Promise<any[]> {
    return this.dataSource.query(
      `
      SELECT
        o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'quantity', oi.quantity,
            'price', oi.price,
            'product', json_build_object(
              'id', p.id,
              'title', p.title,
              'image_url', p.image_url
            )
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = $1
        AND o.status = COALESCE($2, o.status)
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT $3 OFFSET $4
      `,
      [
        userId,
        options.status || null,
        options.limit || 20,
        ((options.page || 1) - 1) * (options.limit || 20)
      ]
    );
  }

  /**
   * Optimized dashboard statistics
   */
  async getDashboardStats(userId: string): Promise<any> {
    const stats = await this.dataSource.query(
      `
      WITH user_products AS (
        SELECT COUNT(*) as total_products
        FROM products
        WHERE user_id = $1 AND deleted_at IS NULL
      ),
      user_orders AS (
        SELECT
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as total_revenue
        FROM orders
        WHERE seller_id = $1
      ),
      user_reviews AS (
        SELECT
          COUNT(*) as total_reviews,
          ROUND(AVG(rating), 2) as average_rating
        FROM reviews r
        JOIN products p ON r.product_id = p.id
        WHERE p.user_id = $1
      )
      SELECT
        up.total_products,
        uo.total_orders,
        uo.total_revenue,
        ur.total_reviews,
        ur.average_rating
      FROM user_products up
      CROSS JOIN user_orders uo
      CROSS JOIN user_reviews ur
      `,
      [userId]
    );

    return stats[0];
  }
}
```

---

## 2. Redis Caching Strategy

### 2.1 Cache Service Implementation

**File:** `src/services/cache.service.ts`
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { Logger } from '../utils/logger';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private logger = new Logger('CacheService');

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB', 0),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3
    });

    this.client.on('connect', () => {
      this.logger.info('Redis connected');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis connection error', { error });
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value);
    } catch (error) {
      this.logger.error('Cache get error', { key, error });
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      await this.client.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      this.logger.error('Cache set error', { key, error });
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error('Cache delete error', { key, error });
    }
  }

  /**
   * Delete keys matching pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      this.logger.error('Cache delete pattern error', { pattern, error });
    }
  }

  /**
   * Get or set cache (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch data
    const data = await fetchFn();

    // Store in cache
    await this.set(key, data, ttl);

    return data;
  }

  /**
   * Increment counter
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.client.incrby(key, amount);
    } catch (error) {
      this.logger.error('Cache increment error', { key, error });
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error('Cache exists error', { key, error });
      return false;
    }
  }

  /**
   * Set with expiration at specific time
   */
  async setWithExpireAt(key: string, value: any, timestamp: number): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value));
      await this.client.expireat(key, timestamp);
    } catch (error) {
      this.logger.error('Cache setWithExpireAt error', { key, error });
    }
  }

  /**
   * Add to sorted set
   */
  async zadd(key: string, score: number, member: string): Promise<void> {
    try {
      await this.client.zadd(key, score, member);
    } catch (error) {
      this.logger.error('Cache zadd error', { key, error });
    }
  }

  /**
   * Get sorted set range
   */
  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.client.zrange(key, start, stop);
    } catch (error) {
      this.logger.error('Cache zrange error', { key, error });
      return [];
    }
  }
}
```

### 2.2 Cache Keys Strategy

**File:** `src/constants/cache-keys.ts`
```typescript
export const CacheKeys = {
  // User caches (TTL: 1 hour)
  USER_BY_ID: (id: string) => `user:${id}`,
  USER_BY_EMAIL: (email: string) => `user:email:${email}`,
  USER_PROFILE: (id: string) => `user:profile:${id}`,
  USER_SETTINGS: (id: string) => `user:settings:${id}`,

  // Product caches (TTL: 30 minutes)
  PRODUCT_BY_ID: (id: string) => `product:${id}`,
  PRODUCT_LIST: (page: number, filters: string) => `products:list:${page}:${filters}`,
  PRODUCT_SEARCH: (term: string, page: number) => `products:search:${term}:${page}`,
  PRODUCT_CATEGORY: (category: string, page: number) => `products:category:${category}:${page}`,
  FEATURED_PRODUCTS: () => `products:featured`,

  // Order caches (TTL: 5 minutes)
  ORDER_BY_ID: (id: string) => `order:${id}`,
  USER_ORDERS: (userId: string, page: number) => `orders:user:${userId}:${page}`,
  SELLER_ORDERS: (sellerId: string, page: number) => `orders:seller:${sellerId}:${page}`,

  // Statistics caches (TTL: 15 minutes)
  DASHBOARD_STATS: (userId: string) => `stats:dashboard:${userId}`,
  PRODUCT_STATS: (productId: string) => `stats:product:${productId}`,
  SELLER_STATS: (sellerId: string) => `stats:seller:${sellerId}`,

  // Session caches (TTL: 24 hours)
  SESSION: (sessionId: string) => `session:${sessionId}`,
  REFRESH_TOKEN: (token: string) => `refresh:${token}`,

  // Rate limiting (TTL: 1 minute)
  RATE_LIMIT: (ip: string, endpoint: string) => `ratelimit:${ip}:${endpoint}`,

  // Search caches (TTL: 10 minutes)
  SEARCH_SUGGESTIONS: (term: string) => `search:suggestions:${term}`,
  POPULAR_SEARCHES: () => `search:popular`,

  // Notification caches (TTL: 5 minutes)
  USER_NOTIFICATIONS: (userId: string) => `notifications:${userId}`,
  UNREAD_COUNT: (userId: string) => `notifications:unread:${userId}`,

  // Conversation caches (TTL: 10 minutes)
  CONVERSATION: (id: string) => `conversation:${id}`,
  USER_CONVERSATIONS: (userId: string) => `conversations:user:${userId}`,
  UNREAD_MESSAGES: (userId: string) => `messages:unread:${userId}`,
};

export const CacheTTL = {
  ONE_MINUTE: 60,
  FIVE_MINUTES: 300,
  TEN_MINUTES: 600,
  FIFTEEN_MINUTES: 900,
  THIRTY_MINUTES: 1800,
  ONE_HOUR: 3600,
  SIX_HOURS: 21600,
  TWELVE_HOURS: 43200,
  ONE_DAY: 86400,
  ONE_WEEK: 604800,
};
```

### 2.3 Caching Decorator

**File:** `src/decorators/cache.decorator.ts`
```typescript
import { CacheService } from '../services/cache.service';
import { Logger } from '../utils/logger';

const logger = new Logger('CacheDecorator');

export function Cacheable(options: {
  keyGenerator: (...args: any[]) => string;
  ttl?: number;
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService: CacheService = this.cacheService;

      if (!cacheService) {
        logger.warn('CacheService not found, executing without cache');
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      const key = options.keyGenerator(...args);

      // Try to get from cache
      const cached = await cacheService.get(key);
      if (cached !== null) {
        logger.debug('Cache hit', { key });
        return cached;
      }

      // Execute original method
      logger.debug('Cache miss', { key });
      const result = await originalMethod.apply(this, args);

      // Store in cache
      await cacheService.set(key, result, options.ttl || 3600);

      return result;
    };

    return descriptor;
  };
}

export function CacheEvict(options: {
  keyGenerator?: (...args: any[]) => string;
  pattern?: string;
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      const cacheService: CacheService = this.cacheService;
      if (!cacheService) {
        return result;
      }

      // Evict cache
      if (options.keyGenerator) {
        const key = options.keyGenerator(...args);
        await cacheService.del(key);
        logger.debug('Cache evicted', { key });
      }

      if (options.pattern) {
        await cacheService.delPattern(options.pattern);
        logger.debug('Cache pattern evicted', { pattern: options.pattern });
      }

      return result;
    };

    return descriptor;
  };
}
```

---

## 3. Image Optimization

### 3.1 Image Processing Service

**File:** `src/services/image-processing.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { S3Service } from './s3.service';
import { Logger } from '../utils/logger';

interface ImageSize {
  width: number;
  height: number;
  suffix: string;
}

@Injectable()
export class ImageProcessingService {
  private logger = new Logger('ImageProcessingService');

  private imageSizes: ImageSize[] = [
    { width: 150, height: 150, suffix: 'thumbnail' },
    { width: 400, height: 400, suffix: 'small' },
    { width: 800, height: 800, suffix: 'medium' },
    { width: 1200, height: 1200, suffix: 'large' },
  ];

  constructor(private s3Service: S3Service) {}

  /**
   * Process and upload image in multiple sizes
   */
  async processAndUploadImage(
    buffer: Buffer,
    filename: string,
    folder: string = 'products'
  ): Promise<{ [key: string]: string }> {
    const urls: { [key: string]: string } = {};

    try {
      // Get image metadata
      const metadata = await sharp(buffer).metadata();
      this.logger.info('Processing image', {
        filename,
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
      });

      // Process original image
      const optimizedOriginal = await this.optimizeImage(buffer, {
        quality: 90,
        format: 'webp',
      });

      // Upload original
      const originalKey = `${folder}/original/${filename}.webp`;
      urls.original = await this.s3Service.upload(
        optimizedOriginal,
        originalKey,
        'image/webp'
      );

      // Process and upload different sizes
      for (const size of this.imageSizes) {
        const resized = await this.resizeImage(buffer, size);
        const key = `${folder}/${size.suffix}/${filename}.webp`;
        urls[size.suffix] = await this.s3Service.upload(
          resized,
          key,
          'image/webp'
        );
      }

      this.logger.info('Image processing completed', { filename, urls });
      return urls;
    } catch (error) {
      this.logger.error('Image processing failed', { error, filename });
      throw error;
    }
  }

  /**
   * Optimize image
   */
  private async optimizeImage(
    buffer: Buffer,
    options: {
      quality?: number;
      format?: 'webp' | 'jpeg' | 'png';
    } = {}
  ): Promise<Buffer> {
    const { quality = 80, format = 'webp' } = options;

    let pipeline = sharp(buffer);

    // Convert to specified format
    if (format === 'webp') {
      pipeline = pipeline.webp({ quality, effort: 6 });
    } else if (format === 'jpeg') {
      pipeline = pipeline.jpeg({ quality, progressive: true, mozjpeg: true });
    } else if (format === 'png') {
      pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
    }

    // Strip metadata
    pipeline = pipeline.withMetadata({
      exif: {},
      icc: 'srgb',
    });

    return pipeline.toBuffer();
  }

  /**
   * Resize image
   */
  private async resizeImage(
    buffer: Buffer,
    size: ImageSize
  ): Promise<Buffer> {
    return sharp(buffer)
      .resize(size.width, size.height, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 80, effort: 6 })
      .toBuffer();
  }

  /**
   * Generate responsive image srcset
   */
  generateSrcSet(urls: { [key: string]: string }): string {
    const sizes = [
      { url: urls.thumbnail, width: 150 },
      { url: urls.small, width: 400 },
      { url: urls.medium, width: 800 },
      { url: urls.large, width: 1200 },
    ];

    return sizes
      .map((size) => `${size.url} ${size.width}w`)
      .join(', ');
  }

  /**
   * Lazy load placeholder (blur hash)
   */
  async generatePlaceholder(buffer: Buffer): Promise<string> {
    const placeholder = await sharp(buffer)
      .resize(20, 20, { fit: 'cover' })
      .blur(5)
      .webp({ quality: 20 })
      .toBuffer();

    return `data:image/webp;base64,${placeholder.toString('base64')}`;
  }
}
```

### 3.2 Frontend Image Component

**File:** `src/components/OptimizedImage.tsx`
```typescript
import React, { useState } from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  srcSet?: string;
  placeholder?: string;
  priority?: boolean;
  className?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  srcSet,
  placeholder,
  priority = false,
  className = '',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* Placeholder blur */}
      {placeholder && !isLoaded && (
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-lg"
          style={{ backgroundImage: `url(${placeholder})` }}
        />
      )}

      {/* Main image */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        quality={90}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoadingComplete={() => setIsLoaded(true)}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
};
```

---

## 4. CDN Setup

### 4.1 Cloudflare Configuration

**File:** `deployment/cdn/cloudflare-config.json`
```json
{
  "name": "Social Selling CDN",
  "type": "cloudflare",
  "settings": {
    "cache": {
      "browser_cache_ttl": 31536000,
      "cache_level": "aggressive",
      "development_mode": false,
      "edge_cache_ttl": 2592000
    },
    "compression": {
      "brotli": true,
      "gzip": true
    },
    "security": {
      "always_use_https": true,
      "automatic_https_rewrites": true,
      "min_tls_version": "1.2",
      "ssl": "full_strict",
      "waf": true
    },
    "performance": {
      "auto_minify": {
        "css": true,
        "html": true,
        "js": true
      },
      "early_hints": true,
      "http2": true,
      "http3": true,
      "image_resizing": true,
      "polish": "lossless",
      "rocket_loader": false,
      "webp": true
    },
    "page_rules": [
      {
        "targets": ["/api/*"],
        "actions": {
          "cache_level": "bypass"
        }
      },
      {
        "targets": ["/static/*"],
        "actions": {
          "cache_level": "cache_everything",
          "edge_cache_ttl": 31536000,
          "browser_cache_ttl": 31536000
        }
      },
      {
        "targets": ["/images/*"],
        "actions": {
          "cache_level": "cache_everything",
          "edge_cache_ttl": 2592000,
          "browser_cache_ttl": 2592000,
          "polish": "lossless"
        }
      }
    ]
  }
}
```

### 4.2 CDN Configuration Script

**File:** `deployment/scripts/setup-cdn.sh`
```bash
#!/bin/bash
set -euo pipefail

DOMAIN="${1:-yourdomain.com}"
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
CLOUDFLARE_ZONE_ID="${CLOUDFLARE_ZONE_ID:-}"

if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$CLOUDFLARE_ZONE_ID" ]; then
    echo "Error: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID must be set"
    exit 1
fi

echo "========================================="
echo "CDN Configuration"
echo "Domain: $DOMAIN"
echo "========================================="

# Enable Always Use HTTPS
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/always_use_https" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"value":"on"}'

# Enable Auto Minify
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/minify" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"value":{"css":"on","html":"on","js":"on"}}'

# Enable Brotli
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/brotli" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"value":"on"}'

# Enable HTTP/3
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/http3" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"value":"on"}'

# Enable Early Hints
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/early_hints" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"value":"on"}'

# Create Page Rules
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/pagerules" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{
        "targets": [{"target":"url","constraint":{"operator":"matches","value":"*'$DOMAIN'/static/*"}}],
        "actions": [
            {"id":"cache_level","value":"cache_everything"},
            {"id":"edge_cache_ttl","value":31536000},
            {"id":"browser_cache_ttl","value":31536000}
        ],
        "priority": 1,
        "status": "active"
    }'

echo "========================================="
echo "CDN configuration completed!"
echo "========================================="
```

---

## 5. Compression

### 5.1 Nginx Compression Configuration

**File:** `deployment/nginx/compression.conf`
```nginx
# Gzip compression
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/json
    application/javascript
    application/xml+rss
    application/rss+xml
    application/atom+xml
    image/svg+xml
    application/x-font-ttf
    application/x-font-opentype
    application/vnd.ms-fontobject;
gzip_min_length 1024;
gzip_buffers 16 8k;
gzip_http_version 1.1;

# Brotli compression (requires ngx_brotli module)
brotli on;
brotli_comp_level 6;
brotli_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/json
    application/javascript
    application/xml+rss
    application/rss+xml
    application/atom+xml
    image/svg+xml
    application/x-font-ttf
    application/x-font-opentype
    application/vnd.ms-fontobject;
brotli_min_length 1024;
```

### 5.2 Express Compression Middleware

**File:** `src/middleware/compression.middleware.ts`
```typescript
import compression from 'compression';
import { Request, Response } from 'express';

export const compressionMiddleware = compression({
  filter: (req: Request, res: Response) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Use compression filter function
    return compression.filter(req, res);
  },
  level: 6, // Compression level (0-9)
  threshold: 1024, // Only compress responses larger than 1KB
  memLevel: 8,
});
```

---

## 6. Database Connection Pooling

### 6.1 TypeORM Pool Configuration

**File:** `src/config/database.config.ts`
```typescript
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService
): TypeOrmModuleOptions => {
  const isProduction = configService.get('NODE_ENV') === 'production';

  return {
    type: 'postgres',
    url: configService.get('DATABASE_URL'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: !isProduction,

    // Connection pooling
    extra: {
      max: 20, // Maximum number of clients in the pool
      min: 5, // Minimum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30s
      connectionTimeoutMillis: 10000, // Return error after 10s if unable to connect

      // Statement timeout
      statement_timeout: 30000, // 30 seconds

      // Connection keepalive
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,

      // Application name for monitoring
      application_name: 'social-selling',
    },

    // Connection retry
    retryAttempts: 5,
    retryDelay: 3000,

    // Cache
    cache: {
      type: 'redis',
      options: {
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        password: configService.get('REDIS_PASSWORD'),
        db: configService.get('REDIS_CACHE_DB', 1),
      },
      duration: 60000, // 1 minute default cache
    },
  };
};
```

---

## 7. Query Result Caching

### 7.1 Repository with Caching

**File:** `src/repositories/cached-product.repository.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { CacheService } from '../services/cache.service';
import { CacheKeys, CacheTTL } from '../constants/cache-keys';

@Injectable()
export class CachedProductRepository {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private cacheService: CacheService
  ) {}

  async findById(id: string): Promise<Product | null> {
    const cacheKey = CacheKeys.PRODUCT_BY_ID(id);

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.productRepository.findOne({ where: { id } }),
      CacheTTL.THIRTY_MINUTES
    );
  }

  async findWithCache(options: any): Promise<Product[]> {
    // Generate cache key from options
    const cacheKey = `products:${JSON.stringify(options)}`;

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.productRepository.find(options),
      CacheTTL.FIFTEEN_MINUTES
    );
  }

  async update(id: string, data: Partial<Product>): Promise<Product> {
    const product = await this.productRepository.save({ id, ...data });

    // Invalidate cache
    await this.cacheService.del(CacheKeys.PRODUCT_BY_ID(id));
    await this.cacheService.delPattern('products:*');

    return product;
  }
}
```

---

## 8. Load Testing

### 8.1 K6 Load Test Scripts

**File:** `tests/load/api-load-test.js`
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp-up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp-up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 500 }, // Ramp-up to 500 users
    { duration: '5m', target: 500 }, // Stay at 500 users
    { duration: '2m', target: 0 },   // Ramp-down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'], // Error rate < 1%
    errors: ['rate<0.05'], // Custom error rate < 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Test homepage
  let res = http.get(`${BASE_URL}/`);
  check(res, {
    'homepage status 200': (r) => r.status === 200,
    'homepage response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Test API health
  res = http.get(`${BASE_URL}/api/health`);
  check(res, {
    'health status 200': (r) => r.status === 200,
    'health response time < 100ms': (r) => r.timings.duration < 100,
  }) || errorRate.add(1);

  sleep(1);

  // Test product listing
  res = http.get(`${BASE_URL}/api/products?page=1&limit=20`);
  check(res, {
    'products status 200': (r) => r.status === 200,
    'products response time < 300ms': (r) => r.timings.duration < 300,
    'products has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.length > 0;
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(2);

  // Test product search
  const searchTerms = ['phone', 'laptop', 'camera', 'watch', 'headphones'];
  const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];

  res = http.get(`${BASE_URL}/api/products/search?q=${term}`);
  check(res, {
    'search status 200': (r) => r.status === 200,
    'search response time < 400ms': (r) => r.timings.duration < 400,
  }) || errorRate.add(1);

  sleep(2);
}

// Setup function
export function setup() {
  console.log('Starting load test...');
  console.log(`Target: ${BASE_URL}`);
}

// Teardown function
export function teardown(data) {
  console.log('Load test completed!');
}
```

### 8.2 Artillery Load Test

**File:** `tests/load/artillery-config.yml`
```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 120
      arrivalRate: 100
      name: "Spike test"
  processor: "./load-test-processor.js"
  variables:
    userIds:
      - "user1"
      - "user2"
      - "user3"
  plugins:
    expect: {}
    metrics-by-endpoint: {}

scenarios:
  - name: "Browse products"
    weight: 40
    flow:
      - get:
          url: "/"
          expect:
            - statusCode: 200
            - contentType: text/html
      - get:
          url: "/api/products?page=1&limit=20"
          expect:
            - statusCode: 200
            - hasProperty: data
      - think: 3
      - get:
          url: "/api/products/{{ $randomString() }}"
          expect:
            - statusCode: [200, 404]

  - name: "Search products"
    weight: 30
    flow:
      - get:
          url: "/api/products/search?q={{ $randomString() }}"
          expect:
            - statusCode: 200
      - think: 2

  - name: "View product details"
    weight: 20
    flow:
      - get:
          url: "/api/products"
      - get:
          url: "/api/products/{{ productId }}"
          beforeRequest: "setProductId"
          expect:
            - statusCode: 200
      - think: 5

  - name: "User authentication"
    weight: 10
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "password123"
          expect:
            - statusCode: [200, 401]
      - think: 1
```

### 8.3 Load Test Runner Script

**File:** `deployment/scripts/run-load-tests.sh`
```bash
#!/bin/bash
set -euo pipefail

TEST_TYPE="${1:-k6}"
TARGET_URL="${2:-http://localhost:3000}"
DURATION="${3:-5m}"
VUS="${4:-100}"

echo "========================================="
echo "Load Testing"
echo "Type: $TEST_TYPE"
echo "Target: $TARGET_URL"
echo "Duration: $DURATION"
echo "Virtual Users: $VUS"
echo "========================================="

export BASE_URL=$TARGET_URL

case $TEST_TYPE in
  k6)
    echo "Running k6 load test..."
    k6 run \
      --vus $VUS \
      --duration $DURATION \
      --out json=load-test-results.json \
      tests/load/api-load-test.js
    ;;

  artillery)
    echo "Running Artillery load test..."
    artillery run \
      --target $TARGET_URL \
      --output load-test-results.json \
      tests/load/artillery-config.yml

    # Generate HTML report
    artillery report load-test-results.json \
      --output load-test-report.html
    ;;

  *)
    echo "Unknown test type: $TEST_TYPE"
    echo "Available types: k6, artillery"
    exit 1
    ;;
esac

echo "========================================="
echo "Load test completed!"
echo "Results: load-test-results.json"
echo "========================================="
```

---

## 9. Performance Monitoring

### 9.1 Performance Metrics Collector

**File:** `src/services/performance-metrics.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as promClient from 'prom-client';

@Injectable()
export class PerformanceMetricsService {
  private httpRequestDuration: promClient.Histogram;
  private httpRequestTotal: promClient.Counter;
  private dbQueryDuration: promClient.Histogram;
  private cacheHitRate: promClient.Counter;

  constructor(
    @InjectDataSource()
    private dataSource: DataSource
  ) {
    this.initializeMetrics();
  }

  private initializeMetrics() {
    // HTTP request duration
    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_ms',
      help: 'Duration of HTTP requests in ms',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
    });

    // HTTP request counter
    this.httpRequestTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    // Database query duration
    this.dbQueryDuration = new promClient.Histogram({
      name: 'db_query_duration_ms',
      help: 'Duration of database queries in ms',
      labelNames: ['operation'],
      buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
    });

    // Cache hit rate
    this.cacheHitRate = new promClient.Counter({
      name: 'cache_requests_total',
      help: 'Total number of cache requests',
      labelNames: ['result'], // hit or miss
    });
  }

  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number
  ) {
    this.httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      duration
    );
    this.httpRequestTotal.inc({ method, route, status_code: statusCode });
  }

  recordDbQuery(operation: string, duration: number) {
    this.dbQueryDuration.observe({ operation }, duration);
  }

  recordCacheHit() {
    this.cacheHitRate.inc({ result: 'hit' });
  }

  recordCacheMiss() {
    this.cacheHitRate.inc({ result: 'miss' });
  }

  async getMetrics(): Promise<string> {
    return promClient.register.metrics();
  }

  async getDatabaseMetrics() {
    const [stats] = await this.dataSource.query(`
      SELECT
        numbackends as active_connections,
        xact_commit as transactions_committed,
        xact_rollback as transactions_rolled_back,
        blks_read as blocks_read,
        blks_hit as blocks_hit,
        tup_returned as tuples_returned,
        tup_fetched as tuples_fetched,
        tup_inserted as tuples_inserted,
        tup_updated as tuples_updated,
        tup_deleted as tuples_deleted
      FROM pg_stat_database
      WHERE datname = current_database()
    `);

    return stats;
  }
}
```

### 9.2 Performance Monitoring Dashboard

**File:** `src/controllers/metrics.controller.ts`
```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { PerformanceMetricsService } from '../services/performance-metrics.service';
import { AdminGuard } from '../guards/admin.guard';

@Controller('metrics')
@UseGuards(AdminGuard)
export class MetricsController {
  constructor(
    private performanceMetricsService: PerformanceMetricsService
  ) {}

  @Get()
  async getMetrics(): Promise<string> {
    return this.performanceMetricsService.getMetrics();
  }

  @Get('database')
  async getDatabaseMetrics() {
    return this.performanceMetricsService.getDatabaseMetrics();
  }

  @Get('performance')
  async getPerformanceStats() {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    return {
      uptime,
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
      },
      cpu: process.cpuUsage(),
    };
  }
}
```

---

## 10. Optimization Checklist

### 10.1 Pre-Deployment Checklist

**File:** `deployment/checklists/performance-optimization.md`
```markdown
# Performance Optimization Checklist

## Database Optimization
- [ ] All tables have appropriate indexes
- [ ] Foreign keys are indexed
- [ ] Composite indexes created for common query patterns
- [ ] Full-text search indexes configured
- [ ] Partial indexes for filtered queries
- [ ] Query plans analyzed with EXPLAIN
- [ ] Slow query log reviewed
- [ ] Database connection pooling configured
- [ ] Statement timeout set
- [ ] Vacuum and analyze scheduled

## Caching Strategy
- [ ] Redis installed and configured
- [ ] Cache service implemented
- [ ] Cache keys strategy defined
- [ ] TTL values optimized
- [ ] Cache invalidation strategy implemented
- [ ] Session storage migrated to Redis
- [ ] API response caching enabled
- [ ] Database query result caching enabled
- [ ] Cache hit/miss metrics tracked

## Image Optimization
- [ ] Image processing service implemented
- [ ] Multiple image sizes generated
- [ ] WebP format conversion enabled
- [ ] Image compression optimized
- [ ] Lazy loading implemented
- [ ] Responsive images with srcset
- [ ] Blur placeholder generated
- [ ] Images stored on CDN
- [ ] Image optimization tested

## CDN Configuration
- [ ] CDN provider selected
- [ ] DNS configured for CDN
- [ ] SSL certificate installed on CDN
- [ ] Cache rules configured
- [ ] Static assets routed through CDN
- [ ] Image optimization enabled
- [ ] Compression enabled (Gzip/Brotli)
- [ ] Cache purge strategy defined
- [ ] CDN performance tested

## Compression
- [ ] Gzip compression enabled
- [ ] Brotli compression enabled
- [ ] Compression levels optimized
- [ ] MIME types configured
- [ ] Minimum compression size set
- [ ] Compression middleware installed
- [ ] Response sizes verified

## Application Performance
- [ ] N+1 query problems resolved
- [ ] Eager loading configured
- [ ] Pagination implemented
- [ ] Rate limiting configured
- [ ] Request throttling enabled
- [ ] API response times < 200ms (p95)
- [ ] Database query times < 50ms (p95)
- [ ] Memory leaks checked
- [ ] CPU usage optimized

## Load Testing
- [ ] Load test scenarios defined
- [ ] k6/Artillery installed
- [ ] Baseline performance measured
- [ ] Load tests executed
- [ ] Results analyzed
- [ ] Bottlenecks identified
- [ ] Optimizations applied
- [ ] Load tests re-run
- [ ] Performance targets met

## Monitoring
- [ ] Prometheus metrics exposed
- [ ] Performance dashboard created
- [ ] Database metrics tracked
- [ ] Cache metrics tracked
- [ ] Response time alerts configured
- [ ] Error rate alerts configured
- [ ] Resource usage monitored
- [ ] APM tool integrated

## Frontend Performance
- [ ] Code splitting implemented
- [ ] Tree shaking configured
- [ ] Bundle size optimized
- [ ] Lazy loading components
- [ ] Service worker configured
- [ ] Static assets cached
- [ ] Font loading optimized
- [ ] Critical CSS inlined
- [ ] Lighthouse score > 90

## API Performance
- [ ] GraphQL dataloader implemented
- [ ] REST API pagination
- [ ] Field filtering support
- [ ] Partial response support
- [ ] ETag caching
- [ ] CORS optimized
- [ ] WebSocket connection pooling
- [ ] Rate limiting per endpoint
```

---

## Acceptance Criteria

### Must Have (25+ criteria)

1. ✅ Database indexes created for all common queries
2. ✅ Query execution time < 50ms for 95% of queries
3. ✅ Redis caching implemented for sessions
4. ✅ Redis caching implemented for API responses
5. ✅ Cache hit rate > 80%
6. ✅ Image processing service generating multiple sizes
7. ✅ WebP format conversion working
8. ✅ Image compression reducing file sizes by 60%+
9. ✅ CDN configured and serving static assets
10. ✅ CDN cache hit rate > 90%
11. ✅ Gzip compression enabled on all text responses
12. ✅ Brotli compression enabled
13. ✅ Database connection pool configured (20 max)
14. ✅ Connection pooling reducing connection overhead
15. ✅ Query result caching reducing database load
16. ✅ Load tests completed with 500 concurrent users
17. ✅ API response time < 200ms (p95)
18. ✅ API response time < 500ms (p99)
19. ✅ Error rate < 0.1% under load
20. ✅ Performance metrics exposed for Prometheus
21. ✅ Database performance dashboard created
22. ✅ Application performance dashboard created
23. ✅ Page load time < 2 seconds
24. ✅ Time to Interactive < 3.5 seconds
25. ✅ Lighthouse performance score > 90
26. ✅ Load test reports documented
27. ✅ Performance optimization guide created

### Should Have

- Advanced query optimization with materialized views
- Read replicas for database scaling
- GraphQL query complexity analysis
- Advanced image formats (AVIF)
- Multi-region CDN distribution

### Could Have

- Database sharding strategy
- Elasticsearch for advanced search
- Service worker for offline support
- HTTP/3 support
- Edge computing with Cloudflare Workers

---

## Dependencies

### Requires
- DEPLOY-002: Production deployment complete
- All backend and frontend features complete
- Database schema finalized

### Blocks
- DEPLOY-004: Monitoring & alerting
- DEPLOY-005: Documentation & handoff

---

## Technical Notes

### Database Optimization
- Use EXPLAIN ANALYZE for all slow queries
- Create indexes concurrently to avoid locks
- Monitor index usage with pg_stat_user_indexes
- Regular VACUUM and ANALYZE

### Caching Strategy
- Cache invalidation is critical
- Use appropriate TTL values
- Monitor cache memory usage
- Implement cache warming for critical data

### Image Optimization
- Always generate multiple sizes
- Use WebP with JPEG fallback
- Implement lazy loading
- Consider using CDN image optimization

---

## Testing Strategy

### Performance Tests
- Baseline performance measurement
- Load testing with increasing users
- Stress testing to find breaking points
- Spike testing for sudden traffic
- Soak testing for memory leaks

### Monitoring Tests
- Verify metrics collection
- Test alert triggers
- Validate dashboard accuracy
- Check metric retention

---

## Documentation Requirements

- [x] Database optimization guide
- [x] Caching strategy documentation
- [x] Image optimization guide
- [x] CDN configuration guide
- [x] Load testing procedures
- [x] Performance monitoring guide
- [x] Optimization checklist
- [x] Performance benchmarks

---

## Definition of Done

- [ ] All database indexes created and tested
- [ ] Redis caching fully implemented
- [ ] Image optimization pipeline working
- [ ] CDN configured and tested
- [ ] Compression enabled and verified
- [ ] Connection pooling optimized
- [ ] Load tests passing performance targets
- [ ] Performance monitoring operational
- [ ] Optimization checklist completed
- [ ] Performance documentation complete
- [ ] Team trained on optimization procedures

---

**Task ID:** DEPLOY-003
**Created:** 2025-01-18
**Epic:** Epic 13 - Deployment & DevOps
**Sprint:** Deployment Sprint
**Estimated Hours:** 50-70 hours
**Actual Hours:** _TBD_

# INFRA-004: Redis Cache Configuration

**Priority:** P0 (Critical Path)
**Effort:** 2 hours
**Day:** 2
**Dependencies:** INFRA-002
**Domain:** Infrastructure & DevOps

---

## Overview

Configure Redis 7 as the caching layer and queue backend for session storage, API response caching, and BullMQ job queues. Includes password authentication, eviction policies, and connection pooling.

---

## Data Models

### Redis Configuration

```yaml
# Redis Server Configuration
redis:
  host: redis
  port: 6379
  password: <from_env>
  db: 0  # Default database
  maxRetriesPerRequest: 3
  enableReadyCheck: true

# Cache Configuration
cache:
  ttl: 3600  # 1 hour default
  maxmemory: 256mb
  maxmemory_policy: allkeys-lru

# Persistence (optional for MVP)
persistence:
  enabled: false  # Pure cache mode for MVP
  appendonly: no
```

### Cache Key Patterns

```typescript
// Session keys
`session:${userId}:${sessionId}`

// OAuth state keys
`oauth:instagram:state:${stateToken}`

// API cache keys
`api:instagram:profile:${accountId}`
`api:instagram:media:${accountId}:${page}`
`api:analytics:overview:${accountId}`

// Rate limit keys
`ratelimit:${endpoint}:${userId}:${minute}`

// Queue keys (BullMQ)
`bull:post-publishing:*`
`bull:webhook-processing:*`
`bull:analytics-refresh:*`
```

---

## Implementation Approach

### Phase 1: Redis Service Wrapper (1 hour)

```typescript
// File: /backend/src/infrastructure/cache/redis.service.ts

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Redis as RedisClient } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClient;
  private readonly defaultTTL = 3600; // 1 hour

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: 0,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
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
      console.log('Redis connected');
    });

    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });
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
    } catch (error) {
      return false;
    }
  }

  // Get raw client for BullMQ
  getClient(): RedisClient {
    return this.client;
  }
}
```

### Phase 2: Cache Module (30 minutes)

```typescript
// File: /backend/src/infrastructure/cache/cache.module.ts

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class CacheModule {}
```

```typescript
// File: /backend/src/infrastructure/cache/cache.interceptor.ts

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from './redis.service';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private readonly redis: RedisService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = this.generateCacheKey(request);

    // Try to get from cache
    const cachedData = await this.redis.get(cacheKey);
    if (cachedData) {
      return of(JSON.parse(cachedData));
    }

    // Execute handler and cache result
    return next.handle().pipe(
      tap(async (data) => {
        await this.redis.set(cacheKey, JSON.stringify(data), 3600);
      }),
    );
  }

  private generateCacheKey(request: any): string {
    const { url, method, user } = request;
    return `api:${method}:${url}:${user?.id || 'anonymous'}`;
  }
}
```

### Phase 3: Testing and Verification (30 minutes)

```typescript
// File: /backend/src/infrastructure/cache/redis.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                REDIS_HOST: 'localhost',
                REDIS_PORT: 6379,
                REDIS_PASSWORD: 'test',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should set and get value', async () => {
    await service.set('test-key', 'test-value', 60);
    const value = await service.get('test-key');
    expect(value).toBe('test-value');
  });

  it('should check key exists', async () => {
    await service.set('exists-key', 'value', 60);
    const exists = await service.exists('exists-key');
    expect(exists).toBe(true);
  });

  it('should delete key', async () => {
    await service.set('delete-key', 'value', 60);
    await service.del('delete-key');
    const exists = await service.exists('delete-key');
    expect(exists).toBe(false);
  });

  it('should increment counter', async () => {
    const count1 = await service.incr('counter');
    const count2 = await service.incr('counter');
    expect(count2).toBe(count1 + 1);
  });

  it('should be healthy', async () => {
    const healthy = await service.isHealthy();
    expect(healthy).toBe(true);
  });
});
```

---

## Files to Create

```
/backend/src/infrastructure/cache/
├── cache.module.ts
├── redis.service.ts
├── cache.interceptor.ts
└── redis.service.spec.ts
```

---

## Dependencies

**Prerequisites:**
- INFRA-002 (Docker Compose with Redis container)
- Redis container running on port 6379

**Blocks:**
- BE-006 (Session Management)
- WORKER-001, WORKER-002, WORKER-003 (BullMQ Workers)
- All caching functionality

---

## Acceptance Criteria

- [ ] Redis container running and accessible
- [ ] RedisService connects successfully
- [ ] Can set and get values
- [ ] Can delete keys
- [ ] TTL expiration working
- [ ] Increment/decrement operations working
- [ ] Health check returns true
- [ ] Connection retries on failure
- [ ] Password authentication working
- [ ] Can get raw client for BullMQ
- [ ] Cache interceptor working for API routes
- [ ] All unit tests passing

---

## Testing Procedure

```bash
# 1. Test Redis connection
docker compose exec redis redis-cli -a ${REDIS_PASSWORD} ping

# Expected: PONG

# 2. Set test value
docker compose exec redis redis-cli -a ${REDIS_PASSWORD} SET test-key "test-value"

# Expected: OK

# 3. Get test value
docker compose exec redis redis-cli -a ${REDIS_PASSWORD} GET test-key

# Expected: "test-value"

# 4. Test from backend
cd backend
npm run start:dev
curl http://localhost:4000/health

# Expected: {"redis":"up"}

# 5. Test cache interceptor
curl http://localhost:4000/api/some-cached-endpoint
# First call: slow (cache miss)
# Second call: fast (cache hit)

# 6. Monitor Redis
docker compose exec redis redis-cli -a ${REDIS_PASSWORD} MONITOR

# Expected: Real-time command monitoring

# 7. Check memory usage
docker compose exec redis redis-cli -a ${REDIS_PASSWORD} INFO memory

# Expected: Memory statistics
```

---

## Security Considerations

1. **Password Authentication:** Always use strong password
2. **Network Isolation:** Redis only accessible within Docker network
3. **Disable Dangerous Commands:** CONFIG, FLUSHALL in production
4. **Key Expiration:** Always set TTL to prevent unbounded growth
5. **No Sensitive Data:** Don't cache passwords or tokens unencrypted
6. **TLS Encryption:** Enable for production if needed

---

## Cost Estimate

- **Redis (Docker Image):** Free
- **Memory Usage:** < 256MB (included in VPS RAM)
- **Time Investment:** 2 hours
- **Total Additional Cost:** $0

---

## Related Documents

- Architecture Design: `/tasks/social-selling/architecture-design.md`
- Previous Task: INFRA-002
- Next Tasks: BE-006, WORKER-001, WORKER-002, WORKER-003

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'redis') {
          return {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            password: process.env.REDIS_PASSWORD || 'changeme123!@#',
          };
        }
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    // Clean up test keys
    const testKeys = await service.keys('test:*');
    if (testKeys.length > 0) {
      await Promise.all(testKeys.map((key) => service.del(key)));
    }
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Basic Operations', () => {
    it('should set and get value', async () => {
      const key = 'test:set-get';
      const value = 'test-value';

      await service.set(key, value, 60);
      const result = await service.get(key);

      expect(result).toBe(value);
    });

    it('should set value with default TTL', async () => {
      const key = 'test:set-default-ttl';
      const value = 'test-value';

      await service.set(key, value);
      const result = await service.get(key);

      expect(result).toBe(value);

      // Check that TTL is set (should be around 3600 seconds)
      const ttl = await service.ttl(key);
      expect(ttl).toBeGreaterThan(3500);
      expect(ttl).toBeLessThanOrEqual(3600);
    });

    it('should check if key exists', async () => {
      const key = 'test:exists';

      await service.set(key, 'value', 60);
      const exists = await service.exists(key);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const exists = await service.exists('test:non-existent');
      expect(exists).toBe(false);
    });

    it('should delete key', async () => {
      const key = 'test:delete';

      await service.set(key, 'value', 60);
      await service.del(key);
      const exists = await service.exists(key);

      expect(exists).toBe(false);
    });

    it('should increment counter', async () => {
      const key = 'test:counter';

      const count1 = await service.incr(key);
      const count2 = await service.incr(key);
      const count3 = await service.incr(key);

      expect(count1).toBe(1);
      expect(count2).toBe(2);
      expect(count3).toBe(3);
    });

    it('should set expiration on existing key', async () => {
      const key = 'test:expire';

      await service.set(key, 'value', 3600);
      const result = await service.expire(key, 60);

      expect(result).toBe(true);

      const ttl = await service.ttl(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it('should get TTL of key', async () => {
      const key = 'test:ttl';
      const expectedTTL = 120;

      await service.set(key, 'value', expectedTTL);
      const ttl = await service.ttl(key);

      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(expectedTTL);
    });
  });

  describe('Hash Operations', () => {
    it('should set and get hash field', async () => {
      const key = 'test:hash';
      const field = 'field1';
      const value = 'value1';

      await service.hset(key, field, value);
      const result = await service.hget(key, field);

      expect(result).toBe(value);
    });

    it('should get all hash fields', async () => {
      const key = 'test:hash-all';

      await service.hset(key, 'field1', 'value1');
      await service.hset(key, 'field2', 'value2');
      await service.hset(key, 'field3', 'value3');

      const result = await service.hgetall(key);

      expect(result).toEqual({
        field1: 'value1',
        field2: 'value2',
        field3: 'value3',
      });
    });
  });

  describe('Key Pattern Matching', () => {
    it('should find keys by pattern', async () => {
      await service.set('test:pattern:1', 'value1', 60);
      await service.set('test:pattern:2', 'value2', 60);
      await service.set('test:other:3', 'value3', 60);

      const keys = await service.keys('test:pattern:*');

      expect(keys.length).toBe(2);
      expect(keys).toContain('test:pattern:1');
      expect(keys).toContain('test:pattern:2');
    });
  });

  describe('Health Check', () => {
    it('should return true when Redis is healthy', async () => {
      const healthy = await service.isHealthy();
      expect(healthy).toBe(true);
    });
  });

  describe('Raw Client', () => {
    it('should provide raw Redis client', () => {
      const client = service.getClient();
      expect(client).toBeDefined();
      expect(typeof client.ping).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent key gracefully', async () => {
      const result = await service.get('test:non-existent');
      expect(result).toBeNull();
    });

    it('should handle delete of non-existent key', async () => {
      const result = await service.del('test:non-existent');
      expect(result).toBe(0);
    });
  });
});

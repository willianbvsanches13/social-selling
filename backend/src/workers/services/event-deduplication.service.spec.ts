import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  EventDeduplicationService,
  WebhookEventType,
} from './event-deduplication.service';
import { RedisService } from '../../infrastructure/cache/redis.service';

describe('EventDeduplicationService', () => {
  let service: EventDeduplicationService;
  let redisService: RedisService;
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
        EventDeduplicationService,
        RedisService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EventDeduplicationService>(EventDeduplicationService);
    redisService = module.get<RedisService>(RedisService);
    await redisService.onModuleInit();
  });

  afterEach(async () => {
    // Clean up test keys
    await service.clearAll();
    await redisService.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Duplicate Detection', () => {
    it('should detect first event as not duplicate', async () => {
      const payload = {
        id: 'comment123',
        text: 'Test comment',
        from: { id: 'user123' },
      };

      const isDuplicate = await service.isDuplicate(
        WebhookEventType.COMMENT,
        'comment123',
        payload,
      );

      expect(isDuplicate).toBe(false);
    });

    it('should detect duplicate event within window', async () => {
      const payload = {
        id: 'comment123',
        text: 'Test comment',
        from: { id: 'user123' },
      };

      // First event
      await service.isDuplicate(
        WebhookEventType.COMMENT,
        'comment123',
        payload,
      );

      // Same event again - should be duplicate
      const isDuplicate = await service.isDuplicate(
        WebhookEventType.COMMENT,
        'comment123',
        payload,
      );

      expect(isDuplicate).toBe(true);
    });

    it('should not detect duplicate for different event IDs', async () => {
      const payload1 = {
        id: 'comment123',
        text: 'Test comment',
        from: { id: 'user123' },
      };

      const payload2 = {
        id: 'comment456',
        text: 'Test comment',
        from: { id: 'user123' },
      };

      await service.isDuplicate(
        WebhookEventType.COMMENT,
        'comment123',
        payload1,
      );

      const isDuplicate = await service.isDuplicate(
        WebhookEventType.COMMENT,
        'comment456',
        payload2,
      );

      expect(isDuplicate).toBe(false);
    });

    it('should not detect duplicate for different event types', async () => {
      const payload = {
        id: 'event123',
        text: 'Test content',
        from: { id: 'user123' },
      };

      await service.isDuplicate(WebhookEventType.COMMENT, 'event123', payload);

      const isDuplicate = await service.isDuplicate(
        WebhookEventType.MESSAGE,
        'event123',
        payload,
      );

      expect(isDuplicate).toBe(false);
    });

    it('should detect duplicate for same content with different timestamps', async () => {
      const payload1 = {
        id: 'comment123',
        text: 'Test comment',
        timestamp: '2025-01-01T00:00:00Z',
        from: { id: 'user123' },
      };

      const payload2 = {
        id: 'comment123',
        text: 'Test comment',
        timestamp: '2025-01-01T00:01:00Z', // Different timestamp
        from: { id: 'user123' },
      };

      await service.isDuplicate(
        WebhookEventType.COMMENT,
        'comment123',
        payload1,
      );

      // Should still be duplicate because critical fields match
      const isDuplicate = await service.isDuplicate(
        WebhookEventType.COMMENT,
        'comment123',
        payload2,
      );

      expect(isDuplicate).toBe(true);
    });
  });

  describe('Processing Tracking', () => {
    it('should mark event as processed', async () => {
      await service.markAsProcessed(WebhookEventType.COMMENT, 'comment123');

      const wasProcessed = await service.wasProcessed(
        WebhookEventType.COMMENT,
        'comment123',
      );

      expect(wasProcessed).toBe(true);
    });

    it('should return false for unprocessed event', async () => {
      const wasProcessed = await service.wasProcessed(
        WebhookEventType.COMMENT,
        'comment999',
      );

      expect(wasProcessed).toBe(false);
    });
  });

  describe('Clear All', () => {
    it('should clear all deduplication keys', async () => {
      const payload = {
        id: 'comment123',
        text: 'Test comment',
        from: { id: 'user123' },
      };

      // Create some deduplication entries
      await service.isDuplicate(
        WebhookEventType.COMMENT,
        'comment123',
        payload,
      );
      await service.markAsProcessed(WebhookEventType.COMMENT, 'comment123');

      // Clear all
      await service.clearAll();

      // Should no longer be duplicate or processed
      const isDuplicate = await service.isDuplicate(
        WebhookEventType.COMMENT,
        'comment123',
        payload,
      );
      const wasProcessed = await service.wasProcessed(
        WebhookEventType.COMMENT,
        'comment123',
      );

      expect(isDuplicate).toBe(false);
      expect(wasProcessed).toBe(false);
    });
  });

  describe('Event Type Specific Hashing', () => {
    it('should handle message events correctly', async () => {
      const payload = {
        id: 'msg123',
        message: { text: 'Hello' },
        from: { id: 'user123' },
        timestamp: '2025-01-01T00:00:00Z',
      };

      const isDuplicate = await service.isDuplicate(
        WebhookEventType.MESSAGE,
        'msg123',
        payload,
      );

      expect(isDuplicate).toBe(false);
    });

    it('should handle mention events correctly', async () => {
      const payload = {
        media_id: 'media123',
        comment_id: 'comment123',
        timestamp: '2025-01-01T00:00:00Z',
      };

      const isDuplicate = await service.isDuplicate(
        WebhookEventType.MENTION,
        'mention123',
        payload,
      );

      expect(isDuplicate).toBe(false);
    });

    it('should handle story insight events correctly', async () => {
      const payload = {
        media_id: 'media123',
        metric: 'impressions',
        value: 100,
        timestamp: '2025-01-01T00:00:00Z',
      };

      const isDuplicate = await service.isDuplicate(
        WebhookEventType.STORY_INSIGHT,
        'insight123',
        payload,
      );

      expect(isDuplicate).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should fail open on Redis error', async () => {
      // Close Redis connection to simulate error
      await redisService.onModuleDestroy();

      const payload = {
        id: 'comment123',
        text: 'Test comment',
        from: { id: 'user123' },
      };

      // Should return false (allow processing) instead of throwing
      const isDuplicate = await service.isDuplicate(
        WebhookEventType.COMMENT,
        'comment123',
        payload,
      );

      expect(isDuplicate).toBe(false);

      // Reconnect for cleanup
      await redisService.onModuleInit();
    });
  });
});

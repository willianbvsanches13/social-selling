import { Test, TestingModule } from '@nestjs/testing';
import { MessageRepository } from './message.repository';
import { Database } from '../database';
import {
  Message,
  MessageType,
  SenderType,
} from '../../../domain/entities/message.entity';

describe('MessageRepository', () => {
  let repository: MessageRepository;
  let mockDatabase: Partial<Database>;

  beforeEach(async () => {
    mockDatabase = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageRepository,
        {
          provide: Database,
          useValue: mockDatabase,
        },
      ],
    }).compile();

    repository = module.get<MessageRepository>(MessageRepository);
  });

  describe('create', () => {
    it('should create a new text message', async () => {
      const message = Message.create({
        conversationId: 'conv-123',
        platformMessageId: 'platform-msg-456',
        senderType: SenderType.CUSTOMER,
        senderPlatformId: 'sender-789',
        messageType: MessageType.TEXT,
        content: 'Hello, this is a test message',
        sentAt: new Date('2025-01-15T10:00:00Z'),
        metadata: { source: 'instagram' },
      });

      const mockRow = {
        id: message.id,
        conversation_id: 'conv-123',
        platform_message_id: 'platform-msg-456',
        sender_type: SenderType.CUSTOMER,
        sender_platform_id: 'sender-789',
        message_type: MessageType.TEXT,
        content: 'Hello, this is a test message',
        media_url: null,
        media_type: null,
        is_read: false,
        sent_at: new Date('2025-01-15T10:00:00Z'),
        delivered_at: null,
        read_at: null,
        metadata: { source: 'instagram' },
        created_at: new Date(),
      };

      (mockDatabase.query as jest.Mock).mockResolvedValue([mockRow]);

      const result = await repository.create(message);

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO messages'),
        expect.arrayContaining([
          message.id,
          'conv-123',
          'platform-msg-456',
          SenderType.CUSTOMER,
          'sender-789',
          MessageType.TEXT,
          'Hello, this is a test message',
        ]),
      );
      expect(result).toBeInstanceOf(Message);
      expect(result.id).toBe(message.id);
      expect(result.conversationId).toBe('conv-123');
      expect(result.content).toBe('Hello, this is a test message');
    });

    it('should create a media message', async () => {
      const message = Message.create({
        conversationId: 'conv-123',
        platformMessageId: 'platform-msg-456',
        senderType: SenderType.CUSTOMER,
        senderPlatformId: 'sender-789',
        messageType: MessageType.IMAGE,
        mediaUrl: 'https://example.com/image.jpg',
        mediaType: 'image/jpeg',
        sentAt: new Date(),
        metadata: {},
      });

      const mockRow = {
        id: message.id,
        conversation_id: 'conv-123',
        platform_message_id: 'platform-msg-456',
        sender_type: SenderType.CUSTOMER,
        sender_platform_id: 'sender-789',
        message_type: MessageType.IMAGE,
        content: null,
        media_url: 'https://example.com/image.jpg',
        media_type: 'image/jpeg',
        is_read: false,
        sent_at: new Date(),
        delivered_at: null,
        read_at: null,
        metadata: {},
        created_at: new Date(),
      };

      (mockDatabase.query as jest.Mock).mockResolvedValue([mockRow]);

      const result = await repository.create(message);

      expect(result).toBeInstanceOf(Message);
      expect(result.toJSON().mediaUrl).toBe('https://example.com/image.jpg');
      expect(result.toJSON().mediaType).toBe('image/jpeg');
    });
  });

  describe('findById', () => {
    it('should find message by id', async () => {
      const mockRow = {
        id: 'msg-123',
        conversation_id: 'conv-123',
        platform_message_id: 'platform-msg-456',
        sender_type: SenderType.USER,
        sender_platform_id: 'sender-789',
        message_type: MessageType.TEXT,
        content: 'Test message',
        media_url: null,
        media_type: null,
        is_read: true,
        sent_at: new Date('2025-01-15T10:00:00Z'),
        delivered_at: new Date('2025-01-15T10:01:00Z'),
        read_at: new Date('2025-01-15T10:05:00Z'),
        metadata: {},
        created_at: new Date(),
      };

      (mockDatabase.query as jest.Mock).mockResolvedValue([mockRow]);

      const result = await repository.findById('msg-123');

      expect(mockDatabase.query).toHaveBeenCalledWith(
        'SELECT * FROM messages WHERE id = $1 LIMIT 1',
        ['msg-123'],
      );
      expect(result).toBeInstanceOf(Message);
      expect(result?.id).toBe('msg-123');
      expect(result?.isRead).toBe(true);
    });

    it('should return null when message not found', async () => {
      (mockDatabase.query as jest.Mock).mockResolvedValue([]);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByPlatformId', () => {
    it('should find message by platform message id', async () => {
      const mockRow = {
        id: 'msg-123',
        conversation_id: 'conv-123',
        platform_message_id: 'platform-msg-456',
        sender_type: SenderType.CUSTOMER,
        sender_platform_id: 'sender-789',
        message_type: MessageType.TEXT,
        content: 'Test message',
        media_url: null,
        media_type: null,
        is_read: false,
        sent_at: new Date(),
        delivered_at: null,
        read_at: null,
        metadata: {},
        created_at: new Date(),
      };

      (mockDatabase.query as jest.Mock).mockResolvedValue([mockRow]);

      const result = await repository.findByPlatformId('platform-msg-456');

      expect(mockDatabase.query).toHaveBeenCalledWith(
        'SELECT * FROM messages WHERE platform_message_id = $1 LIMIT 1',
        ['platform-msg-456'],
      );
      expect(result).toBeInstanceOf(Message);
      expect(result?.toJSON().platformMessageId).toBe('platform-msg-456');
    });

    it('should return null when platform message not found', async () => {
      (mockDatabase.query as jest.Mock).mockResolvedValue([]);

      const result = await repository.findByPlatformId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByConversationId', () => {
    it('should find messages with pagination', async () => {
      const mockRows = [
        {
          id: 'msg-2',
          conversation_id: 'conv-123',
          platform_message_id: 'platform-msg-2',
          sender_type: SenderType.CUSTOMER,
          sender_platform_id: 'sender-789',
          message_type: MessageType.TEXT,
          content: 'Second message',
          media_url: null,
          media_type: null,
          is_read: false,
          sent_at: new Date('2025-01-15T10:05:00Z'),
          delivered_at: null,
          read_at: null,
          metadata: {},
          created_at: new Date(),
        },
        {
          id: 'msg-1',
          conversation_id: 'conv-123',
          platform_message_id: 'platform-msg-1',
          sender_type: SenderType.USER,
          sender_platform_id: 'sender-123',
          message_type: MessageType.TEXT,
          content: 'First message',
          media_url: null,
          media_type: null,
          is_read: true,
          sent_at: new Date('2025-01-15T10:00:00Z'),
          delivered_at: new Date('2025-01-15T10:01:00Z'),
          read_at: new Date('2025-01-15T10:02:00Z'),
          metadata: {},
          created_at: new Date(),
        },
      ];

      (mockDatabase.query as jest.Mock)
        .mockResolvedValueOnce([{ count: '2' }])
        .mockResolvedValueOnce(mockRows);

      const result = await repository.findByConversationId('conv-123', {
        limit: 10,
        offset: 0,
      });

      expect(result.total).toBe(2);
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]).toBeInstanceOf(Message);
      expect(result.messages[0].id).toBe('msg-2');
      expect(result.messages[1].id).toBe('msg-1');
    });

    it('should order messages by sent_at DESC', async () => {
      (mockDatabase.query as jest.Mock)
        .mockResolvedValueOnce([{ count: '0' }])
        .mockResolvedValueOnce([]);

      await repository.findByConversationId('conv-123');

      const calls = (mockDatabase.query as jest.Mock).mock.calls;
      const paginationQuery = calls[1][0];
      expect(paginationQuery).toContain('ORDER BY sent_at DESC');
    });

    it('should apply limit and offset correctly', async () => {
      (mockDatabase.query as jest.Mock)
        .mockResolvedValueOnce([{ count: '100' }])
        .mockResolvedValueOnce([]);

      await repository.findByConversationId('conv-123', {
        limit: 20,
        offset: 40,
      });

      const calls = (mockDatabase.query as jest.Mock).mock.calls;
      const params = calls[1][1];
      expect(params).toContain(20);
      expect(params).toContain(40);
    });

    it('should use default limit of 100 if not provided', async () => {
      (mockDatabase.query as jest.Mock)
        .mockResolvedValueOnce([{ count: '0' }])
        .mockResolvedValueOnce([]);

      await repository.findByConversationId('conv-123');

      const calls = (mockDatabase.query as jest.Mock).mock.calls;
      const params = calls[1][1];
      expect(params).toContain(100);
    });

    it('should return empty array when no messages found', async () => {
      (mockDatabase.query as jest.Mock)
        .mockResolvedValueOnce([{ count: '0' }])
        .mockResolvedValueOnce([]);

      const result = await repository.findByConversationId('conv-123');

      expect(result.total).toBe(0);
      expect(result.messages).toHaveLength(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read', async () => {
      (mockDatabase.query as jest.Mock).mockResolvedValue([]);

      await repository.markAsRead('msg-123');

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('SET is_read = TRUE'),
        ['msg-123'],
      );
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('read_at = CASE WHEN read_at IS NULL'),
        ['msg-123'],
      );
    });

    it('should not overwrite existing read_at timestamp', async () => {
      (mockDatabase.query as jest.Mock).mockResolvedValue([]);

      await repository.markAsRead('msg-123');

      const calls = (mockDatabase.query as jest.Mock).mock.calls;
      const sql = calls[0][0];
      expect(sql).toContain('CASE WHEN read_at IS NULL THEN NOW()');
      expect(sql).toContain('ELSE read_at END');
    });
  });

  describe('markAsDelivered', () => {
    it('should mark message as delivered', async () => {
      (mockDatabase.query as jest.Mock).mockResolvedValue([]);

      await repository.markAsDelivered('msg-123');

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('SET delivered_at = CASE WHEN delivered_at'),
        ['msg-123'],
      );
    });

    it('should not overwrite existing delivered_at timestamp', async () => {
      (mockDatabase.query as jest.Mock).mockResolvedValue([]);

      await repository.markAsDelivered('msg-123');

      const calls = (mockDatabase.query as jest.Mock).mock.calls;
      const sql = calls[0][0];
      expect(sql).toContain('CASE WHEN delivered_at IS NULL THEN NOW()');
      expect(sql).toContain('ELSE delivered_at END');
    });
  });

  describe('countUnread', () => {
    it('should count unread customer messages', async () => {
      (mockDatabase.query as jest.Mock).mockResolvedValue([{ count: '5' }]);

      const result = await repository.countUnread('conv-123');

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE conversation_id = $1'),
        ['conv-123'],
      );
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('AND is_read = FALSE'),
        ['conv-123'],
      );
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining("AND sender_type = 'customer'"),
        ['conv-123'],
      );
      expect(result).toBe(5);
    });

    it('should return zero when no unread messages', async () => {
      (mockDatabase.query as jest.Mock).mockResolvedValue([{ count: '0' }]);

      const result = await repository.countUnread('conv-123');

      expect(result).toBe(0);
    });

    it('should return zero when query returns empty result', async () => {
      (mockDatabase.query as jest.Mock).mockResolvedValue([]);

      const result = await repository.countUnread('conv-123');

      expect(result).toBe(0);
    });
  });

  describe('toDomain conversion', () => {
    it('should correctly convert database row to domain entity', async () => {
      const mockRow = {
        id: 'msg-123',
        conversation_id: 'conv-123',
        platform_message_id: 'platform-msg-456',
        sender_type: SenderType.CUSTOMER,
        sender_platform_id: 'sender-789',
        message_type: MessageType.TEXT,
        content: 'Test message',
        media_url: null,
        media_type: null,
        is_read: true,
        sent_at: new Date('2025-01-15T10:00:00Z'),
        delivered_at: new Date('2025-01-15T10:01:00Z'),
        read_at: new Date('2025-01-15T10:05:00Z'),
        metadata: { key: 'value' },
        created_at: new Date('2025-01-15T09:59:00Z'),
      };

      (mockDatabase.query as jest.Mock).mockResolvedValue([mockRow]);

      const result = await repository.findById('msg-123');

      expect(result).toBeInstanceOf(Message);
      expect(result?.id).toBe('msg-123');
      expect(result?.conversationId).toBe('conv-123');
      expect(result?.senderType).toBe(SenderType.CUSTOMER);
      expect(result?.content).toBe('Test message');
      expect(result?.isRead).toBe(true);
      expect(result?.toJSON().metadata).toEqual({ key: 'value' });
    });

    it('should handle null optional fields', async () => {
      const mockRow = {
        id: 'msg-123',
        conversation_id: 'conv-123',
        platform_message_id: 'platform-msg-456',
        sender_type: SenderType.USER,
        sender_platform_id: null,
        message_type: MessageType.TEXT,
        content: 'Test',
        media_url: null,
        media_type: null,
        is_read: false,
        sent_at: new Date(),
        delivered_at: null,
        read_at: null,
        metadata: {},
        created_at: new Date(),
      };

      (mockDatabase.query as jest.Mock).mockResolvedValue([mockRow]);

      const result = await repository.findById('msg-123');

      expect(result).toBeInstanceOf(Message);
      expect(result?.toJSON().senderPlatformId).toBeUndefined();
      expect(result?.toJSON().mediaUrl).toBeUndefined();
      expect(result?.toJSON().mediaType).toBeUndefined();
      expect(result?.toJSON().deliveredAt).toBeUndefined();
      expect(result?.toJSON().readAt).toBeUndefined();
    });

    it('should convert all message types correctly', async () => {
      const messageTypes = [
        MessageType.TEXT,
        MessageType.IMAGE,
        MessageType.VIDEO,
        MessageType.AUDIO,
        MessageType.STORY_MENTION,
        MessageType.STORY_REPLY,
      ];

      for (const messageType of messageTypes) {
        const mockRow = {
          id: 'msg-123',
          conversation_id: 'conv-123',
          platform_message_id: 'platform-msg-456',
          sender_type: SenderType.CUSTOMER,
          sender_platform_id: 'sender-789',
          message_type: messageType,
          content: messageType === MessageType.TEXT ? 'Test' : null,
          media_url:
            messageType !== MessageType.TEXT
              ? 'https://example.com/media'
              : null,
          media_type: messageType !== MessageType.TEXT ? 'media/type' : null,
          is_read: false,
          sent_at: new Date(),
          delivered_at: null,
          read_at: null,
          metadata: {},
          created_at: new Date(),
        };

        (mockDatabase.query as jest.Mock).mockResolvedValue([mockRow]);

        const result = await repository.findById('msg-123');

        expect(result?.toJSON().messageType).toBe(messageType);
      }
    });

    it('should convert both sender types correctly', async () => {
      const senderTypes = [SenderType.USER, SenderType.CUSTOMER];

      for (const senderType of senderTypes) {
        const mockRow = {
          id: 'msg-123',
          conversation_id: 'conv-123',
          platform_message_id: 'platform-msg-456',
          sender_type: senderType,
          sender_platform_id: 'sender-789',
          message_type: MessageType.TEXT,
          content: 'Test',
          media_url: null,
          media_type: null,
          is_read: false,
          sent_at: new Date(),
          delivered_at: null,
          read_at: null,
          metadata: {},
          created_at: new Date(),
        };

        (mockDatabase.query as jest.Mock).mockResolvedValue([mockRow]);

        const result = await repository.findById('msg-123');

        expect(result?.senderType).toBe(senderType);
      }
    });
  });
});

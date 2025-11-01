import { Test, TestingModule } from '@nestjs/testing';
import { ConversationRepository } from './conversation.repository';
import { Database } from '../database';
import {
  Conversation,
  ConversationStatus,
} from '../../../domain/entities/conversation.entity';

describe('ConversationRepository', () => {
  let repository: ConversationRepository;
  let mockDatabase: Partial<Database>;

  beforeEach(async () => {
    mockDatabase = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationRepository,
        {
          provide: Database,
          useValue: mockDatabase,
        },
      ],
    }).compile();

    repository = module.get<ConversationRepository>(ConversationRepository);
  });

  describe('create', () => {
    it('should create a new conversation', async () => {
      const conversation = Conversation.create({
        clientAccountId: 'client-123',
        platformConversationId: 'platform-456',
        participantPlatformId: 'participant-789',
        participantUsername: 'john_doe',
        participantProfilePic: 'https://example.com/pic.jpg',
        metadata: { source: 'instagram' },
      });

      const mockRow = {
        id: conversation.id,
        client_account_id: 'client-123',
        platform_conversation_id: 'platform-456',
        participant_platform_id: 'participant-789',
        participant_username: 'john_doe',
        participant_profile_pic: 'https://example.com/pic.jpg',
        last_message_at: null,
        unread_count: 0,
        status: ConversationStatus.OPEN,
        metadata: { source: 'instagram' },
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockDatabase.query as jest.Mock).mockResolvedValue([mockRow]);

      const result = await repository.create(conversation);

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conversations'),
        expect.arrayContaining([
          conversation.id,
          'client-123',
          'platform-456',
          'participant-789',
          'john_doe',
          'https://example.com/pic.jpg',
        ]),
      );
      expect(result).toBeInstanceOf(Conversation);
      expect(result.id).toBe(conversation.id);
      expect(result.clientAccountId).toBe('client-123');
    });
  });

  describe('findById', () => {
    it('should find conversation by id', async () => {
      const mockRow = {
        id: 'conv-123',
        client_account_id: 'client-123',
        platform_conversation_id: 'platform-456',
        participant_platform_id: 'participant-789',
        participant_username: 'john_doe',
        participant_profile_pic: 'https://example.com/pic.jpg',
        last_message_at: new Date('2025-01-01'),
        unread_count: 5,
        status: ConversationStatus.OPEN,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockDatabase.query as jest.Mock).mockResolvedValue([mockRow]);

      const result = await repository.findById('conv-123');

      expect(mockDatabase.query).toHaveBeenCalledWith(
        'SELECT * FROM conversations WHERE id = $1 LIMIT 1',
        ['conv-123'],
      );
      expect(result).toBeInstanceOf(Conversation);
      expect(result?.id).toBe('conv-123');
      expect(result?.unreadCount).toBe(5);
    });

    it('should return null when conversation not found', async () => {
      (mockDatabase.query as jest.Mock).mockResolvedValue([]);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByPlatformId', () => {
    it('should find conversation by platform conversation id', async () => {
      const mockRow = {
        id: 'conv-123',
        client_account_id: 'client-123',
        platform_conversation_id: 'platform-456',
        participant_platform_id: 'participant-789',
        participant_username: 'john_doe',
        participant_profile_pic: null,
        last_message_at: null,
        unread_count: 0,
        status: ConversationStatus.OPEN,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockDatabase.query as jest.Mock).mockResolvedValue([mockRow]);

      const result = await repository.findByPlatformId(
        'client-123',
        'platform-456',
      );

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE client_account_id = $1'),
        ['client-123', 'platform-456'],
      );
      expect(result).toBeInstanceOf(Conversation);
      expect(result?.id).toBe('conv-123');
    });

    it('should return null when platform conversation not found', async () => {
      (mockDatabase.query as jest.Mock).mockResolvedValue([]);

      const result = await repository.findByPlatformId(
        'client-123',
        'non-existent',
      );

      expect(result).toBeNull();
    });
  });

  describe('findByClientAccount', () => {
    it('should find conversations by client account id with pagination', async () => {
      const mockRows = [
        {
          id: 'conv-1',
          client_account_id: 'client-123',
          platform_conversation_id: 'platform-1',
          participant_platform_id: 'participant-1',
          participant_username: 'user1',
          participant_profile_pic: null,
          last_message_at: new Date('2025-01-02'),
          unread_count: 3,
          status: ConversationStatus.OPEN,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'conv-2',
          client_account_id: 'client-123',
          platform_conversation_id: 'platform-2',
          participant_platform_id: 'participant-2',
          participant_username: 'user2',
          participant_profile_pic: null,
          last_message_at: new Date('2025-01-01'),
          unread_count: 0,
          status: ConversationStatus.OPEN,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      (mockDatabase.query as jest.Mock).mockResolvedValue(mockRows);

      const result = await repository.findByClientAccount('client-123', {
        limit: 10,
        offset: 0,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Conversation);
      expect(result[0].id).toBe('conv-1');
    });

    it('should filter by status', async () => {
      const mockRows = [
        {
          id: 'conv-1',
          client_account_id: 'client-123',
          platform_conversation_id: 'platform-1',
          participant_platform_id: 'participant-1',
          participant_username: 'user1',
          participant_profile_pic: null,
          last_message_at: new Date(),
          unread_count: 0,
          status: ConversationStatus.CLOSED,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      (mockDatabase.query as jest.Mock).mockResolvedValue(mockRows);

      const result = await repository.findByClientAccount('client-123', {
        status: ConversationStatus.CLOSED,
        limit: 10,
        offset: 0,
      });

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('AND status = $2'),
        expect.arrayContaining(['client-123', ConversationStatus.CLOSED]),
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(ConversationStatus.CLOSED);
    });

    it('should filter by hasUnread', async () => {
      const mockRows = [
        {
          id: 'conv-1',
          client_account_id: 'client-123',
          platform_conversation_id: 'platform-1',
          participant_platform_id: 'participant-1',
          participant_username: 'user1',
          participant_profile_pic: null,
          last_message_at: new Date(),
          unread_count: 5,
          status: ConversationStatus.OPEN,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      (mockDatabase.query as jest.Mock).mockResolvedValue(mockRows);

      const result = await repository.findByClientAccount('client-123', {
        hasUnread: true,
        limit: 10,
        offset: 0,
      });

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('AND unread_count > 0'),
        expect.any(Array),
      );
      expect(result).toHaveLength(1);
      expect(result[0].unreadCount).toBe(5);
    });

    it('should return empty array when no conversations found', async () => {
      (mockDatabase.query as jest.Mock).mockResolvedValue([]);

      const result = await repository.findByClientAccount('client-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update conversation', async () => {
      const conversation = Conversation.reconstitute({
        id: 'conv-123',
        clientAccountId: 'client-123',
        platformConversationId: 'platform-456',
        participantPlatformId: 'participant-789',
        participantUsername: 'john_doe_updated',
        participantProfilePic: 'https://example.com/new-pic.jpg',
        lastMessageAt: new Date('2025-01-01'),
        unreadCount: 10,
        status: ConversationStatus.OPEN,
        metadata: { updated: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockRow = {
        id: 'conv-123',
        client_account_id: 'client-123',
        platform_conversation_id: 'platform-456',
        participant_platform_id: 'participant-789',
        participant_username: 'john_doe_updated',
        participant_profile_pic: 'https://example.com/new-pic.jpg',
        last_message_at: new Date('2025-01-01'),
        unread_count: 10,
        status: ConversationStatus.OPEN,
        metadata: { updated: true },
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockDatabase.query as jest.Mock).mockResolvedValue([mockRow]);

      const result = await repository.update(conversation);

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE conversations'),
        expect.arrayContaining([
          'john_doe_updated',
          'https://example.com/new-pic.jpg',
        ]),
      );
      expect(result).toBeInstanceOf(Conversation);
      expect(result.id).toBe('conv-123');
    });

    it('should throw error when conversation not found for update', async () => {
      const conversation = Conversation.reconstitute({
        id: 'non-existent',
        clientAccountId: 'client-123',
        platformConversationId: 'platform-456',
        participantPlatformId: 'participant-789',
        unreadCount: 0,
        status: ConversationStatus.OPEN,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      (mockDatabase.query as jest.Mock).mockResolvedValue([]);

      await expect(repository.update(conversation)).rejects.toThrow(
        'Conversation non-existent not found for update',
      );
    });
  });

  describe('countUnread', () => {
    it('should count unread conversations', async () => {
      (mockDatabase.query as jest.Mock).mockResolvedValue([{ count: '5' }]);

      const result = await repository.countUnread('client-123');

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE client_account_id = $1'),
        ['client-123'],
      );
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('AND unread_count > 0'),
        ['client-123'],
      );
      expect(result).toBe(5);
    });

    it('should return zero when no unread conversations', async () => {
      (mockDatabase.query as jest.Mock).mockResolvedValue([{ count: '0' }]);

      const result = await repository.countUnread('client-123');

      expect(result).toBe(0);
    });

    it('should return zero when query returns empty result', async () => {
      (mockDatabase.query as jest.Mock).mockResolvedValue([]);

      const result = await repository.countUnread('client-123');

      expect(result).toBe(0);
    });
  });

  describe('findStaleConversations', () => {
    it('should find conversations older than specified days', async () => {
      const mockRows = [
        {
          id: 'conv-1',
          client_account_id: 'client-123',
          platform_conversation_id: 'platform-1',
          participant_platform_id: 'participant-1',
          participant_username: 'user1',
          participant_profile_pic: null,
          last_message_at: new Date('2025-01-01'),
          unread_count: 0,
          status: ConversationStatus.OPEN,
          metadata: {},
          created_at: new Date('2024-12-01'),
          updated_at: new Date('2025-01-01'),
        },
      ];

      (mockDatabase.query as jest.Mock).mockResolvedValue(mockRows);

      const result = await repository.findStaleConversations(7);

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE last_message_at < $1'),
        expect.any(Array),
      );
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('AND status = $2'),
        expect.any(Array),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Conversation);
    });

    it('should return empty array when no stale conversations', async () => {
      (mockDatabase.query as jest.Mock).mockResolvedValue([]);

      const result = await repository.findStaleConversations(7);

      expect(result).toHaveLength(0);
    });
  });

  describe('toDomain conversion', () => {
    it('should correctly convert database row to domain entity', async () => {
      const mockRow = {
        id: 'conv-123',
        client_account_id: 'client-123',
        platform_conversation_id: 'platform-456',
        participant_platform_id: 'participant-789',
        participant_username: 'john_doe',
        participant_profile_pic: 'https://example.com/pic.jpg',
        last_message_at: new Date('2025-01-01'),
        unread_count: '5',
        status: ConversationStatus.OPEN,
        metadata: { key: 'value' },
        created_at: new Date('2024-12-01'),
        updated_at: new Date('2025-01-01'),
      };

      (mockDatabase.query as jest.Mock).mockResolvedValue([mockRow]);

      const result = await repository.findById('conv-123');

      expect(result).toBeInstanceOf(Conversation);
      expect(result?.id).toBe('conv-123');
      expect(result?.clientAccountId).toBe('client-123');
      expect(result?.unreadCount).toBe(5);
      expect(result?.status).toBe(ConversationStatus.OPEN);
      expect(result?.toJSON().metadata).toEqual({ key: 'value' });
    });

    it('should handle null optional fields', async () => {
      const mockRow = {
        id: 'conv-123',
        client_account_id: 'client-123',
        platform_conversation_id: 'platform-456',
        participant_platform_id: 'participant-789',
        participant_username: null,
        participant_profile_pic: null,
        last_message_at: null,
        unread_count: 0,
        status: ConversationStatus.OPEN,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockDatabase.query as jest.Mock).mockResolvedValue([mockRow]);

      const result = await repository.findById('conv-123');

      expect(result).toBeInstanceOf(Conversation);
      expect(result?.toJSON().participantUsername).toBeNull();
      expect(result?.toJSON().participantProfilePic).toBeNull();
      expect(result?.lastMessageAt).toBeNull();
    });
  });
});

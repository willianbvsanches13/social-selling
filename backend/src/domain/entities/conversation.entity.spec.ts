import { Conversation, ConversationStatus } from './conversation.entity';
import { DomainException } from '../exceptions/domain.exception';

describe('Conversation Entity', () => {
  const validProps = {
    clientAccountId: 'account-123',
    platformConversationId: 'platform-conv-456',
    participantPlatformId: 'participant-789',
    participantUsername: 'johndoe',
    participantProfilePic: 'https://example.com/profile.jpg',
    metadata: {},
  };

  describe('conversation creation', () => {
    it('should create a new conversation with valid properties', () => {
      const conversation = Conversation.create(validProps);
      expect(conversation.id).toBeDefined();
      expect(conversation.clientAccountId).toBe('account-123');
      expect(conversation.participantPlatformId).toBe('participant-789');
      expect(conversation.unreadCount).toBe(0);
      expect(conversation.status).toBe(ConversationStatus.OPEN);
      expect(conversation.isOpen).toBe(true);
    });

    it('should reconstitute conversation from existing props', () => {
      const existingProps = {
        ...validProps,
        id: 'existing-id',
        unreadCount: 5,
        status: ConversationStatus.OPEN,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const conversation = Conversation.reconstitute(existingProps);
      expect(conversation.id).toBe('existing-id');
      expect(conversation.unreadCount).toBe(5);
    });
  });

  describe('updateParticipantProfile', () => {
    it('should update participant username and profile picture', () => {
      const conversation = Conversation.create(validProps);
      const updatedAtBefore = conversation.toJSON().updatedAt;
      conversation.updateParticipantProfile(
        'newusername',
        'https://example.com/new-profile.jpg',
      );
      const json = conversation.toJSON();
      expect(json.participantUsername).toBe('newusername');
      expect(json.participantProfilePic).toBe(
        'https://example.com/new-profile.jpg',
      );
      expect(json.updatedAt.getTime()).toBeGreaterThanOrEqual(
        updatedAtBefore.getTime(),
      );
    });

    it('should throw error when username is empty', () => {
      const conversation = Conversation.create(validProps);
      expect(() =>
        conversation.updateParticipantProfile(
          '',
          'https://example.com/profile.jpg',
        ),
      ).toThrow(DomainException);
      expect(() =>
        conversation.updateParticipantProfile(
          '',
          'https://example.com/profile.jpg',
        ),
      ).toThrow('Username cannot be empty');
    });

    it('should throw error when username is only whitespace', () => {
      const conversation = Conversation.create(validProps);
      expect(() =>
        conversation.updateParticipantProfile(
          '   ',
          'https://example.com/profile.jpg',
        ),
      ).toThrow(DomainException);
      expect(() =>
        conversation.updateParticipantProfile(
          '   ',
          'https://example.com/profile.jpg',
        ),
      ).toThrow('Username cannot be empty');
    });

    it('should throw error when profile picture is empty', () => {
      const conversation = Conversation.create(validProps);
      expect(() =>
        conversation.updateParticipantProfile('username', ''),
      ).toThrow(DomainException);
      expect(() =>
        conversation.updateParticipantProfile('username', ''),
      ).toThrow('Profile picture cannot be empty');
    });

    it('should throw error when profile picture is only whitespace', () => {
      const conversation = Conversation.create(validProps);
      expect(() =>
        conversation.updateParticipantProfile('username', '   '),
      ).toThrow(DomainException);
      expect(() =>
        conversation.updateParticipantProfile('username', '   '),
      ).toThrow('Profile picture cannot be empty');
    });

    it('should update updatedAt timestamp when profile is updated', () => {
      const conversation = Conversation.create(validProps);
      const originalUpdatedAt = conversation.toJSON().updatedAt;
      setTimeout(() => {
        conversation.updateParticipantProfile(
          'newuser',
          'https://example.com/new.jpg',
        );
        const newUpdatedAt = conversation.toJSON().updatedAt;
        expect(newUpdatedAt.getTime()).toBeGreaterThanOrEqual(
          originalUpdatedAt.getTime(),
        );
      }, 10);
    });
  });

  describe('unread count management', () => {
    it('should increment unread count', () => {
      const conversation = Conversation.create(validProps);
      expect(conversation.unreadCount).toBe(0);
      conversation.incrementUnreadCount();
      expect(conversation.unreadCount).toBe(1);
      conversation.incrementUnreadCount();
      expect(conversation.unreadCount).toBe(2);
    });

    it('should mark all as read', () => {
      const conversation = Conversation.create(validProps);
      conversation.incrementUnreadCount();
      conversation.incrementUnreadCount();
      expect(conversation.unreadCount).toBe(2);
      conversation.markAllAsRead();
      expect(conversation.unreadCount).toBe(0);
    });
  });

  describe('status management', () => {
    it('should close conversation', () => {
      const conversation = Conversation.create(validProps);
      expect(conversation.status).toBe(ConversationStatus.OPEN);
      conversation.close();
      expect(conversation.status).toBe(ConversationStatus.CLOSED);
      expect(conversation.isOpen).toBe(false);
    });

    it('should reopen closed conversation', () => {
      const conversation = Conversation.create(validProps);
      conversation.close();
      expect(conversation.status).toBe(ConversationStatus.CLOSED);
      conversation.reopen();
      expect(conversation.status).toBe(ConversationStatus.OPEN);
      expect(conversation.isOpen).toBe(true);
    });

    it('should throw error when reopening archived conversation', () => {
      const conversation = Conversation.create(validProps);
      conversation.archive();
      expect(() => conversation.reopen()).toThrow(DomainException);
      expect(() => conversation.reopen()).toThrow(
        'Cannot reopen archived conversation',
      );
    });

    it('should archive conversation', () => {
      const conversation = Conversation.create(validProps);
      conversation.archive();
      expect(conversation.status).toBe(ConversationStatus.ARCHIVED);
    });
  });

  describe('last message tracking', () => {
    it('should update last message timestamp', () => {
      const conversation = Conversation.create(validProps);
      const timestamp = new Date();
      conversation.updateLastMessage(timestamp);
      expect(conversation.lastMessageAt).toBe(timestamp);
    });
  });

  describe('staleness check', () => {
    it('should return false when no last message', () => {
      const conversation = Conversation.create(validProps);
      expect(conversation.isStale()).toBe(false);
    });

    it('should return true when conversation is stale', () => {
      const conversation = Conversation.create(validProps);
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      conversation.updateLastMessage(oldDate);
      expect(conversation.isStale(7)).toBe(true);
    });

    it('should return false when conversation is not stale', () => {
      const conversation = Conversation.create(validProps);
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3);
      conversation.updateLastMessage(recentDate);
      expect(conversation.isStale(7)).toBe(false);
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON with all properties', () => {
      const conversation = Conversation.create(validProps);
      const json = conversation.toJSON();
      expect(json.id).toBeDefined();
      expect(json.clientAccountId).toBe('account-123');
      expect(json.participantPlatformId).toBe('participant-789');
      expect(json.participantUsername).toBe('johndoe');
      expect(json.participantProfilePic).toBe(
        'https://example.com/profile.jpg',
      );
      expect(json.unreadCount).toBe(0);
      expect(json.status).toBe(ConversationStatus.OPEN);
      expect(json.createdAt).toBeDefined();
      expect(json.updatedAt).toBeDefined();
    });
  });
});

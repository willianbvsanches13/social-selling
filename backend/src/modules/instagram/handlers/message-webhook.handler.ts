import { Injectable, Logger } from '@nestjs/common';
import { ConversationRepository } from '../../../infrastructure/database/repositories/conversation.repository';
import { MessageRepository } from '../../../infrastructure/database/repositories/message.repository';
import {
  Conversation,
  ConversationStatus,
} from '../../../domain/entities/conversation.entity';
import {
  Message,
  MessageType,
  SenderType,
} from '../../../domain/entities/message.entity';
import { WebhookEventType } from '../../../domain/entities/instagram-webhook-event.entity';
import { InstagramApiService } from '../services/instagram-api.service';

/**
 * Represents an attachment in Instagram message
 */
interface Attachment {
  type: string;
  payload: {
    url: string;
    text?: string;
  };
}

/**
 * Represents message data from Instagram webhook
 */
interface MessageData {
  id: string;
  mid?: string;
  text?: string;
  attachments?: Attachment[];
  timestamp?: number;
  is_story_mention?: boolean;
  story_mention?: boolean;
  is_story_reply?: boolean;
  story_reply?: boolean;
  media?: {
    url: string;
  };
}

/**
 * Represents a messaging event from Instagram webhook
 */
interface MessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message: MessageData;
}

/**
 * Represents message change value from Instagram webhook
 */
interface MessageChangeValue {
  from?: { id: string; username?: string };
  messages?: MessageData[];
  sender?: { id: string };
  recipient?: { id: string };
}

/**
 * Represents the complete webhook payload from Instagram for message events
 */
interface MessageWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    messaging?: MessagingEvent[];
    changes?: Array<{
      field: string;
      value: MessageChangeValue;
    }>;
  }>;
}

@Injectable()
export class MessageWebhookHandler {
  private readonly logger = new Logger(MessageWebhookHandler.name);

  constructor(
    private conversationRepository: ConversationRepository,
    private messageRepository: MessageRepository,
    private instagramApiService: InstagramApiService,
  ) {}

  /**
   * Handles incoming Instagram message webhook events
   *
   * Processes both messaging and message change events from Instagram webhooks.
   * Creates conversations and messages as needed, updating participant profiles
   * when creating new conversations.
   *
   * @param payload - The webhook payload from Instagram containing message events
   * @returns Promise that resolves when all events are processed
   * @throws Error if webhook processing fails
   */
  async handle(payload: MessageWebhookPayload): Promise<void> {
    this.logger.log('Processing MESSAGE webhook event');

    try {
      for (const entry of payload.entry) {
        const pageId = entry.id;
        const messaging = entry.messaging || [];
        const changes = entry.changes || [];

        if (messaging.length > 0) {
          for (const event of messaging) {
            await this.processMessagingEvent(pageId, event);
          }
        }

        if (changes.length > 0) {
          for (const change of changes) {
            if (change.field === 'messages') {
              await this.processMessageChange(pageId, change.value);
            }
          }
        }
      }

      this.logger.log('MESSAGE webhook event processed successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error processing MESSAGE webhook: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Processes a single messaging event from the webhook
   *
   * Extracts sender, recipient, and message data from the event and
   * delegates to processMessage for handling.
   *
   * @param pageId - The Instagram page/account ID
   * @param event - The messaging event containing sender, recipient, and message data
   * @returns Promise that resolves when event is processed
   */
  private async processMessagingEvent(
    pageId: string,
    event: MessagingEvent,
  ): Promise<void> {
    const senderId = event.sender?.id;
    const recipientId = event.recipient?.id;
    const messageData = event.message;

    if (!senderId || !recipientId || !messageData) {
      this.logger.warn('Invalid messaging event structure');
      return;
    }

    const platformMessageId = messageData.mid || messageData.id;
    const timestamp = event.timestamp ? new Date(event.timestamp) : new Date();

    if (!platformMessageId) {
      this.logger.warn('Missing platform message ID');
      return;
    }

    await this.processMessage(
      pageId,
      senderId,
      recipientId,
      platformMessageId,
      messageData,
      timestamp,
    );
  }

  /**
   * Processes message change events from Instagram webhooks
   *
   * Handles bulk message notifications by iterating through messages
   * and processing each one individually.
   *
   * @param pageId - The Instagram page/account ID
   * @param value - The message change value containing messages array
   * @returns Promise that resolves when all messages are processed
   */
  private async processMessageChange(
    pageId: string,
    value: MessageChangeValue,
  ): Promise<void> {
    const messages = value.messages || [];

    if (messages.length === 0) {
      this.logger.debug('No messages in change event');
      return;
    }

    for (const messageData of messages) {
      const senderId = value.from?.id || value.sender?.id;
      const recipientId = value.recipient?.id;
      const platformMessageId = messageData.id;
      const timestamp = messageData.timestamp
        ? new Date(messageData.timestamp * 1000)
        : new Date();

      if (!senderId || !recipientId || !platformMessageId) {
        this.logger.warn('Missing required message data');
        continue;
      }

      await this.processMessage(
        pageId,
        senderId,
        recipientId,
        platformMessageId,
        messageData,
        timestamp,
      );
    }
  }

  /**
   * Processes an individual message from Instagram
   *
   * Core message processing logic:
   * - Ensures idempotency by checking for existing messages
   * - Creates or finds conversation
   * - Fetches participant profile for new conversations
   * - Creates message entity
   * - Updates conversation metadata
   *
   * @param pageId - The Instagram page/account ID
   * @param senderId - The sender's Instagram user ID
   * @param recipientId - The recipient's Instagram user ID
   * @param platformMessageId - Instagram's unique message ID
   * @param messageData - The message data containing content and metadata
   * @param timestamp - Message timestamp
   * @returns Promise that resolves when message is processed
   */
  private async processMessage(
    pageId: string,
    senderId: string,
    recipientId: string,
    platformMessageId: string,
    messageData: MessageData,
    timestamp: Date,
  ): Promise<void> {
    const existingMessage =
      await this.messageRepository.findByPlatformId(platformMessageId);

    if (existingMessage) {
      this.logger.debug(
        `Message already exists (idempotency): ${platformMessageId}`,
      );
      return;
    }

    const platformConversationId = senderId;

    let conversation = await this.conversationRepository.findByPlatformId(
      pageId,
      platformConversationId,
    );

    if (!conversation) {
      this.logger.log(
        `Creating new conversation for participant: ${platformConversationId}`,
      );

      conversation = Conversation.create({
        clientAccountId: pageId,
        platformConversationId,
        participantPlatformId: senderId,
        metadata: {
          source: 'instagram_webhook',
          firstMessageAt: timestamp.toISOString(),
        },
      });

      conversation = await this.conversationRepository.create(conversation);
      await this.fetchAndUpdateParticipantProfile(
        conversation,
        senderId,
        pageId,
      );
    }

    const { messageType, content, mediaUrl, mediaType } =
      this.extractMessageContent(messageData);

    const message = Message.create({
      conversationId: conversation.id,
      platformMessageId,
      senderType: SenderType.CUSTOMER,
      senderPlatformId: senderId,
      messageType,
      content,
      mediaUrl,
      mediaType,
      sentAt: timestamp,
      metadata: {
        recipientId,
        rawPayload: messageData,
      },
    });

    await this.messageRepository.create(message);

    this.logger.log(
      `Message created: ${message.id} (platform: ${platformMessageId})`,
    );

    conversation.updateLastMessage(timestamp);
    conversation.incrementUnreadCount();

    await this.conversationRepository.update(conversation);

    this.logger.log(
      `Conversation updated: ${conversation.id} (unread: ${conversation.unreadCount})`,
    );
  }

  /**
   * Fetches participant profile from Instagram API and updates conversation
   *
   * Non-blocking operation that attempts to enrich conversation with
   * participant profile data (username and profile picture).
   * Failures are logged but do not prevent conversation creation.
   *
   * @param conversation - The conversation entity to update
   * @param senderId - The participant's Instagram user ID
   * @param pageId - The Instagram page/account ID for API authentication
   * @returns Promise that resolves when profile fetch completes (success or failure)
   */
  private async fetchAndUpdateParticipantProfile(
    conversation: Conversation,
    senderId: string,
    pageId: string,
  ): Promise<void> {
    try {
      const profile = await this.instagramApiService.getUserProfileById(
        pageId,
        senderId,
      );
      if (!profile) {
        this.logger.debug(
          `Could not fetch profile for participant ${senderId}, conversation created without profile`,
        );
        return;
      }
      if (profile.username && profile.profile_picture_url) {
        conversation.updateParticipantProfile(
          profile.username,
          profile.profile_picture_url,
        );
        await this.conversationRepository.update(conversation);
        this.logger.log(
          `Participant profile updated for conversation ${conversation.id}: @${profile.username}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Non-blocking error fetching participant profile for ${senderId}: ${errorMessage}`,
      );
    }
  }

  /**
   * Extracts message content and determines message type
   *
   * Analyzes message data to determine the type of message (text, image, video, etc.)
   * and extracts relevant content including media URLs and text.
   *
   * @param messageData - The message data from Instagram webhook
   * @returns Object containing message type, content, and media information
   */
  private extractMessageContent(messageData: MessageData): {
    messageType: MessageType;
    content?: string;
    mediaUrl?: string;
    mediaType?: string;
  } {
    if (messageData.text) {
      return {
        messageType: MessageType.TEXT,
        content: messageData.text,
      };
    }

    if (messageData.attachments && messageData.attachments.length > 0) {
      const attachment = messageData.attachments[0];
      const attachmentType = attachment.type?.toLowerCase();

      let messageType = MessageType.TEXT;

      if (attachmentType === 'image') {
        messageType = MessageType.IMAGE;
      } else if (attachmentType === 'video') {
        messageType = MessageType.VIDEO;
      } else if (attachmentType === 'audio') {
        messageType = MessageType.AUDIO;
      }

      return {
        messageType,
        mediaUrl: attachment.payload?.url,
        mediaType: attachmentType,
        content: attachment.payload?.text || undefined,
      };
    }

    if (messageData.is_story_mention || messageData.story_mention) {
      return {
        messageType: MessageType.STORY_MENTION,
        content: messageData.text,
        mediaUrl: messageData.media?.url,
      };
    }

    if (messageData.is_story_reply || messageData.story_reply) {
      return {
        messageType: MessageType.STORY_REPLY,
        content: messageData.text,
        mediaUrl: messageData.media?.url,
      };
    }

    return {
      messageType: MessageType.TEXT,
      content: JSON.stringify(messageData),
    };
  }
}

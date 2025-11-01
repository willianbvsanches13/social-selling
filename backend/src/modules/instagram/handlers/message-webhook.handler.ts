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

interface MessageWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    messaging?: Array<{
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message: {
        mid: string;
        text?: string;
        attachments?: Array<{
          type: string;
          payload: {
            url: string;
          };
        }>;
      };
    }>;
    changes?: Array<{
      field: string;
      value: {
        from?: { id: string; username?: string };
        messages?: Array<{
          id: string;
          text?: string;
          attachments?: any[];
          timestamp?: number;
        }>;
        sender?: { id: string };
        recipient?: { id: string };
      };
    }>;
  }>;
}

@Injectable()
export class MessageWebhookHandler {
  private readonly logger = new Logger(MessageWebhookHandler.name);

  constructor(
    private conversationRepository: ConversationRepository,
    private messageRepository: MessageRepository,
  ) {}

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

  private async processMessagingEvent(
    pageId: string,
    event: any,
  ): Promise<void> {
    const senderId = event.sender?.id;
    const recipientId = event.recipient?.id;
    const messageData = event.message;

    if (!senderId || !recipientId || !messageData) {
      this.logger.warn('Invalid messaging event structure');
      return;
    }

    const platformMessageId = messageData.mid;
    const timestamp = event.timestamp ? new Date(event.timestamp) : new Date();

    await this.processMessage(
      pageId,
      senderId,
      recipientId,
      platformMessageId,
      messageData,
      timestamp,
    );
  }

  private async processMessageChange(
    pageId: string,
    value: any,
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

  private async processMessage(
    pageId: string,
    senderId: string,
    recipientId: string,
    platformMessageId: string,
    messageData: any,
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

  private extractMessageContent(messageData: any): {
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

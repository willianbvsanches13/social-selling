import { Injectable, Logger, Inject } from '@nestjs/common';
import { IConversationRepository } from '../../../domain/repositories/conversation.repository.interface';
import { IMessageRepository } from '../../../domain/repositories/message.repository.interface';
import { IClientAccountRepository } from '../../../domain/repositories/client-account.repository.interface';
import {
  Conversation,
  ConversationStatus,
} from '../../../domain/entities/conversation.entity';
import {
  Message,
  MessageType,
  SenderType,
} from '../../../domain/entities/message.entity';
import { InstagramWebhookEvent } from '../../../domain/entities/instagram-webhook-event.entity';

export interface MessageEventPayload {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message: {
    mid: string;
    text?: string;
    attachments?: Array<{
      type: 'image' | 'video' | 'audio' | 'file';
      payload: {
        url: string;
      };
    }>;
    is_echo?: boolean;
    reply_to?: {
      mid: string;
    };
  };
}

@Injectable()
export class WebhookMessageHandler {
  private readonly logger = new Logger(WebhookMessageHandler.name);

  constructor(
    @Inject('IConversationRepository')
    private readonly conversationRepository: IConversationRepository,
    @Inject('IMessageRepository')
    private readonly messageRepository: IMessageRepository,
    @Inject('IClientAccountRepository')
    private readonly clientAccountRepository: IClientAccountRepository,
  ) {}

  async processMessageEvent(
    event: InstagramWebhookEvent,
    clientAccountId: string,
  ): Promise<void> {
    try {
      const payload = this.extractMessagePayload(event);

      if (!payload) {
        this.logger.warn(`Unable to extract message payload from event ${event.id}`);
        return;
      }

      // Skip echo messages (sent by us)
      if (payload.message.is_echo) {
        this.logger.debug(`Skipping echo message: ${payload.message.mid}`);
        return;
      }

      const isFromCustomer = payload.sender.id !== payload.recipient.id;
      const senderId = isFromCustomer ? payload.sender.id : payload.recipient.id;
      const recipientId = isFromCustomer
        ? payload.recipient.id
        : payload.sender.id;

      // Find or create conversation
      const conversation = await this.findOrCreateConversation(
        clientAccountId,
        senderId,
        recipientId,
      );

      // Determine message type
      const messageType = this.determineMessageType(payload.message);

      // Create message
      const message = Message.create({
        conversationId: conversation.id,
        platformMessageId: payload.message.mid,
        senderType: isFromCustomer ? SenderType.CUSTOMER : SenderType.USER,
        senderPlatformId: senderId,
        messageType,
        content: payload.message.text,
        mediaUrl: this.extractMediaUrl(payload.message),
        mediaType: this.extractMediaType(payload.message),
        sentAt: new Date(payload.timestamp),
        metadata: {
          replyTo: payload.message.reply_to?.mid,
          rawPayload: payload,
        },
      });

      await this.messageRepository.create(message);

      // Update conversation
      if (isFromCustomer) {
        conversation.incrementUnreadCount();
      }
      conversation.updateLastMessage(message.sentAt);
      await this.conversationRepository.update(conversation);

      this.logger.log(
        `Message processed: ${message.id} in conversation ${conversation.id}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to process message event ${event.id}: ${errorMessage}`,
      );
      throw error;
    }
  }

  private extractMessagePayload(
    event: InstagramWebhookEvent,
  ): MessageEventPayload | null {
    const payload = event.payload as any;

    // Instagram sends messages in entry.messaging array
    const entry = payload.entry?.[0];
    if (!entry) return null;

    const messaging = entry.messaging?.[0];
    if (!messaging) return null;

    if (!messaging.message) return null;

    return messaging as MessageEventPayload;
  }

  private determineMessageType(message: any): MessageType {
    // Check for story mentions/replies first
    if (message.is_story_mention) {
      return MessageType.STORY_MENTION;
    }

    if (message.is_story_reply) {
      return MessageType.STORY_REPLY;
    }

    // Check attachments
    if (message.attachments && message.attachments.length > 0) {
      const firstAttachment = message.attachments[0];

      switch (firstAttachment.type) {
        case 'image':
          return MessageType.IMAGE;
        case 'video':
          return MessageType.VIDEO;
        case 'audio':
          return MessageType.AUDIO;
        default:
          return MessageType.TEXT;
      }
    }

    // Default to text
    return MessageType.TEXT;
  }

  private extractMediaUrl(message: any): string | undefined {
    if (!message.attachments || message.attachments.length === 0) {
      return undefined;
    }

    return message.attachments[0].payload?.url;
  }

  private extractMediaType(message: any): string | undefined {
    if (!message.attachments || message.attachments.length === 0) {
      return undefined;
    }

    return message.attachments[0].type;
  }

  private async findOrCreateConversation(
    clientAccountId: string,
    participantPlatformId: string,
    recipientId: string,
  ): Promise<Conversation> {
    // Try to find existing conversation
    const platformConversationId = `${clientAccountId}_${participantPlatformId}`;

    let conversation =
      await this.conversationRepository.findByPlatformId(
        clientAccountId,
        platformConversationId,
      );

    if (conversation) {
      return conversation;
    }

    // Create new conversation
    this.logger.log(
      `Creating new conversation for participant ${participantPlatformId}`,
    );

    conversation = Conversation.create({
      clientAccountId,
      platformConversationId,
      participantPlatformId,
      metadata: {
        recipientId,
        createdViaWebhook: true,
      },
    });

    return await this.conversationRepository.create(conversation);
  }
}

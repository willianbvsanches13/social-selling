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
  entryId: string; // ID of the Instagram page/account (the owner)
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

      // Get client account to determine the page/business account ID
      const clientAccount =
        await this.clientAccountRepository.findById(clientAccountId);

      if (!clientAccount) {
        this.logger.error(
          `Client account ${clientAccountId} not found for webhook event ${event.id}`,
        );
        return;
      }

      const pageId = clientAccount.platformAccountId;

      // Determine if message is from customer or from our page
      // entryId represents the Instagram page/account (the owner)
      // If sender.id === entryId, message was SENT by the page owner (USER)
      // If sender.id !== entryId, message was RECEIVED from an external participant (CUSTOMER)
      const isFromCustomer = payload.sender.id !== payload.entryId;

      // The participant is always the other party (not the entry/page owner)
      const participantPlatformId = isFromCustomer
        ? payload.sender.id
        : payload.recipient.id;

      // Find or create conversation
      const conversation = await this.findOrCreateConversation(
        clientAccountId,
        participantPlatformId,
        pageId,
      );

      // Determine message type
      const messageType = this.determineMessageType(payload.message);

      // Create message with correct sender type
      const senderType = isFromCustomer ? SenderType.CUSTOMER : SenderType.USER;
      const senderPlatformId = payload.sender.id;

      this.logger.log(
        `Creating message ${payload.message.mid} with senderType=${senderType}, senderPlatformId=${senderPlatformId}`,
      );

      const message = Message.create({
        conversationId: conversation.id,
        platformMessageId: payload.message.mid,
        senderType,
        senderPlatformId,
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

    // Extract entry.id which represents the Instagram page/account owner
    return {
      entryId: entry.id,
      ...messaging,
    } as MessageEventPayload;
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
    pageId: string,
  ): Promise<Conversation> {
    // Try to find existing conversation
    // Use pageId (platform_account_id) to group conversations correctly
    const platformConversationId = `${pageId}_${participantPlatformId}`;

    let conversation = await this.conversationRepository.findByPlatformId(
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
        pageId,
        createdViaWebhook: true,
      },
    });

    return await this.conversationRepository.create(conversation);
  }
}

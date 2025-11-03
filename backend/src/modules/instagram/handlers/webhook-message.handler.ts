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
  Attachment,
  AttachmentType,
} from '../../../domain/entities/message.entity';
import { InstagramWebhookEvent } from '../../../domain/entities/instagram-webhook-event.entity';
import { ConversationService } from '../../messaging/services/conversation.service';
import { InstagramApiService } from '../services/instagram-api.service';

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
    private readonly conversationService: ConversationService,
    private readonly instagramApiService: InstagramApiService,
  ) {}

  async processMessageEvent(
    event: InstagramWebhookEvent,
    clientAccountId: string,
  ): Promise<void> {
    try {
      const payload = this.extractMessagePayload(event);

      if (!payload) {
        this.logger.warn(
          `Unable to extract message payload from event ${event.id}`,
        );
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

      // Enrich participant profile if missing
      if (
        !conversation.participantUsername ||
        !conversation.participantProfilePic
      ) {
        this.logger.log(
          `Attempting to enrich participant profile for conversation ${conversation.id}`,
        );

        // Call enrichment in background - don't await to avoid blocking message processing
        this.conversationService
          .enrichParticipantProfile(conversation.id, clientAccountId)
          .then((result) => {
            if (result.enriched) {
              this.logger.log(
                `Successfully enriched participant profile for conversation ${conversation.id}`,
              );
            } else {
              this.logger.debug(
                `Participant profile enrichment skipped or failed for conversation ${conversation.id}: ${result.error}`,
              );
            }
          })
          .catch((error) => {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            this.logger.warn(
              `Unexpected error during participant profile enrichment for conversation ${conversation.id}: ${errorMessage}`,
            );
          });
      }

      // Determine message type
      const messageType = this.determineMessageType(payload.message);

      // Create message with correct sender type
      const senderType = isFromCustomer ? SenderType.CUSTOMER : SenderType.USER;
      const senderPlatformId = payload.sender.id;

      this.logger.log(
        `Creating message ${payload.message.mid} with senderType=${senderType}, senderPlatformId=${senderPlatformId}`,
      );

      // Find replied-to message if this is a reply
      let repliedToMessageId: string | undefined;
      if (payload.message.reply_to?.mid) {
        try {
          const repliedMessage = await this.messageRepository.findByPlatformId(
            payload.message.reply_to.mid,
          );
          if (repliedMessage) {
            repliedToMessageId = repliedMessage.id;
            this.logger.log(
              `Message ${payload.message.mid} is a reply to ${repliedMessage.id}`,
            );
          } else {
            this.logger.warn(
              `Replied message with platformMessageId ${payload.message.reply_to.mid} not found`,
            );
          }
        } catch (error) {
          this.logger.warn(
            `Error finding replied message: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      const message = Message.create({
        conversationId: conversation.id,
        platformMessageId: payload.message.mid,
        senderType,
        senderPlatformId,
        messageType,
        content: payload.message.text,
        mediaUrl: this.extractMediaUrl(payload.message),
        mediaType: this.extractMediaType(payload.message),
        attachments: this.extractAttachments(payload.message),
        sentAt: new Date(payload.timestamp),
        repliedToMessageId,
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

  /**
   * Extracts and converts Instagram attachments to our Attachment[] format
   */
  private extractAttachments(message: any): Attachment[] {
    if (!message.attachments || message.attachments.length === 0) {
      return [];
    }

    return message.attachments.map((attachment: any) => {
      let attachmentType: AttachmentType;

      switch (attachment.type) {
        case 'image':
          attachmentType = AttachmentType.IMAGE;
          break;
        case 'video':
          attachmentType = AttachmentType.VIDEO;
          break;
        case 'audio':
          attachmentType = AttachmentType.AUDIO;
          break;
        default:
          attachmentType = AttachmentType.DOCUMENT;
          break;
      }

      return {
        url: attachment.payload?.url || '',
        type: attachmentType,
        metadata: {
          originalType: attachment.type,
          ...(attachment.payload || {}),
        },
      };
    });
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

    const createdConversation =
      await this.conversationRepository.create(conversation);

    // Try to enrich participant profile immediately after creation
    try {
      this.logger.log(
        `Fetching participant profile data for conversation ${createdConversation.id}`,
      );

      const conversationsResponse =
        await this.instagramApiService.getConversations(clientAccountId, {
          limit: 100,
        });

      // Find the specific conversation in the response
      const instagramConv = conversationsResponse.data?.find((conv) =>
        conv.participants?.data?.some((p) => p.id === participantPlatformId),
      );

      if (instagramConv) {
        // Find the participant in the conversation
        const participant = instagramConv.participants?.data?.find(
          (p) => p.id === participantPlatformId,
        );

        if (participant && participant.username && participant.profile_pic) {
          this.logger.log(
            `Enriching conversation ${createdConversation.id} with participant data: ${participant.username}`,
          );

          createdConversation.updateParticipantProfile(
            participant.username,
            participant.profile_pic,
          );

          await this.conversationRepository.update(createdConversation);

          this.logger.log(
            `Successfully enriched conversation ${createdConversation.id}`,
          );
        } else {
          this.logger.warn(
            `Participant ${participantPlatformId} found but missing username or profile_pic`,
          );
        }
      } else {
        this.logger.warn(
          `Conversation with participant ${participantPlatformId} not found in API response`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to enrich participant profile for conversation ${createdConversation.id}: ${errorMessage}. Will retry via background enrichment.`,
      );
      // Don't throw - allow conversation creation to succeed even if enrichment fails
    }

    return createdConversation;
  }
}

import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { IConversationRepository } from '../../../domain/repositories/conversation.repository.interface';
import { IMessageRepository } from '../../../domain/repositories/message.repository.interface';
import { IClientAccountRepository } from '../../../domain/repositories/client-account.repository.interface';
import {
  Conversation,
  ConversationStatus,
} from '../../../domain/entities/conversation.entity';
import { InstagramApiService } from '../../instagram/services/instagram-api.service';

export interface ConversationFilters {
  status?: ConversationStatus;
  hasUnread?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ConversationListResult {
  conversations: Conversation[];
  total: number;
  limit: number;
  offset: number;
}

export interface EnrichmentStatus {
  enriched: boolean;
  error?: string;
}

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @Inject('IConversationRepository')
    private readonly conversationRepository: IConversationRepository,
    @Inject('IMessageRepository')
    private readonly messageRepository: IMessageRepository,
    @Inject('IClientAccountRepository')
    private readonly clientAccountRepository: IClientAccountRepository,
    private readonly instagramApiService: InstagramApiService,
  ) {}

  async listConversations(
    userId: string,
    clientAccountId: string,
    filters: ConversationFilters = {},
  ): Promise<ConversationListResult> {
    await this.verifyAccountAccess(userId, clientAccountId);

    const { status, hasUnread, limit = 50, offset = 0 } = filters;

    const conversations = await this.conversationRepository.findByClientAccount(
      clientAccountId,
      {
        status,
        hasUnread,
        limit,
        offset,
      },
    );

    const total = conversations.length;

    return {
      conversations,
      total,
      limit,
      offset,
    };
  }

  async getConversation(
    userId: string,
    conversationId: string,
  ): Promise<Conversation> {
    const conversation =
      await this.conversationRepository.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    await this.verifyAccountAccess(userId, conversation.clientAccountId);

    return conversation;
  }

  async markAsRead(
    userId: string,
    conversationId: string,
  ): Promise<Conversation> {
    const conversation = await this.getConversation(userId, conversationId);

    await this.messageRepository.markAllAsReadByConversation(conversationId);

    conversation.markAllAsRead();
    await this.conversationRepository.update(conversation);

    return conversation;
  }

  async enrichParticipantProfile(
    conversationId: string,
    accountId: string,
  ): Promise<EnrichmentStatus> {
    try {
      // Find the conversation
      const conversation =
        await this.conversationRepository.findById(conversationId);

      if (!conversation) {
        this.logger.warn(
          `Conversation ${conversationId} not found for enrichment`,
        );
        return { enriched: false, error: 'Conversation not found' };
      }

      // Check if we have participantPlatformId
      if (!conversation.participantPlatformId) {
        this.logger.warn(
          `Conversation ${conversationId} has no participantPlatformId`,
        );
        return {
          enriched: false,
          error: 'Missing participant platform ID',
        };
      }

      // Check if already enriched
      if (conversation.participantUsername && conversation.participantProfilePic) {
        this.logger.debug(
          `Conversation ${conversationId} already has participant profile data`,
        );
        return { enriched: false, error: 'Already enriched' };
      }

      // Fetch profile from Instagram API
      const profile = await this.instagramApiService.getUserProfileById(
        accountId,
        conversation.participantPlatformId,
      );

      if (!profile) {
        this.logger.warn(
          `Failed to fetch profile for participant ${conversation.participantPlatformId}`,
        );
        return { enriched: false, error: 'Profile not found in Instagram API' };
      }

      // Check if we have the required fields
      if (!profile.username || !profile.profile_picture_url) {
        this.logger.warn(
          `Incomplete profile data for participant ${conversation.participantPlatformId}`,
        );
        return {
          enriched: false,
          error: 'Incomplete profile data from Instagram API',
        };
      }

      // Update the conversation with profile data
      conversation.updateParticipantProfile(
        profile.username,
        profile.profile_picture_url,
      );

      await this.conversationRepository.update(conversation);

      this.logger.log(
        `Successfully enriched conversation ${conversationId} with participant profile data`,
      );

      return { enriched: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error enriching conversation ${conversationId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      return { enriched: false, error: errorMessage };
    }
  }

  private async verifyAccountAccess(
    userId: string,
    clientAccountId: string,
  ): Promise<void> {
    const account =
      await this.clientAccountRepository.findById(clientAccountId);

    if (!account) {
      throw new NotFoundException(
        `Client account ${clientAccountId} not found`,
      );
    }

    if ((account as any).userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this client account',
      );
    }
  }
}

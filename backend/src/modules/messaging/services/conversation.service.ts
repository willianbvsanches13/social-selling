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
      if (
        conversation.participantUsername &&
        conversation.participantProfilePic
      ) {
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

  async enrichAllConversations(clientAccountId: string): Promise<{
    total: number;
    enriched: number;
    failed: number;
    skipped: number;
  }> {
    this.logger.log(
      `Starting batch enrichment for client account ${clientAccountId}`,
    );

    const conversations = await this.conversationRepository.findByClientAccount(
      clientAccountId,
      { limit: 1000, offset: 0 },
    );

    let enriched = 0;
    let failed = 0;
    let skipped = 0;

    // Fetch all conversations from Instagram API once
    try {
      const conversationsResponse =
        await this.instagramApiService.getConversations(clientAccountId, {
          limit: 100,
        });

      for (const conversation of conversations) {
        // Skip if already enriched
        if (
          conversation.participantUsername &&
          conversation.participantProfilePic
        ) {
          skipped++;
          continue;
        }

        try {
          // Find the conversation in Instagram API response
          const instagramConv = conversationsResponse.data?.find((conv) =>
            conv.participants?.data?.some(
              (p) => p.id === conversation.participantPlatformId,
            ),
          );

          if (instagramConv) {
            const participant = instagramConv.participants?.data?.find(
              (p) => p.id === conversation.participantPlatformId,
            );

            if (
              participant &&
              participant.username &&
              participant.profile_pic
            ) {
              conversation.updateParticipantProfile(
                participant.username,
                participant.profile_pic,
              );

              await this.conversationRepository.update(conversation);
              enriched++;

              this.logger.log(
                `Enriched conversation ${conversation.id} with participant ${participant.username}`,
              );
            } else {
              this.logger.warn(
                `Participant data incomplete for conversation ${conversation.id}`,
              );
              failed++;
            }
          } else {
            this.logger.warn(
              `Conversation not found in Instagram API for ${conversation.id}`,
            );
            failed++;
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to enrich conversation ${conversation.id}: ${errorMessage}`,
          );
          failed++;
        }

        // Rate limiting: wait 100ms between updates
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to fetch conversations from Instagram API: ${errorMessage}`,
      );
      throw new BadRequestException(
        `Failed to enrich conversations: ${errorMessage}`,
      );
    }

    const result = {
      total: conversations.length,
      enriched,
      failed,
      skipped,
    };

    this.logger.log(`Batch enrichment completed: ${JSON.stringify(result)}`);

    return result;
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

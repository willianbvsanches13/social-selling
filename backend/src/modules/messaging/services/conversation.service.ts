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

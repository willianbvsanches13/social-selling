import { Conversation, ConversationStatus } from '../entities/conversation.entity';

export interface FindConversationsOptions {
  clientAccountId?: string;
  status?: ConversationStatus;
  hasUnread?: boolean;
  limit?: number;
  offset?: number;
}

export interface IConversationRepository {
  findById(id: string): Promise<Conversation | null>;
  findByPlatformId(clientAccountId: string, platformConversationId: string): Promise<Conversation | null>;
  findByClientAccount(clientAccountId: string, options?: FindConversationsOptions): Promise<Conversation[]>;
  create(conversation: Conversation): Promise<Conversation>;
  update(conversation: Conversation): Promise<Conversation>;
  countUnread(clientAccountId: string): Promise<number>;
  findStaleConversations(days: number): Promise<Conversation[]>;
}

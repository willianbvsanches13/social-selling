'use client';

import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import {
  Conversation,
  Message,
  ConversationFilters,
  MessageFilters,
  SendMessageRequest,
  ConversationListResponse,
  MessageListResponse,
} from '@/types/message';

export const messagingApi = {
  /**
   * List conversations with optional filters
   */
  async listConversations(
    filters: ConversationFilters
  ): Promise<ConversationListResponse> {
    const params = new URLSearchParams();

    params.append('clientAccountId', filters.clientAccountId);
    if (filters.status) params.append('status', filters.status);
    if (filters.hasUnread !== undefined) params.append('hasUnread', String(filters.hasUnread));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.offset) params.append('offset', String(filters.offset));

    const response = await apiClient.get<ConversationListResponse>(
      `${API_ENDPOINTS.CONVERSATIONS}?${params.toString()}`
    );
    return response.data!;
  },

  /**
   * Get a specific conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation> {
    const response = await apiClient.get<Conversation>(
      API_ENDPOINTS.CONVERSATION_DETAIL(conversationId)
    );
    return response.data!;
  },

  /**
   * List messages in a conversation
   */
  async listMessages(
    conversationId: string,
    filters?: MessageFilters
  ): Promise<MessageListResponse> {
    const params = new URLSearchParams();

    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));

    const url = `${API_ENDPOINTS.CONVERSATION_MESSAGES(conversationId)}${
      params.toString() ? `?${params.toString()}` : ''
    }`;

    const response = await apiClient.get<MessageListResponse>(url);
    return response.data!;
  },

  /**
   * Send a text message in a conversation
   */
  async sendMessage(
    conversationId: string,
    data: SendMessageRequest
  ): Promise<Message> {
    const response = await apiClient.post<Message>(
      API_ENDPOINTS.CONVERSATION_SEND_MESSAGE(conversationId),
      data
    );
    return response.data!;
  },

  /**
   * Mark all messages in a conversation as read
   */
  async markConversationAsRead(conversationId: string): Promise<Conversation> {
    const response = await apiClient.patch<Conversation>(
      API_ENDPOINTS.CONVERSATION_READ(conversationId)
    );
    return response.data!;
  },
};

export default messagingApi;

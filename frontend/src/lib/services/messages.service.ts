import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  Conversation,
  Message,
  MessageTemplate,
  SendMessageRequest,
  ConversationFilters,
  MessageFilters,
  ConversationListResponse,
  MessageListResponse,
} from '@/types/message';

export const messagesService = {
  /**
   * Get list of conversations
   */
  async getConversations(
    accountId: string,
    params?: ConversationFilters
  ): Promise<ConversationListResponse> {
    const response = await apiClient.get<ConversationListResponse>(
      API_ENDPOINTS.CONVERSATIONS,
      { params: { accountId, ...params } }
    );
    return response.data!;
  },

  /**
   * Get single conversation by ID
   */
  async getConversation(id: string): Promise<Conversation> {
    const response = await apiClient.get<Conversation>(
      API_ENDPOINTS.CONVERSATION_DETAIL(id)
    );
    return response.data!;
  },

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: string,
    params?: MessageFilters
  ): Promise<MessageListResponse> {
    const response = await apiClient.get<MessageListResponse>(
      API_ENDPOINTS.CONVERSATION_MESSAGES(conversationId),
      { params }
    );
    return response.data!;
  },

  /**
   * Send a new message
   */
  async sendMessage(conversationId: string, data: SendMessageRequest): Promise<Message> {
    const response = await apiClient.post<Message>(
      API_ENDPOINTS.CONVERSATION_SEND_MESSAGE(conversationId),
      data
    );
    return response.data!;
  },

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.CONVERSATION_READ(conversationId));
  },

  // TODO: Implement archive/unarchive endpoints in backend
  // /**
  //  * Archive a conversation
  //  */
  // async archiveConversation(conversationId: string): Promise<void> {
  //   await apiClient.post(API_ENDPOINTS.CONVERSATION_ARCHIVE(conversationId));
  // },

  // /**
  //  * Unarchive a conversation
  //  */
  // async unarchiveConversation(conversationId: string): Promise<void> {
  //   await apiClient.post(API_ENDPOINTS.CONVERSATION_UNARCHIVE(conversationId));
  // },

  /**
   * Get message templates
   */
  async getTemplates(): Promise<MessageTemplate[]> {
    const response = await apiClient.get<MessageTemplate[]>(
      API_ENDPOINTS.MESSAGE_TEMPLATES
    );
    return response.data || [];
  },

  /**
   * Upload media file for message
   */
  async uploadMedia(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.upload<{ url: string }>(
      API_ENDPOINTS.MESSAGE_UPLOAD,
      formData
    );
    return response.data!;
  },
};

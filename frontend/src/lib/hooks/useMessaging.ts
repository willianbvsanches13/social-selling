'use client';

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { messagingApi } from '@/lib/api/messaging';
import {
  Conversation,
  Message,
  ConversationFilters,
  MessageFilters,
  SendMessageRequest,
  ConversationListResponse,
  MessageListResponse,
} from '@/types/message';

// Query keys for caching
export const messagingKeys = {
  all: ['messaging'] as const,
  conversations: () => [...messagingKeys.all, 'conversations'] as const,
  conversationsList: (filters: ConversationFilters) =>
    [...messagingKeys.conversations(), { filters }] as const,
  conversationDetail: (id: string) =>
    [...messagingKeys.conversations(), id] as const,
  messages: () => [...messagingKeys.all, 'messages'] as const,
  messagesList: (conversationId: string, filters?: MessageFilters) =>
    [...messagingKeys.messages(), conversationId, { filters }] as const,
};

/**
 * Hook to fetch list of conversations
 */
export function useConversations(
  filters: ConversationFilters,
  options?: Omit<UseQueryOptions<ConversationListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: messagingKeys.conversationsList(filters),
    queryFn: () => messagingApi.listConversations(filters),
    ...options,
  });
}

/**
 * Hook to fetch a specific conversation
 */
export function useConversation(
  conversationId: string,
  options?: Omit<UseQueryOptions<Conversation>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: messagingKeys.conversationDetail(conversationId),
    queryFn: () => messagingApi.getConversation(conversationId),
    enabled: !!conversationId,
    ...options,
  });
}

/**
 * Hook to fetch messages in a conversation
 */
export function useMessages(
  conversationId: string,
  filters?: MessageFilters,
  options?: Omit<UseQueryOptions<MessageListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: messagingKeys.messagesList(conversationId, filters),
    queryFn: () => messagingApi.listMessages(conversationId, filters),
    enabled: !!conversationId,
    ...options,
  });
}

/**
 * Hook to send a message
 */
export function useSendMessage(
  options?: UseMutationOptions<
    Message,
    Error,
    { conversationId: string; data: SendMessageRequest }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, data }) =>
      messagingApi.sendMessage(conversationId, data),
    onSuccess: (message, variables) => {
      // Invalidate and refetch messages for this conversation
      queryClient.invalidateQueries({
        queryKey: messagingKeys.messagesList(variables.conversationId),
      });

      // Invalidate conversations list to update last message
      queryClient.invalidateQueries({
        queryKey: messagingKeys.conversations(),
      });

      // Update conversation detail to reflect new last message
      queryClient.invalidateQueries({
        queryKey: messagingKeys.conversationDetail(variables.conversationId),
      });
    },
    ...options,
  });
}

/**
 * Hook to mark conversation as read
 */
export function useMarkConversationAsRead(
  options?: UseMutationOptions<Conversation, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      messagingApi.markConversationAsRead(conversationId),
    onSuccess: (conversation, conversationId) => {
      // Update conversation in cache
      queryClient.setQueryData(
        messagingKeys.conversationDetail(conversationId),
        conversation
      );

      // Invalidate messages to update read status
      queryClient.invalidateQueries({
        queryKey: messagingKeys.messagesList(conversationId),
      });

      // Invalidate conversations list to update unread count
      queryClient.invalidateQueries({
        queryKey: messagingKeys.conversations(),
      });
    },
    ...options,
  });
}

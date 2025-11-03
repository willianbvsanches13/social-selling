'use client';

import React, { useState } from 'react';
import { Search, Send, MoreVertical } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { AccountSelector } from '@/components/instagram/AccountSelector';
import { ConversationList } from '@/components/messages/ConversationList';
import { MessageThread } from '@/components/messages/MessageThread';
import { MessageInput } from '@/components/messages/MessageInput';
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkConversationAsRead,
} from '@/lib/hooks/useMessaging';
import { useToast } from '@/lib/hooks/useToast';
import type { Conversation } from '@/types/message';
import { ConversationStatus } from '@/types/message';
import { Button } from '@/components/ui/button';

export default function InboxPage() {
  const { success, error: showError } = useToast();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Fetch conversations using React Query
  const {
    data: conversationsData,
    isLoading: isLoadingConversations,
    error: conversationsError,
  } = useConversations(
    {
      clientAccountId: selectedAccountId,
      status: showArchived ? ConversationStatus.ARCHIVED : ConversationStatus.OPEN,
      limit: 50,
      offset: 0,
    },
    {
      enabled: !!selectedAccountId,
      refetchInterval: 30000, // Poll every 30 seconds
    }
  );

  // Fetch messages for selected conversation
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useMessages(
    selectedConversation?.id || '',
    { limit: 100, offset: 0 },
    {
      enabled: !!selectedConversation,
      refetchInterval: 15000, // Poll every 15 seconds
    }
  );

  // Send message mutation
  const sendMessageMutation = useSendMessage({
    onSuccess: (data, variables) => {
      console.log('✅ Message sent successfully:', {
        messageId: data.id,
        conversationId: variables.conversationId,
        text: variables.data.text,
      });
      success('Message sent successfully');
    },
    onError: (error: any, variables) => {
      console.error('❌ Failed to send message:', {
        error,
        errorMessage: error.message,
        errorStatus: error.status,
        conversationId: variables.conversationId,
        messageText: variables.data.text,
        fullError: error,
      });

      // Check for 24-hour window error
      if (error.message?.includes('24-hour') || error.message?.includes('response window')) {
        showError('Cannot send message: 24-hour response window has expired. Wait for customer to message you first.');
      } else if (error.status === 401 || error.status === 403) {
        showError('Authentication error. Please reconnect your Instagram account.');
      } else {
        showError(error.message || 'Failed to send message. Check console for details.');
      }
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMarkConversationAsRead({
    onError: (error: any) => {
      showError(error.message || 'Failed to mark conversation as read');
    },
  });

  // Handle conversation selection
  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);

    // Mark as read if there are unread messages
    if (conversation.unreadCount > 0) {
      markAsReadMutation.mutate(conversation.id);
    }
  };

  // Handle send message
  const handleSendMessage = async (text: string) => {
    if (!selectedConversation) {
      console.warn('⚠️ Cannot send message: No conversation selected');
      return;
    }

    console.log('📤 Attempting to send message:', {
      conversationId: selectedConversation.id,
      participantUsername: selectedConversation.participantUsername,
      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      textLength: text.length,
    });

    sendMessageMutation.mutate({
      conversationId: selectedConversation.id,
      data: { text },
    });
  };

  // Handle archive (placeholder - would need backend endpoint)
  const handleArchive = async (conversation: Conversation) => {
    // TODO: Implement archive endpoint
    success('Archive feature coming soon');
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <PageHeader
        title="Inbox"
        description="Manage your Instagram direct messages"
        action={
          <AccountSelector
            selectedAccountId={selectedAccountId}
            onSelect={setSelectedAccountId}
          />
        }
      />

      {!selectedAccountId ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Send}
            title="Select an Instagram account"
            description="Choose an account from the dropdown to view your messages"
          />
        </div>
      ) : (
        <div className="flex flex-1 gap-6 overflow-hidden">
          {/* Conversations List */}
          <div className="w-80 flex-shrink-0">
            <div className="flex h-full flex-col rounded-lg border bg-white">
              {/* Search */}
              <div className="border-b p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Filter Tabs */}
                <div className="mt-3 flex gap-2">
                  <Button
                    variant={!showArchived ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowArchived(false)}
                    className="flex-1"
                  >
                    Active
                  </Button>
                  <Button
                    variant={showArchived ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowArchived(true)}
                    className="flex-1"
                  >
                    Archived
                  </Button>
                </div>
              </div>

              {/* Conversation List */}
              <ConversationList
                conversations={conversationsData?.conversations || []}
                selectedConversation={selectedConversation}
                isLoading={isLoadingConversations}
                onSelect={handleConversationSelect}
                onArchive={handleArchive}
              />
            </div>
          </div>

          {/* Message Thread */}
          <div className="flex flex-1 flex-col rounded-lg border bg-white">
            {selectedConversation ? (
              <>
                {/* Thread Header */}
                <div className="flex items-center justify-between border-b p-4">
                  <div className="flex items-center gap-3">
                    {selectedConversation.participantProfilePic && (
                      <img
                        src={selectedConversation.participantProfilePic}
                        alt={selectedConversation.participantUsername || 'User'}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {selectedConversation.participantUsername || 'Unknown User'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        @{selectedConversation.participantUsername || 'unknown'}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5 text-gray-600" />
                  </Button>
                </div>

                {/* Messages */}
                <MessageThread
                  messages={messagesData?.messages || []}
                  isLoading={isLoadingMessages}
                  conversation={selectedConversation}
                />

                {/* Message Input */}
                <MessageInput
                  onSend={handleSendMessage}
                  disabled={sendMessageMutation.isPending}
                />
              </>
            ) : (
              <EmptyState
                icon={Send}
                title="No conversation selected"
                description="Select a conversation from the list to view messages"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Send, MoreVertical } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { AccountSelector } from '@/components/instagram/AccountSelector';
import { ConversationList } from '@/components/messages/ConversationList';
import { MessageThread } from '@/components/messages/MessageThread';
import { MessageInput } from '@/components/messages/MessageInput';
import { messagesService } from '@/lib/services/messages.service';
import { useToast } from '@/lib/hooks/useToast';
import type { Conversation, Message } from '@/types/message';
import { Button } from '@/components/ui/button';

export default function InboxPage() {
  const { success, error: showError } = useToast();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Fetch conversations when account changes
  const fetchConversations = useCallback(async () => {
    if (!selectedAccountId) return;

    try {
      setIsLoadingConversations(true);
      const { data } = await messagesService.getConversations(selectedAccountId, {
        search: searchQuery,
        isArchived: showArchived,
      });
      setConversations(data);
    } catch (err: any) {
      showError(err.message || 'Failed to load conversations');
    } finally {
      setIsLoadingConversations(false);
    }
  }, [selectedAccountId, searchQuery, showArchived, showError]);

  useEffect(() => {
    if (selectedAccountId) {
      fetchConversations();
    }
  }, [selectedAccountId, showArchived, searchQuery, fetchConversations]);

  // Fetch messages when conversation changes
  const fetchMessages = useCallback(
    async (silent = false) => {
      if (!selectedConversation) return;

      try {
        if (!silent) setIsLoadingMessages(true);
        const { data } = await messagesService.getMessages(selectedConversation.id);
        setMessages(data);

        // Mark as read
        if (selectedConversation.unreadCount > 0) {
          await messagesService.markAsRead(selectedConversation.id);
          // Update conversation in list
          setConversations((prev) =>
            prev.map((c) =>
              c.id === selectedConversation.id ? { ...c, unreadCount: 0 } : c
            )
          );
        }
      } catch (err: any) {
        if (!silent) {
          showError(err.message || 'Failed to load messages');
        }
      } finally {
        if (!silent) setIsLoadingMessages(false);
      }
    },
    [selectedConversation, showError]
  );

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
    }
  }, [selectedConversation, fetchMessages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!selectedConversation) return;

    const interval = setInterval(() => {
      fetchMessages(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedConversation, fetchMessages]);

  // Poll for conversation updates every 10 seconds
  useEffect(() => {
    if (!selectedAccountId) return;

    const interval = setInterval(() => {
      fetchConversations();
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedAccountId, fetchConversations]);

  const handleSendMessage = async (text: string, mediaUrl?: string) => {
    if (!selectedConversation) return;

    try {
      setIsSending(true);
      const newMessage = await messagesService.sendMessage({
        conversationId: selectedConversation.id,
        text,
        mediaUrl,
      });
      setMessages((prev) => [...prev, newMessage]);
      success('Message sent');
    } catch (err: any) {
      showError(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleArchive = async (conversation: Conversation) => {
    try {
      await messagesService.archiveConversation(conversation.id);
      setConversations((prev) => prev.filter((c) => c.id !== conversation.id));
      if (selectedConversation?.id === conversation.id) {
        setSelectedConversation(null);
        setMessages([]);
      }
      success('Conversation archived');
    } catch (err: any) {
      showError(err.message || 'Failed to archive conversation');
    }
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setMessages([]); // Clear messages while loading
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
                conversations={conversations}
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
                    <img
                      src={selectedConversation.participantProfilePic}
                      alt={selectedConversation.participantName}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {selectedConversation.participantName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        @{selectedConversation.participantUsername}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5 text-gray-600" />
                  </Button>
                </div>

                {/* Messages */}
                <MessageThread
                  messages={messages}
                  isLoading={isLoadingMessages}
                  currentUserId={selectedAccountId}
                />

                {/* Message Input */}
                <MessageInput onSend={handleSendMessage} disabled={isSending} />
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

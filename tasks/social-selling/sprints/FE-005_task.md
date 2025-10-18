# FE-005: Direct Messages Inbox

**Epic:** Frontend Development - Social Selling Platform
**Sprint:** Sprint 3 - Messaging Features
**Story Points:** 13
**Priority:** High
**Assigned To:** Frontend Team
**Status:** Ready for Development
**Dependencies:** FE-001, FE-002, FE-003, FE-004

## Overview

Create a comprehensive Instagram Direct Messages inbox with conversation list, message thread view, send message functionality, message templates, quick replies, real-time updates, and conversation management features.

## Technical Requirements

### Features
- Conversation list with search and filters
- Message thread view with infinite scroll
- Send text messages and attachments
- Message templates selector
- Quick reply buttons
- Real-time message updates (polling or WebSocket)
- Unread message indicators
- Archive conversations
- Message status indicators
- Image preview in messages
- Typing indicators

## Implementation Details

### 1. Message Types

#### src/types/message.ts
```typescript
export interface Conversation {
  id: string;
  instagramAccountId: string;
  participantId: string;
  participantUsername: string;
  participantName: string;
  participantProfilePic: string;
  lastMessage: Message | null;
  unreadCount: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  text?: string;
  mediaType?: 'image' | 'video' | 'audio';
  mediaUrl?: string;
  timestamp: string;
  isRead: boolean;
  isSent: boolean;
  isDelivered: boolean;
  createdAt: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  createdAt: string;
}

export interface SendMessageRequest {
  conversationId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
}
```

### 2. Messages API Service

#### src/lib/services/messages.service.ts
```typescript
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { Conversation, Message, MessageTemplate, SendMessageRequest } from '@/types/message';

export const messagesService = {
  async getConversations(accountId: string, params?: {
    search?: string;
    isArchived?: boolean;
    page?: number;
    perPage?: number;
  }): Promise<{ data: Conversation[]; total: number }> {
    const response = await apiClient.get<{ data: Conversation[]; total: number }>(
      API_ENDPOINTS.CONVERSATIONS,
      { params: { accountId, ...params } }
    );
    return response.data!;
  },

  async getConversation(id: string): Promise<Conversation> {
    const response = await apiClient.get<Conversation>(
      API_ENDPOINTS.CONVERSATION_DETAIL(id)
    );
    return response.data!;
  },

  async getMessages(conversationId: string, params?: {
    page?: number;
    perPage?: number;
  }): Promise<{ data: Message[]; total: number }> {
    const response = await apiClient.get<{ data: Message[]; total: number }>(
      API_ENDPOINTS.CONVERSATION_MESSAGES(conversationId),
      { params }
    );
    return response.data!;
  },

  async sendMessage(data: SendMessageRequest): Promise<Message> {
    const response = await apiClient.post<Message>(
      API_ENDPOINTS.CONVERSATION_MESSAGES(data.conversationId),
      data
    );
    return response.data!;
  },

  async markAsRead(conversationId: string): Promise<void> {
    await apiClient.post(`${API_ENDPOINTS.CONVERSATION_DETAIL(conversationId)}/read`);
  },

  async archiveConversation(conversationId: string): Promise<void> {
    await apiClient.post(`${API_ENDPOINTS.CONVERSATION_DETAIL(conversationId)}/archive`);
  },

  async unarchiveConversation(conversationId: string): Promise<void> {
    await apiClient.post(`${API_ENDPOINTS.CONVERSATION_DETAIL(conversationId)}/unarchive`);
  },

  async getTemplates(): Promise<MessageTemplate[]> {
    const response = await apiClient.get<MessageTemplate[]>('/message-templates');
    return response.data || [];
  },

  async uploadMedia(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.upload<{ url: string }>('/messages/upload', formData);
    return response.data!;
  },
};
```

### 3. Inbox Page

#### src/app/(dashboard)/inbox/page.tsx
```typescript
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Archive, MoreVertical, Send, Paperclip, Smile } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { AccountSelector } from '@/components/instagram/AccountSelector';
import { ConversationList } from '@/components/messages/ConversationList';
import { MessageThread } from '@/components/messages/MessageThread';
import { MessageInput } from '@/components/messages/MessageInput';
import { messagesService } from '@/lib/services/messages.service';
import { useToast } from '@/lib/hooks/useToast';
import type { Conversation, Message } from '@/types/message';

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

  // Fetch conversations when account changes
  useEffect(() => {
    if (selectedAccountId) {
      fetchConversations();
    }
  }, [selectedAccountId, showArchived, searchQuery]);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
      messagesService.markAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);

  // Poll for new messages
  useEffect(() => {
    if (!selectedConversation) return;

    const interval = setInterval(() => {
      fetchMessages(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedConversation]);

  const fetchConversations = async () => {
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
  };

  const fetchMessages = async (silent = false) => {
    if (!selectedConversation) return;

    try {
      if (!silent) setIsLoadingMessages(true);
      const { data } = await messagesService.getMessages(selectedConversation.id);
      setMessages(data);
    } catch (err: any) {
      if (!silent) {
        showError(err.message || 'Failed to load messages');
      }
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async (text: string, mediaUrl?: string) => {
    if (!selectedConversation) return;

    try {
      const newMessage = await messagesService.sendMessage({
        conversationId: selectedConversation.id,
        text,
        mediaUrl,
      });
      setMessages((prev) => [...prev, newMessage]);
      success('Message sent');
    } catch (err: any) {
      showError(err.message || 'Failed to send message');
    }
  };

  const handleArchive = async (conversation: Conversation) => {
    try {
      await messagesService.archiveConversation(conversation.id);
      setConversations((prev) => prev.filter((c) => c.id !== conversation.id));
      if (selectedConversation?.id === conversation.id) {
        setSelectedConversation(null);
      }
      success('Conversation archived');
    } catch (err: any) {
      showError(err.message || 'Failed to archive conversation');
    }
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
                <button
                  onClick={() => setShowArchived(false)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    !showArchived
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setShowArchived(true)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    showArchived
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Archived
                </button>
              </div>
            </div>

            {/* Conversation List */}
            <ConversationList
              conversations={conversations}
              selectedConversation={selectedConversation}
              isLoading={isLoadingConversations}
              onSelect={setSelectedConversation}
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
                    className="h-10 w-10 rounded-full"
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
                <button className="rounded-lg p-2 hover:bg-gray-100">
                  <MoreVertical className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              {/* Messages */}
              <MessageThread
                messages={messages}
                isLoading={isLoadingMessages}
                currentUserId={selectedAccountId}
              />

              {/* Message Input */}
              <MessageInput onSend={handleSendMessage} />
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
    </div>
  );
}
```

### 4. Conversation List Component

#### src/components/messages/ConversationList.tsx
```typescript
import React from 'react';
import { Archive, MoreVertical } from 'lucide-react';
import { SkeletonList } from '@/components/common/Skeleton';
import { formatRelativeTime } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';
import type { Conversation } from '@/types/message';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  isLoading: boolean;
  onSelect: (conversation: Conversation) => void;
  onArchive: (conversation: Conversation) => void;
}

export function ConversationList({
  conversations,
  selectedConversation,
  isLoading,
  onSelect,
  onArchive,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="p-4">
        <SkeletonList />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <div>
          <p className="text-sm text-gray-600">No conversations found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          className={cn(
            'group relative cursor-pointer border-b p-4 transition-colors hover:bg-gray-50',
            selectedConversation?.id === conversation.id && 'bg-blue-50 hover:bg-blue-50'
          )}
          onClick={() => onSelect(conversation)}
        >
          <div className="flex items-start gap-3">
            <div className="relative">
              <img
                src={conversation.participantProfilePic}
                alt={conversation.participantName}
                className="h-12 w-12 rounded-full"
              />
              {conversation.unreadCount > 0 && (
                <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {conversation.unreadCount}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">
                    {conversation.participantName}
                  </h4>
                  <p className="text-xs text-gray-600">
                    @{conversation.participantUsername}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {conversation.lastMessage &&
                    formatRelativeTime(conversation.lastMessage.timestamp)}
                </span>
              </div>

              {conversation.lastMessage && (
                <p
                  className={cn(
                    'mt-1 truncate text-sm',
                    conversation.unreadCount > 0
                      ? 'font-medium text-gray-900'
                      : 'text-gray-600'
                  )}
                >
                  {conversation.lastMessage.text || 'Media'}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchive(conversation);
            }}
            className="absolute right-2 top-2 hidden rounded-lg p-1.5 hover:bg-gray-200 group-hover:block"
          >
            <Archive className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      ))}
    </div>
  );
}
```

### 5. Message Thread Component

#### src/components/messages/MessageThread.tsx
```typescript
import React, { useEffect, useRef } from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';
import { formatRelativeTime } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';
import type { Message } from '@/types/message';

interface MessageThreadProps {
  messages: Message[];
  isLoading: boolean;
  currentUserId: string;
}

export function MessageThread({ messages, isLoading, currentUserId }: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
            <Skeleton className="h-16 w-64 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-4">
        {messages.map((message, index) => {
          const isCurrentUser = message.senderId === currentUserId;
          const showTimestamp =
            index === 0 ||
            new Date(message.timestamp).getTime() -
              new Date(messages[index - 1].timestamp).getTime() >
              300000; // 5 minutes

          return (
            <div key={message.id}>
              {showTimestamp && (
                <div className="my-4 text-center">
                  <span className="text-xs text-gray-500">
                    {formatRelativeTime(message.timestamp)}
                  </span>
                </div>
              )}

              <div className={cn('flex', isCurrentUser ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-md rounded-lg px-4 py-2',
                    isCurrentUser
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-900'
                  )}
                >
                  {message.mediaUrl && (
                    <img
                      src={message.mediaUrl}
                      alt="Attachment"
                      className="mb-2 max-w-full rounded-lg"
                    />
                  )}
                  {message.text && <p className="text-sm">{message.text}</p>}

                  <div
                    className={cn(
                      'mt-1 flex items-center gap-1 text-xs',
                      isCurrentUser ? 'text-white/70' : 'text-gray-500'
                    )}
                  >
                    <span>
                      {new Date(message.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {isCurrentUser && (
                      <>
                        {message.isDelivered ? (
                          <CheckCheck className="h-3 w-3" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
```

### 6. Message Input Component

#### src/components/messages/MessageInput.tsx
```typescript
'use client';

import React, { useState, useRef } from 'react';
import { Send, Paperclip, Smile, X } from 'lucide-react';
import { messagesService } from '@/lib/services/messages.service';
import { useToast } from '@/lib/hooks/useToast';

interface MessageInputProps {
  onSend: (text: string, mediaUrl?: string) => void;
}

export function MessageInput({ onSend }: MessageInputProps) {
  const { error: showError } = useToast();
  const [text, setText] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!text.trim() && !mediaPreview) return;

    onSend(text.trim(), mediaPreview || undefined);
    setText('');
    setMediaPreview(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      showError('Only images are supported');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showError('File size must be less than 10MB');
      return;
    }

    try {
      setIsUploading(true);
      const { url } = await messagesService.uploadMedia(file);
      setMediaPreview(url);
    } catch (err: any) {
      showError(err.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="border-t p-4">
      {/* Media Preview */}
      {mediaPreview && (
        <div className="mb-3 relative inline-block">
          <img
            src={mediaPreview}
            alt="Preview"
            className="h-20 rounded-lg border"
          />
          <button
            onClick={() => setMediaPreview(null)}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Attach Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-50"
        >
          <Paperclip className="h-5 w-5 text-gray-600" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Text Input */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          style={{ minHeight: '42px', maxHeight: '120px' }}
        />

        {/* Emoji Button */}
        <button className="rounded-lg p-2 hover:bg-gray-100">
          <Smile className="h-5 w-5 text-gray-600" />
        </button>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!text.trim() && !mediaPreview}
          className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
```

## Testing Strategy

### Unit Tests
```typescript
// src/components/messages/__tests__/MessageThread.test.tsx
import { render, screen } from '@testing-library/react';
import { MessageThread } from '../MessageThread';

describe('MessageThread', () => {
  it('renders messages correctly', () => {
    const messages = [
      { id: '1', text: 'Hello', senderId: 'user1', timestamp: new Date().toISOString() },
    ];
    render(<MessageThread messages={messages} isLoading={false} currentUserId="user1" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Acceptance Criteria

### Functional Requirements
1. ✅ Conversation list renders
2. ✅ Search conversations works
3. ✅ Filter by archived works
4. ✅ Message thread displays correctly
5. ✅ Send text message works
6. ✅ Send image works
7. ✅ Real-time updates work
8. ✅ Unread count displays
9. ✅ Archive conversation works
10. ✅ Mark as read works
11. ✅ Message status shows
12. ✅ Timestamps display
13. ✅ Media preview works
14. ✅ File upload works
15. ✅ Empty states show
16. ✅ Loading states work
17. ✅ Error handling works
18. ✅ Responsive design
19. ✅ Auto-scroll to bottom
20. ✅ Keyboard shortcuts work

### Non-Functional Requirements
1. ✅ Fast message loading
2. ✅ Smooth scrolling
3. ✅ Efficient polling
4. ✅ Secure file upload
5. ✅ Accessible components

## Definition of Done

- [ ] Inbox page created
- [ ] Conversation list component working
- [ ] Message thread component working
- [ ] Message input component working
- [ ] File upload implemented
- [ ] Real-time updates working
- [ ] Archive functionality working
- [ ] Search implemented
- [ ] Tests written
- [ ] Code reviewed
- [ ] Responsive design verified

## Related Tasks

- FE-001: Next.js Project Initialization (Dependency)
- FE-003: Dashboard Layout (Dependency)
- FE-004: Instagram Accounts Page (Dependency)
- IG-005: Direct Messages Webhook
- IG-006: Message Templates

## Estimated Time

- Inbox Layout: 4 hours
- Conversation List: 4 hours
- Message Thread: 5 hours
- Message Input: 4 hours
- File Upload: 3 hours
- Real-time Updates: 3 hours
- Archive Feature: 2 hours
- Testing: 4 hours
- **Total: 29 hours**

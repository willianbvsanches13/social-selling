import React from 'react';
import { Archive } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
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
                alt={conversation.participantUsername}
                className="h-12 w-12 rounded-full object-cover"
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
                    {conversation.participantUsername}
                  </h4>
                  <p className="text-xs text-gray-600">
                    @{conversation.participantUsername}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {conversation.lastMessageAt &&
                    formatRelativeTime(conversation.lastMessageAt)}
                </span>
              </div>

              <p
                className={cn(
                  'mt-1 truncate text-sm',
                  conversation.unreadCount > 0
                    ? 'font-medium text-gray-900'
                    : 'text-gray-600'
                )}
              >
                {conversation.unreadCount > 0 ? `${conversation.unreadCount} new messages` : 'No new messages'}
              </p>
            </div>
          </div>

          {/* Archive Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchive(conversation);
            }}
            className="absolute right-2 top-2 hidden rounded-lg p-1.5 hover:bg-gray-200 group-hover:block"
            title="Archive conversation"
          >
            <Archive className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      ))}
    </div>
  );
}

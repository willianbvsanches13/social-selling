import React, { useEffect, useRef } from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';
import type { Message } from '@/types/message';

interface MessageThreadProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageThread({ messages, isLoading }: MessageThreadProps) {
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

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-gray-600">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-4">
        {messages.map((message, index) => {
          const isCurrentUser = message.senderType === 'user';
          const showTimestamp =
            index === 0 ||
            new Date(message.sentAt).getTime() -
              new Date(messages[index - 1].sentAt).getTime() >
              300000; // 5 minutes

          return (
            <div key={message.id}>
              {showTimestamp && (
                <div className="my-4 text-center">
                  <span className="text-xs text-gray-500">
                    {formatRelativeTime(message.sentAt)}
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
                      loading="lazy"
                    />
                  )}
                  {message.content && <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>}

                  <div
                    className={cn(
                      'mt-1 flex items-center gap-1 text-xs',
                      isCurrentUser ? 'text-white/70' : 'text-gray-500'
                    )}
                  >
                    <span>
                      {new Date(message.sentAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {isCurrentUser && (
                      <>
                        {message.deliveredAt ? (
                          <CheckCheck className="h-3 w-3" />
                        ) : message.sentAt ? (
                          <Check className="h-3 w-3" />
                        ) : null}
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

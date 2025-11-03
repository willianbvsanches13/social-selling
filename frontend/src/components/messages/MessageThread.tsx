import React, { useEffect, useRef, useState } from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';
import type { Message, Attachment, Conversation } from '@/types/message';
import QuotedMessage from './QuotedMessage';
import MediaAttachment from './MediaAttachment';
import AttachmentModal from './AttachmentModal';

interface MessageThreadProps {
  messages: Message[];
  isLoading: boolean;
  conversation?: Conversation;
}

export function MessageThread({ messages, isLoading, conversation }: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[] | null>(null);
  const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState(0);

  const handleOpenModal = (attachments: Attachment[], index: number) => {
    setSelectedAttachments(attachments);
    setCurrentAttachmentIndex(index);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedAttachments(null);
    setCurrentAttachmentIndex(0);
  };

  useEffect(() => {
    scrollToBottom();

    // Marca que não é mais o primeiro carregamento após scroll inicial
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
    }
  }, [messages]);

  const scrollToBottom = () => {
    // No primeiro carregamento, força scroll imediato
    // Nas atualizações seguintes, usa smooth scroll
    const behavior = isFirstLoad.current ? 'auto' : 'smooth';
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
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
                    'max-w-lg rounded-lg px-4 py-2',
                    isCurrentUser
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-900'
                  )}
                >
                  {/* Render QuotedMessage if this is a reply */}
                  {message.repliedToMessage && (
                    <div className="mb-3">
                      <QuotedMessage repliedMessage={message.repliedToMessage} />
                    </div>
                  )}

                  {/* Message content */}
                  {message.content && <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>}

                  {/* Render attachments */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.attachments.map((attachment, index) => (
                        <MediaAttachment
                          key={index}
                          attachment={attachment}
                          onClick={() => handleOpenModal(message.attachments!, index)}
                        />
                      ))}
                    </div>
                  )}

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

      {/* AttachmentModal */}
      {selectedAttachments && (
        <AttachmentModal
          open={modalOpen}
          onClose={handleCloseModal}
          attachments={selectedAttachments}
          currentIndex={currentAttachmentIndex}
        />
      )}
    </div>
  );
}

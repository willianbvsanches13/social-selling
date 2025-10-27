'use client';

import React, { useState, useRef } from 'react';
import { Send, Paperclip, Smile, X, Loader2 } from 'lucide-react';
import { messagesService } from '@/lib/services/messages.service';
import { useToast } from '@/lib/hooks/useToast';
import { Button } from '@/components/ui/button';

interface MessageInputProps {
  onSend: (text: string, mediaUrl?: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled = false }: MessageInputProps) {
  const { error: showError } = useToast();
  const [text, setText] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!text.trim() && !mediaPreview) return;
    if (disabled) return;

    onSend(text.trim(), mediaPreview || undefined);
    setText('');
    setMediaPreview(null);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Only images are supported');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      showError('File size must be less than 10MB');
      return;
    }

    try {
      setIsUploading(true);
      const response = await messagesService.uploadMedia(file);
      console.log('response Message Input', response)
      setMediaPreview(response.url);
    } catch (err: any) {
      showError(err.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  return (
    <div className="border-t bg-white p-4">
      {/* Media Preview */}
      {mediaPreview && (
        <div className="mb-3 relative inline-block">
          <img
            src={mediaPreview}
            alt="Preview"
            className="h-20 rounded-lg border object-cover"
          />
          <button
            onClick={() => setMediaPreview(null)}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600 transition-colors"
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Attach Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || disabled}
          className="flex-shrink-0"
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
          ) : (
            <Paperclip className="h-5 w-5 text-gray-600" />
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled}
        />

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyPress}
          placeholder="Type a message..."
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: '42px', maxHeight: '120px' }}
        />

        {/* Emoji Button (placeholder for future implementation) */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="flex-shrink-0"
        >
          <Smile className="h-5 w-5 text-gray-600" />
        </Button>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={(!text.trim() && !mediaPreview) || disabled}
          size="icon"
          className="flex-shrink-0"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

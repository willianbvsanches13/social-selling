import React from 'react';
import { CornerUpLeft, Image, Video, FileAudio } from 'lucide-react';
import { RepliedMessage, SenderType } from '../../types/message';

interface QuotedMessageProps {
  repliedMessage: RepliedMessage;
}

const QuotedMessage: React.FC<QuotedMessageProps> = ({ repliedMessage }) => {
  const truncateContent = (content: string | undefined, maxLength: number = 100): string => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return `${content.substring(0, maxLength)}...`;
  };

  const getSenderLabel = (senderType: SenderType): string => {
    return senderType === SenderType.USER ? 'You' : 'Customer';
  };

  const getMediaIcon = (mediaUrl?: string) => {
    if (!mediaUrl) return null;

    // Determine media type from URL or default to image
    const url = mediaUrl.toLowerCase();
    if (url.includes('video') || url.includes('.mp4') || url.includes('.mov')) {
      return <Video className="h-4 w-4 text-gray-500" />;
    } else if (url.includes('audio') || url.includes('.mp3') || url.includes('.wav')) {
      return <FileAudio className="h-4 w-4 text-gray-500" />;
    } else {
      return <Image className="h-4 w-4 text-gray-500" />;
    }
  };

  const getDisplayContent = (): string => {
    if (!repliedMessage.content && repliedMessage.mediaUrl) {
      return 'Media message';
    }
    if (!repliedMessage.content) {
      return 'Original message unavailable';
    }
    return truncateContent(repliedMessage.content);
  };

  return (
    <div className="flex items-start gap-2 rounded bg-gray-50 p-2 hover:bg-gray-100 border-l-2 border-gray-400 transition-colors">
      <CornerUpLeft className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-700">
            {getSenderLabel(repliedMessage.senderType)}
          </span>
          {repliedMessage.mediaUrl && (
            <div className="flex-shrink-0">
              {getMediaIcon(repliedMessage.mediaUrl)}
            </div>
          )}
        </div>
        <p className="text-sm text-gray-600 truncate sm:text-xs">
          {getDisplayContent()}
        </p>
      </div>
    </div>
  );
};

export default QuotedMessage;

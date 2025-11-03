import React, { useState } from 'react';
import { AlertCircle, PlayCircle } from 'lucide-react';
import { Attachment, AttachmentType } from '../../types/message';

interface MediaAttachmentProps {
  attachment: Attachment;
  onClick?: () => void;
}

const MediaAttachment: React.FC<MediaAttachmentProps> = ({ attachment, onClick }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleClick = () => {
    if (!hasError && onClick) {
      onClick();
    }
  };

  // Detecta se é um vídeo (incluindo ig_reels que vêm como DOCUMENT)
  const originalType = attachment.metadata?.originalType as string | undefined;
  const isVideo = attachment.type === AttachmentType.VIDEO ||
                  originalType === 'ig_reel' ||
                  originalType === 'video';

  // Pega o título se disponível
  const title = attachment.metadata?.title as string | undefined;

  // Fallback UI for broken/unavailable media
  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center w-[200px] h-[200px] bg-gray-100 rounded-md border border-gray-300">
        <AlertCircle className="h-8 w-8 text-gray-500 mb-2" />
        <p className="text-sm text-gray-500">Content unavailable</p>
      </div>
    );
  }

  return (
    <div className="inline-block">
      <div className="relative">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="absolute inset-0 w-[200px] h-[200px] bg-gray-200 rounded-md animate-pulse" />
        )}

        {/* Media content */}
        {isVideo ? (
          <div className="relative">
            <video
              src={attachment.url}
              preload="metadata"
              onLoadedMetadata={handleLoad}
              onError={handleError}
              onClick={handleClick}
              className={`max-w-[200px] aspect-video object-cover rounded-md border border-gray-300 cursor-pointer transition-transform hover:scale-105 ${
                isLoading ? 'invisible' : 'visible'
              }`}
            />
            {/* Play icon overlay */}
            {!isLoading && !hasError && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <PlayCircle className="h-12 w-12 text-white drop-shadow-lg opacity-80" />
              </div>
            )}
          </div>
        ) : (
          <img
            src={attachment.url}
            alt="Attachment"
            loading="lazy"
            onLoad={handleLoad}
            onError={handleError}
            onClick={handleClick}
            className={`max-w-[200px] aspect-square object-cover rounded-md border border-gray-300 cursor-pointer transition-transform hover:scale-105 ${
              isLoading ? 'invisible' : 'visible'
            }`}
          />
        )}
      </div>

      {/* Title display for reels */}
      {title && !hasError && (
        <p className="text-xs text-gray-600 mt-1 max-w-[200px] line-clamp-2 break-words">
          {title}
        </p>
      )}
    </div>
  );
};

export default MediaAttachment;

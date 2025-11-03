import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
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

  const isVideo = attachment.type === AttachmentType.VIDEO;

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
    <div className="relative inline-block">
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 w-[200px] h-[200px] bg-gray-200 rounded-md animate-pulse" />
      )}

      {/* Media content */}
      {isVideo ? (
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
  );
};

export default MediaAttachment;

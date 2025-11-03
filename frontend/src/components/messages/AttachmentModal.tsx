import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Attachment, AttachmentType } from '../../types/message';

interface AttachmentModalProps {
  open: boolean;
  onClose: () => void;
  attachments: Attachment[];
  currentIndex?: number;
}

const AttachmentModal: React.FC<AttachmentModalProps> = ({
  open,
  onClose,
  attachments,
  currentIndex: initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);

  const currentAttachment = attachments[currentIndex];
  const isVideo = currentAttachment?.type === AttachmentType.VIDEO;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < attachments.length - 1;
  const hasMultipleAttachments = attachments.length > 1;

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    setIsLoading(true);
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'ArrowLeft' && hasPrevious) {
        e.preventDefault();
        setCurrentIndex((prev) => prev - 1);
      } else if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        setCurrentIndex((prev) => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, hasPrevious, hasNext]);

  const handlePrevious = () => {
    if (hasPrevious) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  if (!currentAttachment) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-50" />
        <Dialog.Content
          className="fixed left-[50%] top-[50%] z-50 flex h-screen w-screen -translate-x-1/2 -translate-y-1/2 items-center justify-center data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          aria-label="Attachment viewer"
        >
          {/* Close button */}
          <Dialog.Close
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10"
            aria-label="Close modal"
          >
            <X className="h-8 w-8 text-white" />
          </Dialog.Close>

          {/* Navigation buttons */}
          {hasMultipleAttachments && (
            <>
              <button
                onClick={handlePrevious}
                disabled={!hasPrevious}
                aria-label="Previous attachment"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 backdrop-blur-sm transition-all hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed z-10 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <ChevronLeft className="h-6 w-6 text-white" />
              </button>

              <button
                onClick={handleNext}
                disabled={!hasNext}
                aria-label="Next attachment"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 backdrop-blur-sm transition-all hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed z-10 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <ChevronRight className="h-6 w-6 text-white" />
              </button>
            </>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-5">
              <Loader2 className="h-12 w-12 animate-spin text-white" />
            </div>
          )}

          {/* Media content */}
          <div className="flex items-center justify-center w-full h-full p-4">
            {isVideo ? (
              <video
                src={currentAttachment.url}
                controls
                autoPlay
                onLoadedMetadata={handleLoad}
                className={`max-w-[90vw] max-h-[90vh] object-contain ${
                  isLoading ? 'opacity-0' : 'opacity-100'
                } transition-opacity`}
              />
            ) : (
              <img
                src={currentAttachment.url}
                alt="Attachment"
                onLoad={handleLoad}
                className={`max-w-[90vw] max-h-[90vh] object-contain ${
                  isLoading ? 'opacity-0' : 'opacity-100'
                } transition-opacity`}
              />
            )}
          </div>

          {/* Attachment counter */}
          {hasMultipleAttachments && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm">
              {currentIndex + 1} / {attachments.length}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default AttachmentModal;

'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { postsService } from '@/lib/services/posts.service';
import { useToast } from '@/lib/hooks/useToast';

interface MediaUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  accept?: Record<string, string[]>;
}

export function MediaUploader({
  value = [],
  onChange,
  maxFiles = 10,
  accept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    'video/*': ['.mp4', '.mov', '.avi'],
  },
}: MediaUploaderProps) {
  const { error: showError } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (value.length + acceptedFiles.length > maxFiles) {
        showError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      setUploading(true);
      const newUrls: string[] = [];

      try {
        for (const file of acceptedFiles) {
          const { url } = await postsService.uploadMedia(file, (progress) => {
            setUploadProgress((prev) => ({
              ...prev,
              [file.name]: progress,
            }));
          });
          newUrls.push(url);
        }

        onChange([...value, ...newUrls]);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to upload media';
        showError(errorMessage);
      } finally {
        setUploading(false);
        setUploadProgress({});
      }
    },
    [value, maxFiles, onChange, showError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: maxFiles - value.length,
    disabled: uploading || value.length >= maxFiles,
  });

  const removeMedia = (index: number) => {
    const newUrls = value.filter((_, i) => i !== index);
    onChange(newUrls);
  };

  const getMediaType = (url: string): 'image' | 'video' => {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm'];
    return videoExtensions.some((ext) => url.toLowerCase().includes(ext)) ? 'video' : 'image';
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {value.length < maxFiles && (
        <div
          {...getRootProps()}
          className={`
            flex cursor-pointer flex-col items-center justify-center
            rounded-lg border-2 border-dashed p-8 transition-colors
            ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
            }
            ${uploading ? 'cursor-not-allowed opacity-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          ) : (
            <Upload className="h-12 w-12 text-gray-400" />
          )}
          <p className="mt-4 text-sm font-medium text-gray-700">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here, or click to select'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Images and videos up to 100MB ({value.length}/{maxFiles} uploaded)
          </p>
        </div>
      )}

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([name, progress]) => (
            <div key={name} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="truncate font-medium text-gray-700">{name}</span>
                <span className="text-gray-500">{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Media Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {value.map((url, index) => {
            const mediaType = getMediaType(url);
            return (
              <div key={index} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200">
                {mediaType === 'image' ? (
                  <img
                    src={url}
                    alt={`Upload ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-100">
                    <Video className="h-12 w-12 text-gray-400" />
                  </div>
                )}

                {/* Remove Button */}
                <button
                  onClick={() => removeMedia(index)}
                  className="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Media Type Badge */}
                <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white">
                  {mediaType === 'image' ? (
                    <ImageIcon className="inline h-3 w-3 mr-1" />
                  ) : (
                    <Video className="inline h-3 w-3 mr-1" />
                  )}
                  {mediaType.toUpperCase()}
                </div>

                {/* Position Badge */}
                <div className="absolute right-2 bottom-2 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white">
                  {index + 1}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {value.length >= maxFiles && (
        <p className="text-sm text-gray-500">Maximum number of files reached</p>
      )}
    </div>
  );
}

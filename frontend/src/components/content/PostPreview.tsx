'use client';

import React from 'react';
import { Instagram, Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import { PostType } from '@/types/post';

interface PostPreviewProps {
  postType: PostType;
  caption: string;
  mediaUrls: string[];
  accountUsername?: string;
  accountProfilePic?: string;
}

export function PostPreview({
  postType,
  caption,
  mediaUrls,
  accountUsername = 'your_account',
  accountProfilePic,
}: PostPreviewProps) {
  if (postType === 'story') {
    return <StoryPreview media={mediaUrls[0]} caption={caption} username={accountUsername} />;
  }

  if (postType === 'reel') {
    return <ReelPreview media={mediaUrls[0]} caption={caption} username={accountUsername} />;
  }

  // Feed post
  return <FeedPreview mediaUrls={mediaUrls} caption={caption} username={accountUsername} profilePic={accountProfilePic} />;
}

function FeedPreview({
  mediaUrls,
  caption,
  username,
  profilePic,
}: {
  mediaUrls: string[];
  caption: string;
  username: string;
  profilePic?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 p-3">
        <div className="h-8 w-8 overflow-hidden rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
            {profilePic ? (
              <img src={profilePic} alt={username} className="h-full w-full rounded-full object-cover" />
            ) : (
              <div className="h-full w-full rounded-full bg-gray-200" />
            )}
          </div>
        </div>
        <span className="font-semibold text-sm">{username}</span>
      </div>

      {/* Media */}
      <div className="relative aspect-square bg-gray-100">
        {mediaUrls.length > 0 ? (
          <img
            src={mediaUrls[0]}
            alt="Post"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Instagram className="h-16 w-16 text-gray-300" />
          </div>
        )}
        {mediaUrls.length > 1 && (
          <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white">
            1/{mediaUrls.length}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Heart className="h-6 w-6 cursor-pointer" />
            <MessageCircle className="h-6 w-6 cursor-pointer" />
            <Send className="h-6 w-6 cursor-pointer" />
          </div>
          <Bookmark className="h-6 w-6 cursor-pointer" />
        </div>

        {/* Likes */}
        <p className="mt-2 text-sm font-semibold">0 likes</p>

        {/* Caption */}
        {caption && (
          <p className="mt-1 text-sm">
            <span className="font-semibold">{username}</span> {caption}
          </p>
        )}

        {/* Timestamp */}
        <p className="mt-1 text-xs text-gray-500">Preview</p>
      </div>
    </div>
  );
}

function StoryPreview({
  media,
  caption,
  username,
}: {
  media?: string;
  caption: string;
  username: string;
}) {
  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-lg bg-black shadow-lg" style={{ aspectRatio: '9 / 16' }}>
      <div className="relative h-full w-full">
        {/* Media */}
        {media ? (
          <img
            src={media}
            alt="Story"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-800">
            <Instagram className="h-16 w-16 text-gray-500" />
          </div>
        )}

        {/* Header */}
        <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-4">
          <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-white/30">
            <div className="h-full w-0 bg-white" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gray-400" />
            <span className="text-sm font-semibold text-white">{username}</span>
            <span className="text-xs text-white/80">now</span>
          </div>
        </div>

        {/* Caption */}
        {caption && (
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-sm text-white drop-shadow-lg">{caption}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReelPreview({
  media,
  caption,
  username,
}: {
  media?: string;
  caption: string;
  username: string;
}) {
  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-lg bg-black shadow-lg" style={{ aspectRatio: '9 / 16' }}>
      <div className="relative h-full w-full">
        {/* Media */}
        {media ? (
          <img
            src={media}
            alt="Reel"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-800">
            <Instagram className="h-16 w-16 text-gray-500" />
          </div>
        )}

        {/* Overlay UI */}
        <div className="absolute inset-0 flex flex-col justify-between p-4">
          {/* Top */}
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-white drop-shadow-lg">Reels</span>
            <Instagram className="h-6 w-6 text-white" />
          </div>

          {/* Bottom */}
          <div className="flex items-end justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-gray-400" />
                <span className="text-sm font-semibold text-white drop-shadow-lg">{username}</span>
                <button className="rounded-md border border-white px-3 py-1 text-xs font-semibold text-white">
                  Follow
                </button>
              </div>
              {caption && (
                <p className="text-sm text-white drop-shadow-lg line-clamp-2">{caption}</p>
              )}
            </div>

            {/* Side Actions */}
            <div className="flex flex-col items-center gap-4 ml-2">
              <div className="flex flex-col items-center">
                <Heart className="h-7 w-7 text-white drop-shadow-lg" />
                <span className="text-xs text-white drop-shadow-lg">0</span>
              </div>
              <div className="flex flex-col items-center">
                <MessageCircle className="h-7 w-7 text-white drop-shadow-lg" />
                <span className="text-xs text-white drop-shadow-lg">0</span>
              </div>
              <div className="flex flex-col items-center">
                <Send className="h-7 w-7 text-white drop-shadow-lg" />
              </div>
              <div className="flex flex-col items-center">
                <Bookmark className="h-7 w-7 text-white drop-shadow-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

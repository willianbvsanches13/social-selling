'use client';

import React from 'react';
import { Heart, MessageCircle, Bookmark, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { format as formatDate } from 'date-fns';

interface Post {
  id: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  caption: string;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  engagementRate: number;
  timestamp: string;
}

interface TopPostsGridProps {
  posts: Post[];
  isLoading?: boolean;
  className?: string;
}

export function TopPostsGrid({ posts, isLoading = false, className = '' }: TopPostsGridProps) {
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', className)}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            <div className="h-48 bg-gray-200"></div>
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No posts found for the selected period</p>
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', className)}>
      {posts.map((post) => (
        <div
          key={post.id}
          className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
        >
          {/* Thumbnail */}
          <div className="relative h-48 bg-gray-100 overflow-hidden">
            {post.thumbnailUrl || post.imageUrl ? (
              <img
                src={post.thumbnailUrl || post.imageUrl}
                alt={post.caption}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Heart className="w-12 h-12" />
              </div>
            )}
            {/* Engagement overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-300 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-center">
                <p className="text-2xl font-bold">{post.engagementRate.toFixed(1)}%</p>
                <p className="text-sm">Engagement Rate</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-sm text-gray-900 line-clamp-2 mb-3">
              {post.caption}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-red-500" />
                <span>{post.likes.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                <span>{post.comments.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Bookmark className="w-3.5 h-3.5 text-green-500" />
                <span>{post.saves.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Share2 className="w-3.5 h-3.5 text-purple-500" />
                <span>{post.shares.toLocaleString()}</span>
              </div>
            </div>

            {/* Date */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                {formatDate(new Date(post.timestamp), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { ExternalLink, Heart, MessageCircle, Share2, Bookmark, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { TopPost } from '@/types/analytics';
import { cn } from '@/lib/utils/cn';

interface TopPostsTableProps {
  posts: TopPost[];
  isLoading?: boolean;
}

type SortField = 'engagement' | 'reach' | 'impressions' | 'likes' | 'comments';
type SortOrder = 'asc' | 'desc';

export function TopPostsTable({ posts, isLoading = false }: TopPostsTableProps) {
  const [sortField, setSortField] = useState<SortField>('engagement');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedPosts = React.useMemo(() => {
    if (!posts) return [];

    return [...posts].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (sortOrder === 'asc') {
        return aValue - bValue;
      }
      return bValue - aValue;
    });
  }, [posts, sortField, sortOrder]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">No posts available for this period</p>
      </div>
    );
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="overflow-hidden">
      {/* Table Header */}
      <div className="hidden rounded-t-lg bg-gray-50 px-4 py-3 md:grid md:grid-cols-12 md:gap-4">
        <div className="col-span-5 text-xs font-medium uppercase text-gray-500">Post</div>
        <button
          onClick={() => handleSort('engagement')}
          className="col-span-1 text-xs font-medium uppercase text-gray-500 hover:text-gray-700"
        >
          Engagement {sortField === 'engagement' && (sortOrder === 'desc' ? '↓' : '↑')}
        </button>
        <button
          onClick={() => handleSort('reach')}
          className="col-span-1 text-xs font-medium uppercase text-gray-500 hover:text-gray-700"
        >
          Reach {sortField === 'reach' && (sortOrder === 'desc' ? '↓' : '↑')}
        </button>
        <button
          onClick={() => handleSort('likes')}
          className="col-span-1 text-xs font-medium uppercase text-gray-500 hover:text-gray-700"
        >
          Likes {sortField === 'likes' && (sortOrder === 'desc' ? '↓' : '↑')}
        </button>
        <button
          onClick={() => handleSort('comments')}
          className="col-span-1 text-xs font-medium uppercase text-gray-500 hover:text-gray-700"
        >
          Comments {sortField === 'comments' && (sortOrder === 'desc' ? '↓' : '↑')}
        </button>
        <div className="col-span-2 text-xs font-medium uppercase text-gray-500">Eng. Rate</div>
        <div className="col-span-1 text-xs font-medium uppercase text-gray-500">Actions</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200">
        {sortedPosts.map((post) => (
          <div
            key={post.id}
            className="grid grid-cols-1 gap-4 p-4 hover:bg-gray-50 md:grid-cols-12 md:items-center"
          >
            {/* Post Preview */}
            <div className="col-span-1 md:col-span-5">
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={post.thumbnailUrl}
                    alt={post.caption}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="line-clamp-2 text-sm font-medium text-gray-900">
                    {post.caption || 'No caption'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="rounded bg-gray-100 px-2 py-0.5">{post.mediaType}</span>
                    <span>{format(new Date(post.timestamp), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="col-span-1 flex items-center gap-1 md:col-span-1">
              <Heart className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">
                {formatNumber(post.engagement)}
              </span>
            </div>

            <div className="col-span-1 flex items-center gap-1 md:col-span-1">
              <Eye className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-900">{formatNumber(post.reach)}</span>
            </div>

            <div className="col-span-1 flex items-center gap-1 md:col-span-1">
              <Heart className="h-4 w-4 text-pink-500" />
              <span className="text-sm text-gray-900">{formatNumber(post.likes)}</span>
            </div>

            <div className="col-span-1 flex items-center gap-1 md:col-span-1">
              <MessageCircle className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-900">{formatNumber(post.comments)}</span>
            </div>

            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${Math.min(post.engagementRate, 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {post.engagementRate.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="col-span-1 md:col-span-1">
              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden md:inline">View</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

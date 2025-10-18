# FE-008: Calendar/Scheduling Page

**Epic:** Frontend Development - Social Selling Platform
**Sprint:** Sprint 5 - Content Scheduling
**Story Points:** 13
**Priority:** High
**Assigned To:** Frontend Team
**Status:** Ready for Development
**Dependencies:** FE-003, FE-006

## Overview

Create a comprehensive calendar and scheduling system with monthly calendar view, post scheduling modal, drag-and-drop rescheduling, post previews with captions, scheduled posts list view, filtering by status, optimal posting time suggestions, and bulk scheduling capabilities.

## Technical Requirements

### Features
- Monthly calendar view with navigation
- Schedule Instagram post modal
- Drag-and-drop post rescheduling
- Post preview with caption and media
- Scheduled posts list view
- Filter by status (scheduled, published, failed)
- Optimal posting time suggestions
- Bulk scheduling operations
- Calendar event details
- Time zone support
- Recurring posts
- Draft scheduling

## Implementation Details

### 1. Calendar Types

#### src/types/calendar.ts
```typescript
export interface ScheduledPost {
  id: string;
  userId: string;
  productId?: string;
  caption: string;
  mediaUrls: string[];
  scheduledFor: string;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
  instagramPostId?: string;
  error?: string;
  retryCount: number;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  post: ScheduledPost;
  color: string;
}

export interface SchedulePostRequest {
  productId?: string;
  caption: string;
  mediaUrls: string[];
  scheduledFor: string;
  timezone?: string;
}

export interface RescheduleRequest {
  postId: string;
  scheduledFor: string;
}

export interface BulkScheduleRequest {
  posts: SchedulePostRequest[];
}

export interface OptimalTimeSlot {
  time: string;
  score: number;
  reason: string;
  dayOfWeek: string;
}

export interface CalendarFilters {
  status?: 'draft' | 'scheduled' | 'published' | 'failed';
  startDate?: string;
  endDate?: string;
  productId?: string;
}

export interface PostRecurrence {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  endDate?: string;
  daysOfWeek?: number[];
}
```

### 2. Calendar Service

#### src/lib/services/calendar.service.ts
```typescript
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  ScheduledPost,
  SchedulePostRequest,
  RescheduleRequest,
  BulkScheduleRequest,
  OptimalTimeSlot,
  CalendarFilters,
} from '@/types/calendar';
import type { PaginatedResponse } from '@/types/common';

export const calendarService = {
  async getScheduledPosts(filters?: CalendarFilters): Promise<ScheduledPost[]> {
    const response = await apiClient.get<ScheduledPost[]>(
      API_ENDPOINTS.SCHEDULED_POSTS,
      { params: filters }
    );
    return response.data || [];
  },

  async getScheduledPost(id: string): Promise<ScheduledPost> {
    const response = await apiClient.get<ScheduledPost>(
      `${API_ENDPOINTS.SCHEDULED_POSTS}/${id}`
    );
    return response.data!;
  },

  async schedulePost(data: SchedulePostRequest): Promise<ScheduledPost> {
    const response = await apiClient.post<ScheduledPost>(
      API_ENDPOINTS.SCHEDULED_POSTS,
      data
    );
    return response.data!;
  },

  async bulkSchedule(data: BulkScheduleRequest): Promise<ScheduledPost[]> {
    const response = await apiClient.post<ScheduledPost[]>(
      `${API_ENDPOINTS.SCHEDULED_POSTS}/bulk`,
      data
    );
    return response.data || [];
  },

  async reschedulePost(data: RescheduleRequest): Promise<ScheduledPost> {
    const response = await apiClient.put<ScheduledPost>(
      `${API_ENDPOINTS.SCHEDULED_POSTS}/${data.postId}/reschedule`,
      { scheduledFor: data.scheduledFor }
    );
    return response.data!;
  },

  async updatePost(id: string, data: Partial<SchedulePostRequest>): Promise<ScheduledPost> {
    const response = await apiClient.put<ScheduledPost>(
      `${API_ENDPOINTS.SCHEDULED_POSTS}/${id}`,
      data
    );
    return response.data!;
  },

  async deleteScheduledPost(id: string): Promise<void> {
    await apiClient.delete(`${API_ENDPOINTS.SCHEDULED_POSTS}/${id}`);
  },

  async retryFailedPost(id: string): Promise<ScheduledPost> {
    const response = await apiClient.post<ScheduledPost>(
      `${API_ENDPOINTS.SCHEDULED_POSTS}/${id}/retry`
    );
    return response.data!;
  },

  async getOptimalTimes(): Promise<OptimalTimeSlot[]> {
    const response = await apiClient.get<OptimalTimeSlot[]>(
      `${API_ENDPOINTS.SCHEDULED_POSTS}/optimal-times`
    );
    return response.data || [];
  },

  async getPostsByDateRange(startDate: string, endDate: string): Promise<ScheduledPost[]> {
    const response = await apiClient.get<ScheduledPost[]>(
      API_ENDPOINTS.SCHEDULED_POSTS,
      { params: { startDate, endDate } }
    );
    return response.data || [];
  },
};
```

### 3. Calendar Page

#### src/app/(dashboard)/calendar/page.tsx
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  List,
  Calendar as CalendarIcon,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { CalendarView } from '@/components/calendar/CalendarView';
import { ScheduledPostsList } from '@/components/calendar/ScheduledPostsList';
import { SchedulePostModal } from '@/components/calendar/SchedulePostModal';
import { OptimalTimesPanel } from '@/components/calendar/OptimalTimesPanel';
import { CalendarFiltersPanel } from '@/components/calendar/CalendarFiltersPanel';
import { calendarService } from '@/lib/services/calendar.service';
import { useToast } from '@/lib/hooks/useToast';
import { cn } from '@/lib/utils/cn';
import type { ScheduledPost, CalendarFilters } from '@/types/calendar';

export default function CalendarPage() {
  const { success, error: showError } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showOptimalTimes, setShowOptimalTimes] = useState(false);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);

  const [filters, setFilters] = useState<CalendarFilters>({
    status: undefined,
  });

  useEffect(() => {
    fetchPosts();
  }, [currentDate, filters]);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const data = await calendarService.getPostsByDateRange(
        startDate.toISOString(),
        endDate.toISOString()
      );

      // Apply filters
      let filteredData = data;
      if (filters.status) {
        filteredData = filteredData.filter((post) => post.status === filters.status);
      }
      if (filters.productId) {
        filteredData = filteredData.filter((post) => post.productId === filters.productId);
      }

      setPosts(filteredData);
    } catch (err: any) {
      showError(err.message || 'Failed to load scheduled posts');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleSchedulePost = () => {
    setEditingPost(null);
    setShowScheduleModal(true);
  };

  const handleEditPost = (post: ScheduledPost) => {
    setEditingPost(post);
    setShowScheduleModal(true);
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled post?')) {
      return;
    }

    try {
      await calendarService.deleteScheduledPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      success('Scheduled post deleted');
    } catch (err: any) {
      showError(err.message || 'Failed to delete post');
    }
  };

  const handleReschedule = async (postId: string, newDate: Date) => {
    try {
      await calendarService.reschedulePost({
        postId,
        scheduledFor: newDate.toISOString(),
      });
      fetchPosts();
      success('Post rescheduled successfully');
    } catch (err: any) {
      showError(err.message || 'Failed to reschedule post');
    }
  };

  const handleRetryFailed = async (postId: string) => {
    try {
      await calendarService.retryFailedPost(postId);
      fetchPosts();
      success('Post queued for retry');
    } catch (err: any) {
      showError(err.message || 'Failed to retry post');
    }
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const stats = {
    scheduled: posts.filter((p) => p.status === 'scheduled').length,
    published: posts.filter((p) => p.status === 'published').length,
    failed: posts.filter((p) => p.status === 'failed').length,
  };

  return (
    <div>
      <PageHeader
        title="Content Calendar"
        description="Schedule and manage your Instagram posts"
        action={
          <button
            onClick={handleSchedulePost}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Schedule Post
          </button>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Scheduled</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.scheduled}</p>
            </div>
            <div className="rounded-lg bg-blue-100 p-3">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Published</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.published}</p>
            </div>
            <div className="rounded-lg bg-green-100 p-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.failed}</p>
            </div>
            <div className="rounded-lg bg-red-100 p-3">
              <Clock className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Month Navigation */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousMonth}
              className="rounded-lg border border-gray-300 bg-white p-2 hover:bg-gray-50"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={handleToday}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="rounded-lg border border-gray-300 bg-white p-2 hover:bg-gray-50"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{monthName}</h2>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOptimalTimes(!showOptimalTimes)}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium',
              showOptimalTimes
                ? 'border-primary bg-primary text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            <TrendingUp className="h-4 w-4" />
            Best Times
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium',
              showFilters
                ? 'border-primary bg-primary text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>

          <div className="flex rounded-lg border border-gray-300 bg-white">
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                'rounded-l-lg p-2',
                viewMode === 'calendar' ? 'bg-gray-100' : 'hover:bg-gray-50'
              )}
            >
              <CalendarIcon className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded-r-lg border-l border-gray-300 p-2',
                viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'
              )}
            >
              <List className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <CalendarFiltersPanel
          filters={filters}
          onFiltersChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Optimal Times Panel */}
      {showOptimalTimes && (
        <OptimalTimesPanel onClose={() => setShowOptimalTimes(false)} />
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
        </div>
      ) : viewMode === 'calendar' ? (
        <CalendarView
          currentDate={currentDate}
          posts={posts}
          onDateClick={handleSchedulePost}
          onPostClick={handleEditPost}
          onPostDelete={handleDeletePost}
          onPostReschedule={handleReschedule}
        />
      ) : (
        <ScheduledPostsList
          posts={posts}
          onEdit={handleEditPost}
          onDelete={handleDeletePost}
          onRetry={handleRetryFailed}
        />
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <SchedulePostModal
          post={editingPost}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => {
            setShowScheduleModal(false);
            fetchPosts();
          }}
        />
      )}
    </div>
  );
}
```

### 4. Calendar View Component

#### src/components/calendar/CalendarView.tsx
```typescript
'use client';

import React, { useState, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { MoreVertical, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatTime } from '@/lib/utils/formatters';
import type { ScheduledPost } from '@/types/calendar';

interface CalendarViewProps {
  currentDate: Date;
  posts: ScheduledPost[];
  onDateClick: (date: Date) => void;
  onPostClick: (post: ScheduledPost) => void;
  onPostDelete: (postId: string) => void;
  onPostReschedule: (postId: string, newDate: Date) => void;
}

export function CalendarView({
  currentDate,
  posts,
  onDateClick,
  onPostClick,
  onPostDelete,
  onPostReschedule,
}: CalendarViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and total days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Generate calendar grid
  const calendarDays: (Date | null)[] = [];

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(year, month, day));
  }

  const getPostsForDate = (date: Date | null) => {
    if (!date) return [];
    return posts.filter((post) => {
      const postDate = new Date(post.scheduledFor);
      return (
        postDate.getFullYear() === date.getFullYear() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getDate() === date.getDate()
      );
    });
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isPast = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="p-3 text-center text-sm font-semibold text-gray-700"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, index) => (
            <CalendarDay
              key={index}
              date={date}
              posts={getPostsForDate(date)}
              isToday={isToday(date)}
              isPast={isPast(date)}
              onDateClick={onDateClick}
              onPostClick={onPostClick}
              onPostDelete={onPostDelete}
              onPostReschedule={onPostReschedule}
            />
          ))}
        </div>
      </div>
    </DndProvider>
  );
}

interface CalendarDayProps {
  date: Date | null;
  posts: ScheduledPost[];
  isToday: boolean;
  isPast: boolean;
  onDateClick: (date: Date) => void;
  onPostClick: (post: ScheduledPost) => void;
  onPostDelete: (postId: string) => void;
  onPostReschedule: (postId: string, newDate: Date) => void;
}

function CalendarDay({
  date,
  posts,
  isToday,
  isPast,
  onDateClick,
  onPostClick,
  onPostDelete,
  onPostReschedule,
}: CalendarDayProps) {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'scheduled-post',
      drop: (item: { postId: string }) => {
        if (date) {
          onPostReschedule(item.postId, date);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }),
    [date]
  );

  if (!date) {
    return <div className="min-h-[120px] border-r border-b border-gray-200 bg-gray-50" />;
  }

  return (
    <div
      ref={drop}
      className={cn(
        'min-h-[120px] border-r border-b border-gray-200 p-2',
        isOver && 'bg-primary/10',
        isPast && 'bg-gray-50'
      )}
    >
      <div
        className={cn(
          'mb-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-sm font-medium',
          isToday && 'bg-primary text-white',
          !isToday && 'text-gray-700 hover:bg-gray-100'
        )}
        onClick={() => onDateClick(date)}
      >
        {date.getDate()}
      </div>

      <div className="space-y-1">
        {posts.slice(0, 3).map((post) => (
          <CalendarPostCard
            key={post.id}
            post={post}
            onClick={() => onPostClick(post)}
            onDelete={() => onPostDelete(post.id)}
          />
        ))}
        {posts.length > 3 && (
          <div className="text-xs text-gray-500">+{posts.length - 3} more</div>
        )}
      </div>
    </div>
  );
}

interface CalendarPostCardProps {
  post: ScheduledPost;
  onClick: () => void;
  onDelete: () => void;
}

function CalendarPostCard({ post, onClick, onDelete }: CalendarPostCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700 border-gray-300',
    scheduled: 'bg-blue-100 text-blue-700 border-blue-300',
    publishing: 'bg-orange-100 text-orange-700 border-orange-300',
    published: 'bg-green-100 text-green-700 border-green-300',
    failed: 'bg-red-100 text-red-700 border-red-300',
  };

  return (
    <div
      className={cn(
        'group relative cursor-pointer rounded border p-1.5 text-xs transition-all hover:shadow-sm',
        statusColors[post.status]
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', post.id);
      }}
    >
      <div className="flex items-center gap-1">
        {post.mediaUrls.length > 0 && <ImageIcon className="h-3 w-3" />}
        <span className="flex-1 truncate font-medium">{formatTime(post.scheduledFor)}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="opacity-0 group-hover:opacity-100"
        >
          <MoreVertical className="h-3 w-3" />
        </button>
      </div>
      <p className="mt-0.5 truncate text-gray-600">{post.caption}</p>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 z-20 mt-1 w-32 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

### 5. Schedule Post Modal

#### src/components/calendar/SchedulePostModal.tsx
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Upload, Loader2, Calendar, Clock, Sparkles } from 'lucide-react';
import { calendarService } from '@/lib/services/calendar.service';
import { productsService } from '@/lib/services/products.service';
import { useToast } from '@/lib/hooks/useToast';
import { cn } from '@/lib/utils/cn';
import type { ScheduledPost, OptimalTimeSlot } from '@/types/calendar';
import type { Product } from '@/types/product';

const scheduleSchema = z.object({
  productId: z.string().optional(),
  caption: z.string().min(1, 'Caption is required').max(2200, 'Caption too long'),
  scheduledFor: z.string().min(1, 'Schedule time is required'),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface SchedulePostModalProps {
  post: ScheduledPost | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function SchedulePostModal({ post, onClose, onSuccess }: SchedulePostModalProps) {
  const { success, error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>(post?.mediaUrls || []);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [optimalTimes, setOptimalTimes] = useState<OptimalTimeSlot[]>([]);
  const [showOptimalTimes, setShowOptimalTimes] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: post
      ? {
          productId: post.productId,
          caption: post.caption,
          scheduledFor: new Date(post.scheduledFor).toISOString().slice(0, 16),
        }
      : {
          caption: '',
          scheduledFor: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        },
  });

  const selectedProductId = watch('productId');

  useEffect(() => {
    fetchProducts();
    fetchOptimalTimes();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      loadProductImages(selectedProductId);
    }
  }, [selectedProductId]);

  const fetchProducts = async () => {
    try {
      const response = await productsService.getProducts({ perPage: 100 });
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const fetchOptimalTimes = async () => {
    try {
      const times = await calendarService.getOptimalTimes();
      setOptimalTimes(times);
    } catch (error) {
      console.error('Failed to load optimal times:', error);
    }
  };

  const loadProductImages = async (productId: string) => {
    try {
      const product = await productsService.getProduct(productId);
      if (product.images.length > 0) {
        setMediaUrls([product.images[0].url]);
        if (!post) {
          setValue('caption', `Check out our ${product.name}! ${product.description}`);
        }
      }
    } catch (error) {
      console.error('Failed to load product:', error);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setIsUploadingMedia(true);
      const uploadPromises = files.map((file) => productsService.uploadImage(file));
      const urls = await Promise.all(uploadPromises);
      setMediaUrls((prev) => [...prev, ...urls]);
    } catch (err: any) {
      showError(err.message || 'Failed to upload media');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleOptimalTimeClick = (time: OptimalTimeSlot) => {
    const now = new Date();
    const [hours, minutes] = time.time.split(':').map(Number);
    const scheduledDate = new Date(now);
    scheduledDate.setHours(hours, minutes, 0, 0);

    // If time is in the past today, schedule for tomorrow
    if (scheduledDate < now) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    setValue('scheduledFor', scheduledDate.toISOString().slice(0, 16));
    setShowOptimalTimes(false);
  };

  const onSubmit = async (data: ScheduleFormData) => {
    if (mediaUrls.length === 0) {
      showError('Please add at least one image or video');
      return;
    }

    try {
      setIsSubmitting(true);

      if (post) {
        await calendarService.updatePost(post.id, {
          ...data,
          mediaUrls,
        });
        success('Post updated successfully');
      } else {
        await calendarService.schedulePost({
          ...data,
          mediaUrls,
        });
        success('Post scheduled successfully');
      }

      onSuccess();
    } catch (err: any) {
      showError(err.message || 'Failed to schedule post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b bg-white p-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {post ? 'Edit Scheduled Post' : 'Schedule New Post'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left Column - Preview */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Post Preview</h3>

              {/* Media Preview */}
              <div className="mb-4 aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                {mediaUrls.length > 0 ? (
                  <img
                    src={mediaUrls[0]}
                    alt="Post preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center">
                    <Upload className="h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">No media selected</p>
                  </div>
                )}
              </div>

              {/* Media Upload */}
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white p-4 text-sm font-medium text-gray-700 hover:border-gray-400">
                <Upload className="h-5 w-5" />
                {isUploadingMedia ? 'Uploading...' : 'Upload Media'}
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                  className="hidden"
                  disabled={isUploadingMedia}
                />
              </label>

              {/* Caption Preview */}
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {watch('caption') || 'Caption will appear here...'}
                </p>
              </div>
            </div>

            {/* Right Column - Form */}
            <div className="space-y-6">
              {/* Product Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Link to Product (Optional)
                </label>
                <select
                  {...register('productId')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">No product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Caption */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Caption *
                </label>
                <textarea
                  {...register('caption')}
                  rows={8}
                  placeholder="Write your caption here..."
                  className={cn(
                    'mt-1 block w-full rounded-lg border px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                    errors.caption ? 'border-red-300' : 'border-gray-300'
                  )}
                />
                {errors.caption && (
                  <p className="mt-1 text-sm text-red-600">{errors.caption.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {watch('caption')?.length || 0} / 2,200 characters
                </p>
              </div>

              {/* Schedule Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Schedule for *
                </label>
                <div className="mt-1 flex gap-2">
                  <div className="relative flex-1">
                    <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      {...register('scheduledFor')}
                      type="datetime-local"
                      className={cn(
                        'block w-full rounded-lg border py-2 pl-10 pr-4 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                        errors.scheduledFor ? 'border-red-300' : 'border-gray-300'
                      )}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOptimalTimes(!showOptimalTimes)}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    Best Times
                  </button>
                </div>
                {errors.scheduledFor && (
                  <p className="mt-1 text-sm text-red-600">{errors.scheduledFor.message}</p>
                )}
              </div>

              {/* Optimal Times */}
              {showOptimalTimes && optimalTimes.length > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Suggested Best Times
                  </h4>
                  <div className="space-y-2">
                    {optimalTimes.slice(0, 5).map((time, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleOptimalTimeClick(time)}
                        className="flex w-full items-center justify-between rounded-lg bg-white p-3 text-left hover:bg-gray-50"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {time.dayOfWeek} at {time.time}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-600">{time.reason}</p>
                        </div>
                        <div className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          {time.score}% optimal
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex justify-end gap-3 border-t pt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {post ? 'Update Post' : 'Schedule Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 6. Scheduled Posts List

#### src/components/calendar/ScheduledPostsList.tsx
```typescript
'use client';

import React from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle, Edit, Trash2, RefreshCw } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';
import type { ScheduledPost } from '@/types/calendar';

interface ScheduledPostsListProps {
  posts: ScheduledPost[];
  onEdit: (post: ScheduledPost) => void;
  onDelete: (postId: string) => void;
  onRetry: (postId: string) => void;
}

export function ScheduledPostsList({
  posts,
  onEdit,
  onDelete,
  onRetry,
}: ScheduledPostsListProps) {
  const getStatusIcon = (status: ScheduledPost['status']) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'published':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: ScheduledPost['status']) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-blue-100 text-blue-700',
      publishing: 'bg-orange-100 text-orange-700',
      published: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
    };

    return (
      <span
        className={cn(
          'rounded-full px-2 py-1 text-xs font-medium',
          badges[status]
        )}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (posts.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <Calendar className="h-12 w-12 text-gray-400" />
        <p className="mt-4 text-sm text-gray-600">No scheduled posts found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div
          key={post.id}
          className="rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
        >
          <div className="flex gap-6">
            {/* Media Preview */}
            {post.mediaUrls.length > 0 && (
              <div className="flex-shrink-0">
                <img
                  src={post.mediaUrls[0]}
                  alt="Post media"
                  className="h-32 w-32 rounded-lg object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(post.status)}
                    <h3 className="font-semibold text-gray-900">
                      {formatDate(post.scheduledFor)} at {formatTime(post.scheduledFor)}
                    </h3>
                    {getStatusBadge(post.status)}
                  </div>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-3">{post.caption}</p>

                  {post.status === 'failed' && post.error && (
                    <div className="mt-3 rounded-lg bg-red-50 p-3">
                      <p className="text-sm text-red-800">{post.error}</p>
                      <p className="mt-1 text-xs text-red-600">
                        Retried {post.retryCount} times
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {post.status === 'failed' && (
                    <button
                      onClick={() => onRetry(post.id)}
                      className="rounded-lg p-2 text-orange-600 hover:bg-orange-50"
                      title="Retry"
                    >
                      <RefreshCw className="h-5 w-5" />
                    </button>
                  )}
                  {(post.status === 'draft' || post.status === 'scheduled') && (
                    <button
                      onClick={() => onEdit(post)}
                      className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                      title="Edit"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                  )}
                  {post.status !== 'published' && (
                    <button
                      onClick={() => onDelete(post.id)}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Testing Strategy

### Unit Tests
```typescript
// src/lib/services/__tests__/calendar.service.test.ts
import { calendarService } from '../calendar.service';

describe('Calendar Service', () => {
  it('fetches scheduled posts', async () => {
    const posts = await calendarService.getScheduledPosts();
    expect(Array.isArray(posts)).toBe(true);
  });

  it('schedules a post', async () => {
    const post = await calendarService.schedulePost({
      caption: 'Test post',
      mediaUrls: ['/test.jpg'],
      scheduledFor: new Date().toISOString(),
    });
    expect(post.id).toBeDefined();
  });

  it('reschedules a post', async () => {
    const post = await calendarService.reschedulePost({
      postId: '123',
      scheduledFor: new Date().toISOString(),
    });
    expect(post).toBeDefined();
  });
});
```

## Acceptance Criteria

### Functional Requirements
1. ✅ Monthly calendar view displays correctly
2. ✅ Calendar navigation works (prev/next/today)
3. ✅ Schedule post modal opens and closes
4. ✅ Media upload works
5. ✅ Caption input with character count works
6. ✅ Date/time picker works
7. ✅ Product selection populates media and caption
8. ✅ Optimal times suggestions display
9. ✅ Post scheduling creates new posts
10. ✅ Post editing updates existing posts
11. ✅ Drag-and-drop rescheduling works
12. ✅ Post deletion works with confirmation
13. ✅ Failed post retry works
14. ✅ List view displays all posts
15. ✅ Filters work (status, date range)
16. ✅ Status badges display correctly
17. ✅ Stats cards show accurate counts
18. ✅ View mode toggle works (calendar/list)
19. ✅ Post preview displays correctly
20. ✅ Timezone handling works
21. ✅ Loading states display
22. ✅ Error handling works
23. ✅ Empty states show appropriately
24. ✅ Calendar highlights today
25. ✅ Past dates are visually distinct

### Non-Functional Requirements
1. ✅ Calendar loads in under 2 seconds
2. ✅ Smooth drag-and-drop interactions
3. ✅ Responsive on all devices
4. ✅ Accessible date picker
5. ✅ Real-time status updates

## Definition of Done

- [ ] Calendar page created
- [ ] Monthly view implemented
- [ ] Schedule modal working
- [ ] Drag-and-drop functional
- [ ] List view implemented
- [ ] Filters working
- [ ] Optimal times displayed
- [ ] Bulk operations working
- [ ] Tests written and passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Responsive design verified
- [ ] Accessibility tested

## Related Tasks

- FE-003: Dashboard Layout (Dependency)
- FE-006: Product Catalog Management (Dependency)
- BE-005: Instagram Integration (Integration)

## Estimated Time

- Calendar page: 5 hours
- Calendar view component: 6 hours
- Drag-and-drop: 4 hours
- Schedule modal: 6 hours
- List view: 3 hours
- Filters panel: 2 hours
- Optimal times: 3 hours
- Testing: 5 hours
- **Total: 34 hours**

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import { Plus, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { PostSchedulerModal } from '@/components/content/PostSchedulerModal';
import { postsService } from '@/lib/services/posts.service';
import { useToast } from '@/lib/hooks/useToast';
import { ScheduledPost, CalendarEvent, PostStatus } from '@/types/post';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import '@/styles/calendar.css';

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

export default function CalendarPage() {
  const { success, error: showError } = useToast();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>('month');
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  // Fetch posts for current date range
  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      const start = startOfMonth(currentDate);
      const end = endOfMonth(addMonths(currentDate, 1)); // Get next month too for better UX

      const data = await postsService.getCalendarPosts(
        format(start, 'yyyy-MM-dd'),
        format(end, 'yyyy-MM-dd'),
        selectedAccount || undefined
      );
      setPosts(data);
    } catch (err: any) {
      showError(err.message || 'Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, selectedAccount, showError]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Convert posts to calendar events
  const events: CalendarEvent[] = posts.map((post) => ({
    id: post.id,
    title: post.caption.substring(0, 50) + (post.caption.length > 50 ? '...' : ''),
    start: new Date(post.scheduledTime),
    end: new Date(post.scheduledTime),
    resource: post,
  }));

  // Get event style based on post status
  const eventStyleGetter = (event: any) => {
    const calendarEvent = event as CalendarEvent;
    const status = calendarEvent.resource.status;
    const baseStyle = {
      borderRadius: '4px',
      border: 'none',
      display: 'block',
    };

    const statusStyles: Record<PostStatus, any> = {
      scheduled: { backgroundColor: '#3b82f6', color: 'white' },
      publishing: { backgroundColor: '#eab308', color: 'white' },
      published: { backgroundColor: '#22c55e', color: 'white' },
      failed: { backgroundColor: '#ef4444', color: 'white' },
      draft: { backgroundColor: '#9ca3af', color: 'white' },
    };

    return {
      style: {
        ...baseStyle,
        ...statusStyles[status],
      },
    };
  };

  // Handle event selection
  const handleSelectEvent = (event: any) => {
    const calendarEvent = event as CalendarEvent;
    setSelectedPost(calendarEvent.resource);
    setShowPostModal(true);
  };

  // Handle event drag and drop (rescheduling)
  const handleEventDrop = async ({ event, start }: any) => {
    try {
      const calendarEvent = event as CalendarEvent;
      await postsService.reschedulePost(calendarEvent.id, start.toISOString());
      success('Post rescheduled successfully');
      fetchPosts();
    } catch (err: any) {
      showError(err.message || 'Failed to reschedule post');
    }
  };

  // Handle creating new post
  const handleCreatePost = () => {
    setSelectedPost(null);
    setShowPostModal(true);
  };

  // Navigate calendar
  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  const handleNavigatePrev = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNavigateNext = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleNavigateToday = () => {
    setCurrentDate(new Date());
  };

  if (isLoading && posts.length === 0) {
    return (
      <div>
        <PageHeader title="Content Calendar" description="Schedule and manage your Instagram posts" />
        <div className="h-[600px] animate-pulse rounded-lg bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Calendar"
        description={`${posts.length} posts scheduled`}
        action={
          <button
            onClick={handleCreatePost}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Schedule Post
          </button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4">
        {/* Calendar Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleNavigatePrev}
            className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={handleNavigateToday}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Today
          </button>
          <button
            onClick={handleNavigateNext}
            className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <span className="ml-4 text-lg font-semibold text-gray-900">
            {format(currentDate, 'MMMM yyyy')}
          </span>
        </div>

        {/* View Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('month')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              view === 'month'
                ? 'bg-primary text-white'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setView('week')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              view === 'week'
                ? 'bg-primary text-white'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView('agenda')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              view === 'agenda'
                ? 'bg-primary text-white'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Agenda
          </button>
        </div>

        {/* Filters */}
        <button className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Filter className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-blue-500" />
          <span>Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-yellow-500" />
          <span>Publishing</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-green-500" />
          <span>Published</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-red-500" />
          <span>Failed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-gray-400" />
          <span>Draft</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <DnDCalendar
          localizer={localizer}
          events={events}
          startAccessor={(event: any) => (event as CalendarEvent).start}
          endAccessor={(event: any) => (event as CalendarEvent).end}
          style={{ height: 600 }}
          view={view}
          onView={setView}
          date={currentDate}
          onNavigate={handleNavigate}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          onEventDrop={handleEventDrop}
          resizable
          draggableAccessor={() => true}
          popup
          selectable
          components={{
            event: ({ event }: any) => {
              const calendarEvent = event as CalendarEvent;
              return <span>{calendarEvent.title}</span>;
            },
          }}
        />
      </div>

      {/* Post Scheduler Modal */}
      {showPostModal && (
        <PostSchedulerModal
          post={selectedPost}
          defaultAccount={selectedAccount}
          onClose={() => {
            setShowPostModal(false);
            setSelectedPost(null);
          }}
          onSuccess={() => {
            setShowPostModal(false);
            setSelectedPost(null);
            fetchPosts();
          }}
        />
      )}
    </div>
  );
}

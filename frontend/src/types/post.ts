export type PostType = 'feed' | 'story' | 'reel';
export type PostStatus = 'scheduled' | 'publishing' | 'published' | 'failed' | 'draft';

export interface PostMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  position: number;
}

export interface ScheduledPost {
  id: string;
  clientAccountId: string;
  postType: PostType;
  caption: string;
  mediaUrls: string[];
  media?: PostMedia[];
  scheduledTime: string;
  status: PostStatus;
  publishedAt?: string;
  platformPostId?: string;
  errorDetails?: {
    message: string;
    code?: string;
    retryCount: number;
  };
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostRequest {
  clientAccountId: string;
  postType: PostType;
  caption: string;
  mediaUrls: string[];
  scheduledTime: string;
  status?: 'scheduled' | 'draft';
}

export interface UpdatePostRequest {
  id: string;
  caption?: string;
  mediaUrls?: string[];
  scheduledTime?: string;
  status?: 'scheduled' | 'draft';
}

export interface PostFilters {
  clientAccountId?: string;
  postType?: PostType;
  status?: PostStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  perPage?: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: ScheduledPost;
}

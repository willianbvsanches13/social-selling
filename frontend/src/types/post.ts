export type PostMediaType = 'IMAGE' | 'REELS' | 'CAROUSEL' | 'STORIES';
// Alias for backward compatibility
export type PostType = PostMediaType;
export type PostStatus = 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';

export interface PostMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  position: number;
}

export interface ProductTag {
  productId: string;
  x: number;
  y: number;
}

export interface ScheduledPost {
  id: string;
  clientAccountId: string;
  userId: string;
  scheduledFor: string; // Backend uses scheduledFor, not scheduledTime
  publishedAt?: string;
  caption: string;
  mediaUrls: string[];
  media?: PostMedia[];
  mediaType: PostMediaType;
  status: PostStatus;
  publishAttempts: number;
  lastPublishError?: string;
  instagramMediaId?: string;
  permalink?: string;
  productTags?: ProductTag[];
  locationId?: string;
  templateId?: string;
  templateVariables?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
}

export interface CreatePostRequest {
  clientAccountId: string;
  scheduledFor: string; // Backend uses scheduledFor
  caption: string;
  mediaUrls: string[];
  mediaType: PostMediaType;
  productTags?: ProductTag[];
  locationId?: string;
  templateId?: string;
  templateVariables?: Record<string, string>;
}

export interface UpdatePostRequest {
  scheduledFor?: string; // Backend uses scheduledFor
  caption?: string;
  mediaUrls?: string[];
  productTags?: ProductTag[];
  locationId?: string;
}

export interface PostFilters {
  status?: PostStatus;
  scheduledAfter?: string;
  scheduledBefore?: string;
  page?: number;
  limit?: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: ScheduledPost;
}

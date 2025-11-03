export interface InstagramMediaDto {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  permalink?: string;
  caption?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  thumbnail_url?: string; // For videos
  children?: { data: InstagramMediaDto[] }; // For carousels
  owner?: { id: string; username: string };
}

export interface InstagramMediaListResponse {
  data: InstagramMediaDto[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
}

export interface InstagramInsightsResponse {
  data: InstagramInsight[];
}

export interface InstagramInsight {
  name: string;
  period: 'day' | 'week' | 'days_28' | 'lifetime';
  values: Array<{
    value: number | Record<string, any>;
    end_time?: string;
  }>;
  title?: string;
  description?: string;
  id?: string;
}

export interface InstagramConversationDto {
  id: string;
  participants: {
    data: Array<{
      id: string;
      username?: string;
      name?: string;
      profile_pic?: string;
    }>;
  };
  updated_time: string;
}

export interface InstagramMessageDto {
  id: string;
  from: {
    id: string;
    username?: string;
    name?: string;
  };
  message: string;
  created_time: string;
  attachments?: {
    data: Array<{
      id: string;
      mime_type?: string;
      name?: string;
      image_data?: {
        url: string;
        width?: number;
        height?: number;
      };
      video_data?: {
        url: string;
        width?: number;
        height?: number;
      };
    }>;
  };
}

export interface InstagramMessagesListResponse {
  data: InstagramMessageDto[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
}

export interface InstagramConversationsListResponse {
  data: InstagramConversationDto[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
}

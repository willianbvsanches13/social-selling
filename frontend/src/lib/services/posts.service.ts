import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  ScheduledPost,
  CreatePostRequest,
  UpdatePostRequest,
  PostFilters,
} from '@/types/post';
import type { PaginatedResponse } from '@/types/common';

export const postsService = {
  /**
   * Get all scheduled posts with optional filters
   */
  async getPosts(filters?: PostFilters): Promise<PaginatedResponse<ScheduledPost>> {
    const response = await apiClient.get<PaginatedResponse<ScheduledPost>>(
      API_ENDPOINTS.POSTS,
      { params: filters }
    );
    return response.data!;
  },

  /**
   * Get posts for calendar view (specific date range)
   */
  async getCalendarPosts(startDate: string, endDate: string, clientAccountId?: string): Promise<ScheduledPost[]> {
    const response = await apiClient.get<ScheduledPost[]>(
      API_ENDPOINTS.POSTS_CALENDAR,
      {
        params: {
          startDate,
          endDate,
          ...(clientAccountId && { clientAccountId })
        }
      }
    );
    return response.data!;
  },

  /**
   * Get a single scheduled post by ID
   */
  async getPost(id: string): Promise<ScheduledPost> {
    const response = await apiClient.get<ScheduledPost>(API_ENDPOINTS.POST_DETAIL(id));
    return response.data!;
  },

  /**
   * Create a new scheduled post
   */
  async createPost(data: CreatePostRequest): Promise<ScheduledPost> {
    const response = await apiClient.post<ScheduledPost>(API_ENDPOINTS.POSTS, data);
    return response.data!;
  },

  /**
   * Update an existing scheduled post
   */
  async updatePost(data: UpdatePostRequest): Promise<ScheduledPost> {
    const { id, ...updateData } = data;
    const response = await apiClient.put<ScheduledPost>(
      API_ENDPOINTS.POST_DETAIL(id),
      updateData
    );
    return response.data!;
  },

  /**
   * Delete a scheduled post
   */
  async deletePost(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.POST_DETAIL(id));
  },

  /**
   * Upload media file for post
   */
  async uploadMedia(file: File, onProgress?: (progress: number) => void): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.upload<{
      id: string;
      s3Url: string;
      filename: string;
      mediaType: string;
    }>(
      API_ENDPOINTS.POST_UPLOAD_MEDIA,
      formData,
      onProgress
    );

    console.log('response post service', response)

    // Map the backend response to the expected format
    return {
      url: response.data!.s3Url,
    };
  },

  /**
   * Reschedule a post to a new time
   */
  async reschedulePost(id: string, newScheduledTime: string): Promise<ScheduledPost> {
    return this.updatePost({
      id,
      scheduledTime: newScheduledTime,
    });
  },
};

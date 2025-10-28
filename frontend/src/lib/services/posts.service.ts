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
   * Get all scheduled posts for an account with optional filters
   */
  async getPosts(accountId: string, filters?: PostFilters): Promise<PaginatedResponse<ScheduledPost>> {
    const response = await apiClient.get<PaginatedResponse<ScheduledPost>>(
      API_ENDPOINTS.SCHEDULED_POSTS_LIST(accountId),
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
  async getPost(accountId: string, postId: string): Promise<ScheduledPost> {
    const response = await apiClient.get<ScheduledPost>(
      API_ENDPOINTS.SCHEDULED_POST_DETAIL(accountId, postId)
    );
    return response.data!;
  },

  /**
   * Create a new scheduled post
   */
  async createPost(data: CreatePostRequest): Promise<ScheduledPost> {
    const response = await apiClient.post<ScheduledPost>(
      API_ENDPOINTS.SCHEDULED_POSTS_CREATE,
      data
    );
    return response.data!;
  },

  /**
   * Update an existing scheduled post
   */
  async updatePost(postId: string, data: Partial<UpdatePostRequest>): Promise<ScheduledPost> {
    const response = await apiClient.put<ScheduledPost>(
      API_ENDPOINTS.SCHEDULED_POST_UPDATE(postId),
      data
    );
    return response.data!;
  },

  /**
   * Delete a scheduled post
   */
  async deletePost(postId: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.SCHEDULED_POST_DELETE(postId));
  },

  /**
   * Publish a scheduled post immediately
   */
  async publishNow(postId: string): Promise<ScheduledPost> {
    const response = await apiClient.post<ScheduledPost>(
      API_ENDPOINTS.SCHEDULED_POST_PUBLISH_NOW(postId)
    );
    return response.data!;
  },

  /**
   * Publish post instantly without scheduling
   */
  async publishInstantly(data: CreatePostRequest): Promise<ScheduledPost> {
    const response = await apiClient.post<ScheduledPost>(
      API_ENDPOINTS.POST_PUBLISH_INSTANTLY,
      data
    );
    return response.data!;
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
  async reschedulePost(postId: string, newScheduledFor: string): Promise<ScheduledPost> {
    return this.updatePost(postId, {
      scheduledFor: newScheduledFor,
    });
  },

  /**
   * Upload media for scheduling (alternative endpoint)
   */
  async uploadSchedulingMedia(
    file: File,
    clientAccountId?: string,
    onProgress?: (progress: number) => void
  ): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const url = clientAccountId
      ? `${API_ENDPOINTS.MEDIA_UPLOAD}?clientAccountId=${clientAccountId}`
      : API_ENDPOINTS.MEDIA_UPLOAD;

    const response = await apiClient.upload<{
      id: string;
      s3Url: string;
      filename: string;
      mediaType: string;
    }>(url, formData, onProgress);

    return {
      url: response.data!.s3Url,
    };
  },

  /**
   * List media assets for an account
   */
  async listMedia(accountId: string): Promise<any[]> {
    const response = await apiClient.get<any[]>(
      API_ENDPOINTS.MEDIA_LIST(accountId)
    );
    return response.data || [];
  },

  /**
   * Get optimal posting times for an account
   */
  async getOptimalTimes(accountId: string): Promise<any> {
    const response = await apiClient.get<any>(
      API_ENDPOINTS.OPTIMAL_TIMES(accountId)
    );
    return response.data!;
  },
};

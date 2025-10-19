import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as FormData from 'form-data';
import * as fs from 'fs-extra';

/**
 * Result from Instagram publish operation
 */
export interface InstagramPublishResult {
  id: string;
  permalink: string;
}

/**
 * Container creation result
 */
export interface ContainerCreationResult {
  containerId: string;
}

/**
 * Instagram Publisher Service
 * Wraps Instagram Graph API for publishing posts
 */
@Injectable()
export class InstagramPublisherService {
  private readonly logger = new Logger(InstagramPublisherService.name);
  private axiosInstance!: AxiosInstance;
  private readonly graphApiVersion = 'v18.0';
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = `https://graph.facebook.com/${this.graphApiVersion}`;
    this.initializeAxios();
  }

  /**
   * Initialize axios instance with interceptors
   */
  private initializeAxios(): void {
    this.axiosInstance = axios.create({
      timeout: 120000, // 2 minutes for video uploads
      headers: {
        'User-Agent': 'SocialSelling/1.0',
      },
    });

    // Request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        this.logger.debug(
          `Instagram API Request: ${config.method?.toUpperCase()} ${config.url}`,
        );
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          this.logger.error(
            `Instagram API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
          );
        }
        return Promise.reject(error);
      },
    );
  }

  /**
   * Publish a single image post
   */
  async publishSingleImage(
    igAccountId: string,
    accessToken: string,
    imageUrl: string,
    caption: string,
    options?: {
      location?: { id: string };
      userTags?: Array<{ username: string; x: number; y: number }>;
    },
  ): Promise<InstagramPublishResult> {
    try {
      this.logger.log(`Publishing single image for account ${igAccountId}`);

      // Step 1: Create media container
      const containerId = await this.createImageContainer(
        igAccountId,
        accessToken,
        imageUrl,
        caption,
        options,
      );

      // Step 2: Publish the container
      const result = await this.publishContainer(
        igAccountId,
        accessToken,
        containerId,
      );

      this.logger.log(`Successfully published single image: ${result.id}`);
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to publish single image: ${errorMessage}`,
        errorStack,
      );
      throw this.transformError(error);
    }
  }

  /**
   * Publish a carousel post (2-10 images/videos)
   */
  async publishCarousel(
    igAccountId: string,
    accessToken: string,
    mediaUrls: string[],
    caption: string,
    options?: {
      location?: { id: string };
    },
  ): Promise<InstagramPublishResult> {
    try {
      if (mediaUrls.length < 2 || mediaUrls.length > 10) {
        throw new Error('Carousel must have 2-10 media items');
      }

      this.logger.log(
        `Publishing carousel with ${mediaUrls.length} items for account ${igAccountId}`,
      );

      // Step 1: Create containers for each media item
      const childContainerIds = await Promise.all(
        mediaUrls.map((url) =>
          this.createCarouselItemContainer(igAccountId, accessToken, url),
        ),
      );

      // Step 2: Create carousel container
      const carouselContainerId = await this.createCarouselContainer(
        igAccountId,
        accessToken,
        childContainerIds,
        caption,
        options,
      );

      // Step 3: Publish the carousel
      const result = await this.publishContainer(
        igAccountId,
        accessToken,
        carouselContainerId,
      );

      this.logger.log(`Successfully published carousel: ${result.id}`);
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to publish carousel: ${errorMessage}`,
        errorStack,
      );
      throw this.transformError(error);
    }
  }

  /**
   * Publish a video post
   */
  async publishVideo(
    igAccountId: string,
    accessToken: string,
    videoUrl: string,
    caption: string,
    coverUrl?: string,
    options?: {
      location?: { id: string };
    },
  ): Promise<InstagramPublishResult> {
    try {
      this.logger.log(`Publishing video for account ${igAccountId}`);

      // Step 1: Create video container
      const containerId = await this.createVideoContainer(
        igAccountId,
        accessToken,
        videoUrl,
        caption,
        coverUrl,
        options,
      );

      // Step 2: Wait for video processing
      await this.waitForVideoProcessing(igAccountId, accessToken, containerId);

      // Step 3: Publish the container
      const result = await this.publishContainer(
        igAccountId,
        accessToken,
        containerId,
      );

      this.logger.log(`Successfully published video: ${result.id}`);
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to publish video: ${errorMessage}`, errorStack);
      throw this.transformError(error);
    }
  }

  /**
   * Create image container
   */
  private async createImageContainer(
    igAccountId: string,
    accessToken: string,
    imageUrl: string,
    caption: string,
    options?: {
      location?: { id: string };
      userTags?: Array<{ username: string; x: number; y: number }>;
    },
  ): Promise<string> {
    const params: any = {
      image_url: imageUrl,
      caption: caption,
      access_token: accessToken,
    };

    if (options?.location) {
      params.location_id = options.location.id;
    }

    if (options?.userTags && options.userTags.length > 0) {
      params.user_tags = JSON.stringify(options.userTags);
    }

    const response = await this.axiosInstance.post(
      `${this.baseUrl}/${igAccountId}/media`,
      null,
      { params },
    );

    return response.data.id;
  }

  /**
   * Create carousel item container
   */
  private async createCarouselItemContainer(
    igAccountId: string,
    accessToken: string,
    mediaUrl: string,
  ): Promise<string> {
    const isVideo = this.isVideoUrl(mediaUrl);

    const params: any = {
      is_carousel_item: true,
      access_token: accessToken,
    };

    if (isVideo) {
      params.media_type = 'VIDEO';
      params.video_url = mediaUrl;
    } else {
      params.image_url = mediaUrl;
    }

    const response = await this.axiosInstance.post(
      `${this.baseUrl}/${igAccountId}/media`,
      null,
      { params },
    );

    return response.data.id;
  }

  /**
   * Create carousel container
   */
  private async createCarouselContainer(
    igAccountId: string,
    accessToken: string,
    childContainerIds: string[],
    caption: string,
    options?: {
      location?: { id: string };
    },
  ): Promise<string> {
    const params: any = {
      media_type: 'CAROUSEL',
      children: childContainerIds.join(','),
      caption: caption,
      access_token: accessToken,
    };

    if (options?.location) {
      params.location_id = options.location.id;
    }

    const response = await this.axiosInstance.post(
      `${this.baseUrl}/${igAccountId}/media`,
      null,
      { params },
    );

    return response.data.id;
  }

  /**
   * Create video container
   */
  private async createVideoContainer(
    igAccountId: string,
    accessToken: string,
    videoUrl: string,
    caption: string,
    coverUrl?: string,
    options?: {
      location?: { id: string };
    },
  ): Promise<string> {
    const params: any = {
      media_type: 'VIDEO',
      video_url: videoUrl,
      caption: caption,
      access_token: accessToken,
    };

    if (coverUrl) {
      params.thumb_offset = 0; // Use first frame or specify offset
    }

    if (options?.location) {
      params.location_id = options.location.id;
    }

    const response = await this.axiosInstance.post(
      `${this.baseUrl}/${igAccountId}/media`,
      null,
      { params },
    );

    return response.data.id;
  }

  /**
   * Wait for video processing to complete
   */
  private async waitForVideoProcessing(
    igAccountId: string,
    accessToken: string,
    containerId: string,
    maxAttempts: number = 30,
    interval: number = 10000,
  ): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await this.axiosInstance.get(
        `${this.baseUrl}/${containerId}`,
        {
          params: {
            fields: 'status_code',
            access_token: accessToken,
          },
        },
      );

      const statusCode = response.data.status_code;

      if (statusCode === 'FINISHED') {
        this.logger.log(
          `Video processing completed for container ${containerId}`,
        );
        return;
      }

      if (statusCode === 'ERROR') {
        throw new Error('Video processing failed on Instagram');
      }

      // Status is IN_PROGRESS, wait and retry
      this.logger.log(
        `Video processing in progress (${attempt + 1}/${maxAttempts})...`,
      );
      await this.sleep(interval);
    }

    throw new Error('Video processing timeout - exceeded maximum wait time');
  }

  /**
   * Publish container
   */
  private async publishContainer(
    igAccountId: string,
    accessToken: string,
    containerId: string,
  ): Promise<InstagramPublishResult> {
    const response = await this.axiosInstance.post(
      `${this.baseUrl}/${igAccountId}/media_publish`,
      null,
      {
        params: {
          creation_id: containerId,
          access_token: accessToken,
        },
      },
    );

    const mediaId = response.data.id;

    // Get permalink
    const mediaResponse = await this.axiosInstance.get(
      `${this.baseUrl}/${mediaId}`,
      {
        params: {
          fields: 'permalink',
          access_token: accessToken,
        },
      },
    );

    return {
      id: mediaId,
      permalink: mediaResponse.data.permalink,
    };
  }

  /**
   * Add comment to a post
   */
  async addCommentToPost(
    mediaId: string,
    accessToken: string,
    message: string,
  ): Promise<string> {
    try {
      const response = await this.axiosInstance.post(
        `${this.baseUrl}/${mediaId}/comments`,
        null,
        {
          params: {
            message: message,
            access_token: accessToken,
          },
        },
      );

      return response.data.id;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to add comment: ${errorMessage}`);
      throw this.transformError(error);
    }
  }

  /**
   * Check if URL is a video
   */
  private isVideoUrl(url: string): boolean {
    const videoExtensions = ['.mp4', '.mov', '.avi'];
    return videoExtensions.some((ext) => url.toLowerCase().includes(ext));
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Transform API errors into meaningful messages
   */
  private transformError(error: any): Error {
    if (error.response?.data?.error) {
      const apiError = error.response.data.error;

      // Map Instagram error codes to meaningful messages
      const errorMap: Record<number, string> = {
        190: 'Invalid access token - please reconnect Instagram account',
        100: 'Invalid parameter - check media format and caption',
        368: 'Temporarily blocked due to rate limiting',
        36000: 'Video processing error - check video format and size',
      };

      const message = errorMap[apiError.code] || apiError.message;

      const customError = new Error(message);
      (customError as any).code = apiError.code;
      (customError as any).type = apiError.type;
      (customError as any).retryable = this.isRetryableError(apiError.code);

      return customError;
    }

    return error;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(errorCode: number): boolean {
    const retryableCodes = [
      1,
      2, // Temporary errors
      17, // Rate limit
      368, // Temporarily blocked
    ];

    return retryableCodes.includes(errorCode);
  }
}

# WORKER-001: Instagram Post Publishing Worker

## Epic
Background Workers & Job Processing

## Story
As a system administrator, I need a reliable background worker that processes scheduled Instagram posts from a queue, downloads media from S3, publishes to Instagram via the Graph API, and updates post status in the database with comprehensive error handling and retry logic.

## Priority
P0 - Critical

## Estimated Effort
13 Story Points (Large)

## Dependencies
- Instagram Graph API integration (IG-004)
- MinIO S3 storage setup
- PostgreSQL database with posts table
- Redis for BullMQ
- BullMQ library installed

## Technical Context

### Technology Stack
- **Queue System**: BullMQ 5.x with Redis
- **Worker Runtime**: Node.js 20.x with TypeScript
- **Storage**: MinIO S3-compatible object storage
- **Database**: PostgreSQL with Prisma ORM
- **Instagram API**: Meta Graph API v18.0
- **HTTP Client**: Axios for API requests
- **Logging**: Winston/Pino
- **Monitoring**: Bull Board UI

### Architecture Overview
```
┌─────────────────┐
│  NestJS API     │
│  (Job Creator)  │
└────────┬────────┘
         │ Add Job
         ▼
┌─────────────────┐
│  Redis Queue    │
│  (BullMQ)       │
└────────┬────────┘
         │ Process
         ▼
┌─────────────────┐      ┌──────────────┐
│ Publishing      │─────▶│  MinIO S3    │
│ Worker          │      │  (Media)     │
└────────┬────────┘      └──────────────┘
         │
         ├──────────────┐
         ▼              ▼
┌─────────────────┐  ┌──────────────┐
│ Instagram API   │  │  PostgreSQL  │
│ (Graph API)     │  │  (Status)    │
└─────────────────┘  └──────────────┘
```

### Queue Design
- **Queue Name**: `instagram-post-publishing`
- **Concurrency**: 3 workers (Instagram rate limits)
- **Job Priority**: Support for priority scheduling
- **Retry Strategy**: Exponential backoff (max 5 attempts)
- **Job Timeout**: 5 minutes per job
- **Rate Limiting**: 25 posts per user per 24 hours

## Detailed Requirements

### 1. BullMQ Queue Configuration

#### Queue Setup Module
```typescript
// src/workers/queues/instagram-publishing.queue.ts

import { Queue, QueueOptions } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PublishPostJobData {
  postId: string;
  userId: string;
  accountId: string;
  caption: string;
  mediaUrls: string[]; // S3 URLs
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  scheduledFor: Date;
  publishTime: Date;
  hashtags: string[];
  location?: {
    id: string;
    name: string;
  };
  firstComment?: string;
  userTags?: Array<{
    username: string;
    x: number;
    y: number;
  }>;
  metadata?: {
    retryCount: number;
    originalScheduledTime: Date;
  };
}

export interface PublishPostJobResult {
  success: boolean;
  postId: string;
  instagramPostId?: string;
  permalink?: string;
  publishedAt?: Date;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

@Injectable()
export class InstagramPublishingQueue {
  private queue: Queue<PublishPostJobData, PublishPostJobResult>;

  constructor(private configService: ConfigService) {
    this.initializeQueue();
  }

  private initializeQueue() {
    const queueOptions: QueueOptions = {
      connection: {
        host: this.configService.get('REDIS_HOST'),
        port: this.configService.get('REDIS_PORT'),
        password: this.configService.get('REDIS_PASSWORD'),
        db: this.configService.get('REDIS_DB', 0),
      },
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 30000, // 30 seconds base delay
        },
        removeOnComplete: {
          count: 1000, // Keep last 1000 completed jobs
          age: 86400, // Remove after 24 hours
        },
        removeOnFail: {
          count: 5000, // Keep last 5000 failed jobs
          age: 604800, // Remove after 7 days
        },
      },
    };

    this.queue = new Queue<PublishPostJobData, PublishPostJobResult>(
      'instagram-post-publishing',
      queueOptions,
    );
  }

  async addPublishJob(
    data: PublishPostJobData,
    options?: {
      priority?: number;
      delay?: number;
      jobId?: string;
    },
  ) {
    const jobId = options?.jobId || `publish-${data.postId}`;

    // Calculate delay until scheduled time
    const now = new Date();
    const scheduledTime = new Date(data.scheduledFor);
    const delay = Math.max(0, scheduledTime.getTime() - now.getTime());

    return this.queue.add(
      'publish-post',
      data,
      {
        jobId,
        priority: options?.priority || 10,
        delay: options?.delay !== undefined ? options.delay : delay,
      },
    );
  }

  async cancelPublishJob(postId: string) {
    const jobId = `publish-${postId}`;
    const job = await this.queue.getJob(jobId);

    if (job) {
      await job.remove();
      return true;
    }

    return false;
  }

  async reschedulePublishJob(postId: string, newScheduledTime: Date) {
    await this.cancelPublishJob(postId);

    // Job will be re-added by the service layer with new time
  }

  async getJobStatus(postId: string) {
    const jobId = `publish-${postId}`;
    const job = await this.queue.getJob(jobId);

    if (!job) {
      return null;
    }

    return {
      id: job.id,
      state: await job.getState(),
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }

  getQueue() {
    return this.queue;
  }
}
```

### 2. Media Download Service

#### S3 Media Manager
```typescript
// src/workers/services/media-downloader.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import * as sharp from 'sharp';
import axios from 'axios';

export interface DownloadedMedia {
  localPath: string;
  fileName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number; // for videos
}

@Injectable()
export class MediaDownloaderService {
  private readonly logger = new Logger(MediaDownloaderService.name);
  private s3: AWS.S3;
  private tempDir: string;

  constructor(private configService: ConfigService) {
    this.initializeS3Client();
    this.tempDir = path.join(process.cwd(), 'temp', 'media');
    fs.ensureDirSync(this.tempDir);
  }

  private initializeS3Client() {
    this.s3 = new AWS.S3({
      endpoint: this.configService.get('MINIO_ENDPOINT'),
      accessKeyId: this.configService.get('MINIO_ACCESS_KEY'),
      secretAccessKey: this.configService.get('MINIO_SECRET_KEY'),
      s3ForcePathStyle: true,
      signatureVersion: 'v4',
    });
  }

  async downloadMedia(s3Url: string): Promise<DownloadedMedia> {
    try {
      this.logger.log(`Downloading media from S3: ${s3Url}`);

      // Parse S3 URL
      const { bucket, key } = this.parseS3Url(s3Url);

      // Generate local file path
      const fileName = this.generateFileName(key);
      const localPath = path.join(this.tempDir, fileName);

      // Download from S3
      const params = {
        Bucket: bucket,
        Key: key,
      };

      const s3Object = await this.s3.getObject(params).promise();

      // Write to local file
      await fs.writeFile(localPath, s3Object.Body as Buffer);

      // Get file metadata
      const stats = await fs.stat(localPath);
      const mimeType = this.getMimeType(s3Object.ContentType || '');

      const result: DownloadedMedia = {
        localPath,
        fileName,
        mimeType,
        size: stats.size,
      };

      // Get image dimensions if it's an image
      if (mimeType.startsWith('image/')) {
        const metadata = await sharp(localPath).metadata();
        result.width = metadata.width;
        result.height = metadata.height;
      }

      // Validate media meets Instagram requirements
      await this.validateMedia(result);

      this.logger.log(`Media downloaded successfully: ${fileName}`);
      return result;

    } catch (error) {
      this.logger.error(`Failed to download media from S3: ${error.message}`, error.stack);
      throw new Error(`Media download failed: ${error.message}`);
    }
  }

  async downloadMultipleMedia(s3Urls: string[]): Promise<DownloadedMedia[]> {
    const downloads = await Promise.all(
      s3Urls.map(url => this.downloadMedia(url))
    );
    return downloads;
  }

  private parseS3Url(s3Url: string): { bucket: string; key: string } {
    // Format: https://minio.example.com/bucket-name/path/to/file.jpg
    const url = new URL(s3Url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    return {
      bucket: pathParts[0],
      key: pathParts.slice(1).join('/'),
    };
  }

  private generateFileName(key: string): string {
    const ext = path.extname(key);
    const hash = crypto.randomBytes(8).toString('hex');
    return `${Date.now()}-${hash}${ext}`;
  }

  private getMimeType(contentType: string): string {
    const mimeMap: Record<string, string> = {
      'image/jpeg': 'image/jpeg',
      'image/jpg': 'image/jpeg',
      'image/png': 'image/png',
      'video/mp4': 'video/mp4',
      'video/quicktime': 'video/mp4',
    };

    return mimeMap[contentType.toLowerCase()] || contentType;
  }

  private async validateMedia(media: DownloadedMedia): Promise<void> {
    // Instagram image requirements
    if (media.mimeType.startsWith('image/')) {
      if (!media.width || !media.height) {
        throw new Error('Unable to determine image dimensions');
      }

      // Aspect ratio check (between 4:5 and 1.91:1)
      const aspectRatio = media.width / media.height;
      if (aspectRatio < 0.8 || aspectRatio > 1.91) {
        throw new Error(`Invalid aspect ratio: ${aspectRatio}. Must be between 0.8 (4:5) and 1.91 (1.91:1)`);
      }

      // Resolution check
      if (media.width < 320 || media.height < 320) {
        throw new Error(`Image resolution too low: ${media.width}x${media.height}. Minimum is 320px`);
      }

      // File size check (8MB for images)
      const maxSize = 8 * 1024 * 1024;
      if (media.size > maxSize) {
        throw new Error(`Image file too large: ${media.size} bytes. Maximum is 8MB`);
      }
    }

    // Instagram video requirements
    if (media.mimeType.startsWith('video/')) {
      // File size check (100MB for videos)
      const maxSize = 100 * 1024 * 1024;
      if (media.size > maxSize) {
        throw new Error(`Video file too large: ${media.size} bytes. Maximum is 100MB`);
      }

      // Duration check would require ffprobe
      // Implement if needed
    }
  }

  async cleanupMedia(filePath: string): Promise<void> {
    try {
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        this.logger.log(`Cleaned up temporary file: ${filePath}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup file ${filePath}: ${error.message}`);
    }
  }

  async cleanupMultipleMedia(filePaths: string[]): Promise<void> {
    await Promise.all(filePaths.map(path => this.cleanupMedia(path)));
  }
}
```

### 3. Instagram Publishing Service

#### Graph API Publisher
```typescript
// src/workers/services/instagram-publisher.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as FormData from 'form-data';
import * as fs from 'fs-extra';

export interface InstagramPublishResult {
  id: string;
  permalink: string;
}

export interface ContainerCreationResult {
  containerId: string;
}

@Injectable()
export class InstagramPublisherService {
  private readonly logger = new Logger(InstagramPublisherService.name);
  private axiosInstance: AxiosInstance;
  private readonly graphApiVersion = 'v18.0';
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = `https://graph.facebook.com/${this.graphApiVersion}`;
    this.initializeAxios();
  }

  private initializeAxios() {
    this.axiosInstance = axios.create({
      timeout: 120000, // 2 minutes for video uploads
      headers: {
        'User-Agent': 'SocialSelling/1.0',
      },
    });

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        this.logger.debug(`Instagram API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          this.logger.error(
            `Instagram API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
          );
        }
        return Promise.reject(error);
      }
    );
  }

  async publishSingleImage(
    igAccountId: string,
    accessToken: string,
    imageUrl: string,
    caption: string,
    options?: {
      location?: { id: string };
      userTags?: Array<{ username: string; x: number; y: number }>;
    }
  ): Promise<InstagramPublishResult> {
    try {
      // Step 1: Create media container
      const containerId = await this.createImageContainer(
        igAccountId,
        accessToken,
        imageUrl,
        caption,
        options
      );

      // Step 2: Publish the container
      const result = await this.publishContainer(igAccountId, accessToken, containerId);

      this.logger.log(`Successfully published single image: ${result.id}`);
      return result;

    } catch (error) {
      this.logger.error(`Failed to publish single image: ${error.message}`, error.stack);
      throw this.transformError(error);
    }
  }

  async publishCarousel(
    igAccountId: string,
    accessToken: string,
    mediaUrls: string[],
    caption: string,
    options?: {
      location?: { id: string };
    }
  ): Promise<InstagramPublishResult> {
    try {
      if (mediaUrls.length < 2 || mediaUrls.length > 10) {
        throw new Error('Carousel must have 2-10 media items');
      }

      // Step 1: Create containers for each media item
      const childContainerIds = await Promise.all(
        mediaUrls.map(url => this.createCarouselItemContainer(igAccountId, accessToken, url))
      );

      // Step 2: Create carousel container
      const carouselContainerId = await this.createCarouselContainer(
        igAccountId,
        accessToken,
        childContainerIds,
        caption,
        options
      );

      // Step 3: Publish the carousel
      const result = await this.publishContainer(igAccountId, accessToken, carouselContainerId);

      this.logger.log(`Successfully published carousel: ${result.id}`);
      return result;

    } catch (error) {
      this.logger.error(`Failed to publish carousel: ${error.message}`, error.stack);
      throw this.transformError(error);
    }
  }

  async publishVideo(
    igAccountId: string,
    accessToken: string,
    videoUrl: string,
    caption: string,
    coverUrl?: string,
    options?: {
      location?: { id: string };
    }
  ): Promise<InstagramPublishResult> {
    try {
      // Step 1: Create video container
      const containerId = await this.createVideoContainer(
        igAccountId,
        accessToken,
        videoUrl,
        caption,
        coverUrl,
        options
      );

      // Step 2: Wait for video processing
      await this.waitForVideoProcessing(igAccountId, accessToken, containerId);

      // Step 3: Publish the container
      const result = await this.publishContainer(igAccountId, accessToken, containerId);

      this.logger.log(`Successfully published video: ${result.id}`);
      return result;

    } catch (error) {
      this.logger.error(`Failed to publish video: ${error.message}`, error.stack);
      throw this.transformError(error);
    }
  }

  private async createImageContainer(
    igAccountId: string,
    accessToken: string,
    imageUrl: string,
    caption: string,
    options?: {
      location?: { id: string };
      userTags?: Array<{ username: string; x: number; y: number }>;
    }
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
      { params }
    );

    return response.data.id;
  }

  private async createCarouselItemContainer(
    igAccountId: string,
    accessToken: string,
    mediaUrl: string
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
      { params }
    );

    return response.data.id;
  }

  private async createCarouselContainer(
    igAccountId: string,
    accessToken: string,
    childContainerIds: string[],
    caption: string,
    options?: {
      location?: { id: string };
    }
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
      { params }
    );

    return response.data.id;
  }

  private async createVideoContainer(
    igAccountId: string,
    accessToken: string,
    videoUrl: string,
    caption: string,
    coverUrl?: string,
    options?: {
      location?: { id: string };
    }
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
      { params }
    );

    return response.data.id;
  }

  private async waitForVideoProcessing(
    igAccountId: string,
    accessToken: string,
    containerId: string,
    maxAttempts: number = 30,
    interval: number = 10000
  ): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await this.axiosInstance.get(
        `${this.baseUrl}/${containerId}`,
        {
          params: {
            fields: 'status_code',
            access_token: accessToken,
          },
        }
      );

      const statusCode = response.data.status_code;

      if (statusCode === 'FINISHED') {
        this.logger.log(`Video processing completed for container ${containerId}`);
        return;
      }

      if (statusCode === 'ERROR') {
        throw new Error('Video processing failed on Instagram');
      }

      // Status is IN_PROGRESS, wait and retry
      this.logger.log(`Video processing in progress (${attempt + 1}/${maxAttempts})...`);
      await this.sleep(interval);
    }

    throw new Error('Video processing timeout - exceeded maximum wait time');
  }

  private async publishContainer(
    igAccountId: string,
    accessToken: string,
    containerId: string
  ): Promise<InstagramPublishResult> {
    const response = await this.axiosInstance.post(
      `${this.baseUrl}/${igAccountId}/media_publish`,
      null,
      {
        params: {
          creation_id: containerId,
          access_token: accessToken,
        },
      }
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
      }
    );

    return {
      id: mediaId,
      permalink: mediaResponse.data.permalink,
    };
  }

  async addCommentToPost(
    mediaId: string,
    accessToken: string,
    message: string
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
        }
      );

      return response.data.id;
    } catch (error) {
      this.logger.error(`Failed to add comment: ${error.message}`);
      throw this.transformError(error);
    }
  }

  private isVideoUrl(url: string): boolean {
    const videoExtensions = ['.mp4', '.mov', '.avi'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

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

  private isRetryableError(errorCode: number): boolean {
    const retryableCodes = [
      1, 2, // Temporary errors
      17, // Rate limit
      368, // Temporarily blocked
    ];

    return retryableCodes.includes(errorCode);
  }
}
```

### 4. Job Processor Implementation

#### Main Worker Processor
```typescript
// src/workers/processors/instagram-publishing.processor.ts

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { MediaDownloaderService } from '../services/media-downloader.service';
import { InstagramPublisherService } from '../services/instagram-publisher.service';
import { NotificationService } from '@/notifications/notification.service';
import {
  PublishPostJobData,
  PublishPostJobResult,
} from '../queues/instagram-publishing.queue';

@Processor('instagram-post-publishing', {
  concurrency: 3,
  limiter: {
    max: 10,
    duration: 60000, // 10 jobs per minute
  },
})
@Injectable()
export class InstagramPublishingProcessor extends WorkerHost {
  private readonly logger = new Logger(InstagramPublishingProcessor.name);

  constructor(
    private prisma: PrismaService,
    private mediaDownloader: MediaDownloaderService,
    private instagramPublisher: InstagramPublisherService,
    private notificationService: NotificationService,
  ) {
    super();
  }

  async process(job: Job<PublishPostJobData, PublishPostJobResult>): Promise<PublishPostJobResult> {
    const { postId, userId, accountId } = job.data;

    this.logger.log(`Processing publish job for post ${postId} (Job ID: ${job.id})`);

    try {
      // Update job progress
      await job.updateProgress(10);

      // Step 1: Validate post still exists and is in correct state
      const post = await this.validatePost(postId);
      await job.updateProgress(20);

      // Step 2: Get Instagram account details and access token
      const account = await this.getInstagramAccount(accountId);
      await job.updateProgress(25);

      // Step 3: Download media from S3
      this.logger.log(`Downloading ${job.data.mediaUrls.length} media file(s) from S3`);
      const downloadedMedia = await this.mediaDownloader.downloadMultipleMedia(
        job.data.mediaUrls
      );
      await job.updateProgress(50);

      // Step 4: Publish to Instagram based on media type
      this.logger.log(`Publishing ${job.data.mediaType} to Instagram`);
      let publishResult;

      try {
        if (job.data.mediaType === 'IMAGE' && downloadedMedia.length === 1) {
          publishResult = await this.instagramPublisher.publishSingleImage(
            account.instagramBusinessAccountId,
            account.accessToken,
            job.data.mediaUrls[0],
            this.buildCaption(job.data),
            {
              location: job.data.location,
              userTags: job.data.userTags,
            }
          );
        } else if (job.data.mediaType === 'CAROUSEL') {
          publishResult = await this.instagramPublisher.publishCarousel(
            account.instagramBusinessAccountId,
            account.accessToken,
            job.data.mediaUrls,
            this.buildCaption(job.data),
            {
              location: job.data.location,
            }
          );
        } else if (job.data.mediaType === 'VIDEO') {
          publishResult = await this.instagramPublisher.publishVideo(
            account.instagramBusinessAccountId,
            account.accessToken,
            job.data.mediaUrls[0],
            this.buildCaption(job.data),
            undefined,
            {
              location: job.data.location,
            }
          );
        } else {
          throw new Error(`Unsupported media type: ${job.data.mediaType}`);
        }

        await job.updateProgress(80);

        // Step 5: Add first comment if specified
        if (job.data.firstComment && publishResult.id) {
          this.logger.log('Adding first comment to post');
          await this.instagramPublisher.addCommentToPost(
            publishResult.id,
            account.accessToken,
            job.data.firstComment
          );
        }

        await job.updateProgress(90);

        // Step 6: Update database with success
        await this.updatePostStatus(postId, {
          status: 'PUBLISHED',
          instagramPostId: publishResult.id,
          permalink: publishResult.permalink,
          publishedAt: new Date(),
        });

        // Step 7: Cleanup temporary files
        await this.mediaDownloader.cleanupMultipleMedia(
          downloadedMedia.map(m => m.localPath)
        );

        await job.updateProgress(100);

        // Step 8: Send success notification
        await this.notificationService.sendPostPublishedNotification(
          userId,
          postId,
          publishResult.permalink
        );

        this.logger.log(`Successfully published post ${postId} to Instagram: ${publishResult.id}`);

        return {
          success: true,
          postId,
          instagramPostId: publishResult.id,
          permalink: publishResult.permalink,
          publishedAt: new Date(),
        };

      } finally {
        // Always cleanup media files
        if (downloadedMedia.length > 0) {
          await this.mediaDownloader.cleanupMultipleMedia(
            downloadedMedia.map(m => m.localPath)
          );
        }
      }

    } catch (error) {
      this.logger.error(
        `Failed to publish post ${postId}: ${error.message}`,
        error.stack
      );

      // Update database with failure
      await this.updatePostStatus(postId, {
        status: 'FAILED',
        failureReason: error.message,
        lastAttemptAt: new Date(),
      });

      // Send failure notification
      await this.notificationService.sendPostFailedNotification(
        userId,
        postId,
        error.message
      );

      // Determine if error is retryable
      const isRetryable = this.isRetryableError(error);

      return {
        success: false,
        postId,
        error: {
          code: (error as any).code || 'UNKNOWN',
          message: error.message,
          retryable: isRetryable,
        },
      };
    }
  }

  private async validatePost(postId: string) {
    const post = await this.prisma.instagramPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    if (post.status === 'PUBLISHED') {
      throw new Error(`Post ${postId} is already published`);
    }

    if (post.status === 'CANCELLED') {
      throw new Error(`Post ${postId} has been cancelled`);
    }

    return post;
  }

  private async getInstagramAccount(accountId: string) {
    const account = await this.prisma.instagramAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error(`Instagram account ${accountId} not found`);
    }

    if (!account.accessToken) {
      throw new Error(`Instagram account ${accountId} has no access token`);
    }

    if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
      throw new Error(`Instagram account ${accountId} access token has expired`);
    }

    return account;
  }

  private buildCaption(data: PublishPostJobData): string {
    let caption = data.caption;

    // Add hashtags if not already in caption
    if (data.hashtags && data.hashtags.length > 0) {
      const hashtagsInCaption = caption.match(/#\w+/g) || [];
      const newHashtags = data.hashtags
        .filter(tag => !hashtagsInCaption.includes(`#${tag}`))
        .map(tag => `#${tag}`)
        .join(' ');

      if (newHashtags) {
        caption = `${caption}\n\n${newHashtags}`;
      }
    }

    return caption;
  }

  private async updatePostStatus(postId: string, data: any) {
    await this.prisma.instagramPost.update({
      where: { id: postId },
      data,
    });
  }

  private isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Instagram API errors marked as retryable
    if (error.retryable === true) {
      return true;
    }

    // Rate limit errors are retryable
    if (error.message?.includes('rate limit')) {
      return true;
    }

    // Temporary Instagram errors
    const retryableMessages = [
      'temporarily blocked',
      'try again later',
      'server error',
    ];

    return retryableMessages.some(msg =>
      error.message?.toLowerCase().includes(msg)
    );
  }

  @OnWorkerEvent('active')
  onActive(job: Job<PublishPostJobData>) {
    this.logger.log(`Job ${job.id} for post ${job.data.postId} is now active`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<PublishPostJobData>, result: PublishPostJobResult) {
    this.logger.log(
      `Job ${job.id} for post ${job.data.postId} completed. Success: ${result.success}`
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<PublishPostJobData>, error: Error) {
    this.logger.error(
      `Job ${job.id} for post ${job.data.postId} failed: ${error.message}`,
      error.stack
    );
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job<PublishPostJobData>, progress: number) {
    this.logger.debug(`Job ${job.id} progress: ${progress}%`);
  }
}
```

### 5. Database Service

#### Post Status Management
```typescript
// src/workers/services/post-status.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { InstagramPostStatus } from '@prisma/client';

export interface PostStatusUpdate {
  status: InstagramPostStatus;
  instagramPostId?: string;
  permalink?: string;
  publishedAt?: Date;
  failureReason?: string;
  lastAttemptAt?: Date;
  retryCount?: number;
}

@Injectable()
export class PostStatusService {
  private readonly logger = new Logger(PostStatusService.name);

  constructor(private prisma: PrismaService) {}

  async updateStatus(postId: string, update: PostStatusUpdate) {
    try {
      const post = await this.prisma.instagramPost.update({
        where: { id: postId },
        data: {
          status: update.status,
          instagramPostId: update.instagramPostId,
          permalink: update.permalink,
          publishedAt: update.publishedAt,
          failureReason: update.failureReason,
          lastAttemptAt: update.lastAttemptAt,
          retryCount: update.retryCount,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Updated post ${postId} status to ${update.status}`);
      return post;

    } catch (error) {
      this.logger.error(`Failed to update post status: ${error.message}`, error.stack);
      throw error;
    }
  }

  async markAsPublishing(postId: string) {
    return this.updateStatus(postId, {
      status: 'PUBLISHING',
      lastAttemptAt: new Date(),
    });
  }

  async markAsPublished(postId: string, instagramPostId: string, permalink: string) {
    return this.updateStatus(postId, {
      status: 'PUBLISHED',
      instagramPostId,
      permalink,
      publishedAt: new Date(),
    });
  }

  async markAsFailed(postId: string, reason: string, retryCount: number) {
    return this.updateStatus(postId, {
      status: 'FAILED',
      failureReason: reason,
      lastAttemptAt: new Date(),
      retryCount,
    });
  }

  async incrementRetryCount(postId: string) {
    const post = await this.prisma.instagramPost.findUnique({
      where: { id: postId },
      select: { retryCount: true },
    });

    const newRetryCount = (post?.retryCount || 0) + 1;

    await this.prisma.instagramPost.update({
      where: { id: postId },
      data: { retryCount: newRetryCount },
    });

    return newRetryCount;
  }

  async getPostsToRetry(limit: number = 10) {
    return this.prisma.instagramPost.findMany({
      where: {
        status: 'FAILED',
        retryCount: { lt: 5 },
        scheduledFor: { lte: new Date() },
      },
      take: limit,
      orderBy: { lastAttemptAt: 'asc' },
    });
  }
}
```

### 6. Notification Service

#### Publishing Notifications
```typescript
// src/notifications/services/publishing-notifications.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { EmailNotificationService } from './email-notification.service';
import { WebPushNotificationService } from './web-push-notification.service';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class PublishingNotificationService {
  private readonly logger = new Logger(PublishingNotificationService.name);

  constructor(
    private emailService: EmailNotificationService,
    private webPushService: WebPushNotificationService,
    private prisma: PrismaService,
  ) {}

  async sendPostPublishedNotification(
    userId: string,
    postId: string,
    permalink: string
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      const post = await this.prisma.instagramPost.findUnique({
        where: { id: postId },
        select: { caption: true },
      });

      if (!user || !post) {
        return;
      }

      // Send email notification
      await this.emailService.sendEmail({
        to: user.email,
        subject: 'Your Instagram post was published successfully',
        template: 'post-published',
        context: {
          userName: user.name,
          caption: post.caption.substring(0, 100),
          permalink,
        },
      });

      // Send web push notification
      await this.webPushService.sendNotification(userId, {
        title: 'Post Published',
        body: 'Your Instagram post was published successfully',
        icon: '/icons/instagram.png',
        data: {
          url: permalink,
        },
      });

      this.logger.log(`Sent success notification for post ${postId} to user ${userId}`);

    } catch (error) {
      this.logger.error(`Failed to send success notification: ${error.message}`);
      // Don't throw - notifications are non-critical
    }
  }

  async sendPostFailedNotification(
    userId: string,
    postId: string,
    errorMessage: string
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      const post = await this.prisma.instagramPost.findUnique({
        where: { id: postId },
        select: { caption: true, retryCount: true },
      });

      if (!user || !post) {
        return;
      }

      // Send email notification
      await this.emailService.sendEmail({
        to: user.email,
        subject: 'Failed to publish your Instagram post',
        template: 'post-failed',
        context: {
          userName: user.name,
          caption: post.caption.substring(0, 100),
          errorMessage,
          retryCount: post.retryCount,
          willRetry: (post.retryCount || 0) < 5,
        },
      });

      // Send web push notification
      await this.webPushService.sendNotification(userId, {
        title: 'Post Publishing Failed',
        body: errorMessage,
        icon: '/icons/error.png',
        data: {
          postId,
        },
      });

      this.logger.log(`Sent failure notification for post ${postId} to user ${userId}`);

    } catch (error) {
      this.logger.error(`Failed to send failure notification: ${error.message}`);
      // Don't throw - notifications are non-critical
    }
  }
}
```

### 7. Module Configuration

#### Worker Module Setup
```typescript
// src/workers/workers.module.ts

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationsModule } from '@/notifications/notifications.module';

import { InstagramPublishingQueue } from './queues/instagram-publishing.queue';
import { InstagramPublishingProcessor } from './processors/instagram-publishing.processor';
import { MediaDownloaderService } from './services/media-downloader.service';
import { InstagramPublisherService } from './services/instagram-publisher.service';
import { PostStatusService } from './services/post-status.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    NotificationsModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'instagram-post-publishing',
    }),
  ],
  providers: [
    InstagramPublishingQueue,
    InstagramPublishingProcessor,
    MediaDownloaderService,
    InstagramPublisherService,
    PostStatusService,
  ],
  exports: [
    InstagramPublishingQueue,
    MediaDownloaderService,
    InstagramPublisherService,
    PostStatusService,
  ],
})
export class WorkersModule {}
```

### 8. Environment Configuration

```bash
# .env.worker

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# MinIO S3 Configuration
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=social-selling

# Instagram API
INSTAGRAM_GRAPH_API_VERSION=v18.0

# Worker Configuration
WORKER_CONCURRENCY=3
WORKER_MAX_ATTEMPTS=5
WORKER_BACKOFF_DELAY=30000

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/worker.log
```

## Testing Requirements

### Unit Tests
```typescript
// src/workers/processors/instagram-publishing.processor.spec.ts

describe('InstagramPublishingProcessor', () => {
  let processor: InstagramPublishingProcessor;
  let prisma: PrismaService;
  let mediaDownloader: MediaDownloaderService;
  let instagramPublisher: InstagramPublisherService;
  let notificationService: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstagramPublishingProcessor,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MediaDownloaderService,
          useValue: mockMediaDownloader,
        },
        {
          provide: InstagramPublisherService,
          useValue: mockInstagramPublisher,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    processor = module.get<InstagramPublishingProcessor>(InstagramPublishingProcessor);
  });

  describe('process', () => {
    it('should successfully publish a single image post', async () => {
      // Test implementation
    });

    it('should successfully publish a carousel post', async () => {
      // Test implementation
    });

    it('should successfully publish a video post', async () => {
      // Test implementation
    });

    it('should handle media download failures', async () => {
      // Test implementation
    });

    it('should handle Instagram API errors', async () => {
      // Test implementation
    });

    it('should retry on retryable errors', async () => {
      // Test implementation
    });

    it('should cleanup temporary files after publishing', async () => {
      // Test implementation
    });
  });
});
```

### Integration Tests
```typescript
// src/workers/integration/publishing.integration.spec.ts

describe('Publishing Worker Integration', () => {
  it('should process a complete publishing workflow', async () => {
    // 1. Add job to queue
    // 2. Wait for processing
    // 3. Verify database update
    // 4. Verify S3 cleanup
    // 5. Verify notifications sent
  });

  it('should handle rate limiting correctly', async () => {
    // Add multiple jobs and verify rate limiting
  });

  it('should retry failed jobs with exponential backoff', async () => {
    // Verify retry logic
  });
});
```

## Acceptance Criteria

### Functional Requirements
- [ ] BullMQ queue successfully configured with Redis connection
- [ ] Queue accepts post publishing jobs with all required data
- [ ] Worker processes jobs with concurrency limit of 3
- [ ] Media files successfully downloaded from MinIO S3
- [ ] Single image posts published to Instagram via Graph API
- [ ] Carousel posts (2-10 items) published successfully
- [ ] Video posts published with processing wait logic
- [ ] First comment added to posts when specified
- [ ] User tags applied to image posts correctly
- [ ] Location tagging working for all post types
- [ ] Post status updated to PUBLISHING when job starts
- [ ] Post status updated to PUBLISHED on success with Instagram post ID
- [ ] Post status updated to FAILED on error with reason
- [ ] Permalink stored in database after successful publish
- [ ] Temporary media files cleaned up after processing
- [ ] Success notifications sent to users via email and push
- [ ] Failure notifications sent with error details
- [ ] Scheduled posts published at correct time
- [ ] Jobs can be cancelled before processing
- [ ] Jobs can be rescheduled to different time

### Error Handling Requirements
- [ ] Network errors trigger retry with exponential backoff
- [ ] Invalid access token errors marked as non-retryable
- [ ] Rate limit errors wait and retry appropriately
- [ ] Video processing timeouts handled gracefully
- [ ] Missing media files in S3 cause job failure
- [ ] Invalid media formats rejected with clear error
- [ ] Instagram API errors properly categorized (retryable vs non-retryable)
- [ ] Maximum retry limit (5 attempts) enforced
- [ ] Failed jobs kept in queue for 7 days for debugging
- [ ] Completed jobs kept for 24 hours then removed

### Performance Requirements
- [ ] Worker processes up to 10 jobs per minute per instance
- [ ] Media download timeout set to 2 minutes
- [ ] Instagram API timeout set to 2 minutes
- [ ] Video processing wait maximum 5 minutes
- [ ] Job progress updated at key milestones (10%, 20%, 50%, 80%, 90%, 100%)
- [ ] Queue metrics exposed for monitoring
- [ ] Memory usage stays under 512MB per worker
- [ ] No memory leaks from temporary files

### Monitoring Requirements
- [ ] All job state changes logged (active, completed, failed)
- [ ] Error logs include full stack traces
- [ ] Job processing time tracked and logged
- [ ] Queue depth monitored and alerted
- [ ] Failed job count tracked per hour
- [ ] Success rate calculated and monitored
- [ ] Bull Board UI accessible for queue inspection
- [ ] Metrics exported to monitoring system (Prometheus/Grafana)

## Documentation Requirements

### Code Documentation
- All services must have JSDoc comments
- Complex algorithms must have inline comments
- Error handling logic must be documented
- API integration points must reference official docs

### Operational Documentation
- Worker deployment guide
- Scaling guidelines
- Troubleshooting common errors
- Queue monitoring dashboard setup
- Alert configuration examples

## Future Enhancements
- Support for Instagram Stories publishing
- Support for Instagram Reels publishing
- Bulk post scheduling from CSV
- A/B testing for post content
- Automatic best time to post detection
- Post performance predictions
- Advanced retry strategies per error type
- Multi-region worker deployment

## Related Tasks
- IG-004: Instagram Graph API Integration
- WORKER-002: Instagram Webhook Processing Worker
- WORKER-003: Instagram Analytics Sync Worker
- WORKER-004: Email Notification Worker

## References
- [Instagram Content Publishing API](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [MinIO Node.js SDK](https://docs.min.io/docs/javascript-client-quickstart-guide.html)

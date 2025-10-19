import { Injectable, Logger, Inject } from '@nestjs/common';
import { IInstagramScheduledPostRepository } from '../../domain/repositories/instagram-scheduled-post.repository.interface';
import { PostStatus } from '../../domain/entities/instagram-scheduled-post.entity';

/**
 * Post status update data
 */
export interface PostStatusUpdate {
  status: PostStatus;
  instagramPostId?: string;
  permalink?: string;
  publishedAt?: Date;
  failureReason?: string;
  lastAttemptAt?: Date;
  retryCount?: number;
}

/**
 * Service for managing post status updates
 */
@Injectable()
export class PostStatusService {
  private readonly logger = new Logger(PostStatusService.name);

  constructor(
    @Inject('IInstagramScheduledPostRepository')
    private readonly postRepository: IInstagramScheduledPostRepository,
  ) {}

  /**
   * Update post status
   * @param postId Post ID
   * @param update Status update data
   */
  async updateStatus(postId: string, update: PostStatusUpdate) {
    try {
      const post = await this.postRepository.findById(postId);

      if (!post) {
        throw new Error(`Post ${postId} not found`);
      }

      // Get the current post data
      const postData = post.toJSON();

      // Apply updates based on the status transition
      if (update.status === PostStatus.PUBLISHING) {
        post.markAsPublishing();
      } else if (update.status === PostStatus.PUBLISHED && update.instagramPostId && update.permalink) {
        post.markAsPublished(update.instagramPostId, update.permalink);
      } else if (update.status === PostStatus.FAILED && update.failureReason) {
        post.markAsFailed(update.failureReason);
      }

      const updated = await this.postRepository.update(post);

      this.logger.log(`Updated post ${postId} status to ${update.status}`);
      return updated;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to update post status: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Mark post as publishing
   */
  async markAsPublishing(postId: string) {
    return this.updateStatus(postId, {
      status: PostStatus.PUBLISHING,
      lastAttemptAt: new Date(),
    });
  }

  /**
   * Mark post as published
   */
  async markAsPublished(
    postId: string,
    instagramPostId: string,
    permalink: string,
  ) {
    return this.updateStatus(postId, {
      status: PostStatus.PUBLISHED,
      instagramPostId,
      permalink,
      publishedAt: new Date(),
    });
  }

  /**
   * Mark post as failed
   */
  async markAsFailed(postId: string, reason: string, retryCount: number) {
    return this.updateStatus(postId, {
      status: PostStatus.FAILED,
      failureReason: reason,
      lastAttemptAt: new Date(),
      retryCount,
    });
  }

  /**
   * Increment retry count
   */
  async incrementRetryCount(postId: string): Promise<number> {
    const post = await this.postRepository.findById(postId);

    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    const newRetryCount = post.publishAttempts + 1;

    // Mark as failed to increment attempts
    post.markAsFailed('Retry attempt');

    await this.postRepository.update(post);

    return newRetryCount;
  }
}

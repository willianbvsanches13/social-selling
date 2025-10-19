import { Injectable, Logger } from '@nestjs/common';

/**
 * Publishing Notification Service
 * Sends notifications to users about post publishing status
 *
 * Note: This is a stub implementation. Full implementation will be in WORKER-004.
 */
@Injectable()
export class PublishingNotificationService {
  private readonly logger = new Logger(PublishingNotificationService.name);

  /**
   * Send post published success notification
   * @param userId User ID
   * @param postId Post ID
   * @param permalink Instagram post permalink
   */
  async sendPostPublishedNotification(
    userId: string,
    postId: string,
    permalink: string,
  ): Promise<void> {
    this.logger.log(
      `[STUB] Would send success notification for post ${postId} to user ${userId}`,
    );
    this.logger.log(`[STUB] Post published at: ${permalink}`);

    // TODO: Implement actual notification logic in WORKER-004
    // - Send email notification
    // - Send web push notification
    // - Trigger WebSocket event for real-time updates
  }

  /**
   * Send post publishing failed notification
   * @param userId User ID
   * @param postId Post ID
   * @param errorMessage Error message
   */
  async sendPostFailedNotification(
    userId: string,
    postId: string,
    errorMessage: string,
  ): Promise<void> {
    this.logger.log(
      `[STUB] Would send failure notification for post ${postId} to user ${userId}`,
    );
    this.logger.error(`[STUB] Failure reason: ${errorMessage}`);

    // TODO: Implement actual notification logic in WORKER-004
    // - Send email notification with error details
    // - Send web push notification
    // - Trigger WebSocket event for real-time updates
  }
}

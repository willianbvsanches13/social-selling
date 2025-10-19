import { Injectable, Logger } from '@nestjs/common';
import { WebhookEventType } from './event-deduplication.service';

/**
 * Normalized Comment structure
 */
export interface NormalizedComment {
  id: string;
  text: string;
  timestamp: Date;
  from: {
    id: string;
    username: string;
  };
  media: {
    id: string;
    type: string;
  };
  parentId?: string;
  likeCount?: number;
  isHidden?: boolean;
}

/**
 * Normalized Mention structure
 */
export interface NormalizedMention {
  id: string;
  mediaId: string;
  commentId?: string;
  timestamp: Date;
  mentionedIn: 'story' | 'post' | 'comment';
  from: {
    id: string;
    username: string;
  };
}

/**
 * Normalized Message structure
 */
export interface NormalizedMessage {
  id: string;
  text?: string;
  attachments?: Array<{
    type: string;
    url: string;
  }>;
  timestamp: Date;
  from: {
    id: string;
    username?: string;
  };
  conversationId: string;
  isEcho?: boolean;
}

/**
 * Normalized Story Insight structure
 */
export interface NormalizedStoryInsight {
  mediaId: string;
  metric: string;
  value: number;
  timestamp: Date;
}

/**
 * Union type for all normalized events
 */
export type NormalizedEvent =
  | NormalizedComment
  | NormalizedMention
  | NormalizedMessage
  | NormalizedStoryInsight;

/**
 * Event Normalizer Service
 *
 * Transforms raw Instagram webhook payloads into normalized, typed data structures.
 * Handles various Instagram API formats and ensures consistent data shape for processing.
 */
@Injectable()
export class EventNormalizerService {
  private readonly logger = new Logger(EventNormalizerService.name);

  /**
   * Normalize webhook event based on its type
   *
   * @param eventType - Type of webhook event
   * @param rawPayload - Raw payload from Instagram API
   * @returns Normalized event data
   * @throws Error if normalization fails or event type is unknown
   */
  normalizeEvent(
    eventType: WebhookEventType,
    rawPayload: any,
  ): NormalizedEvent {
    try {
      switch (eventType) {
        case WebhookEventType.COMMENT:
          return this.normalizeComment(rawPayload);

        case WebhookEventType.MENTION:
          return this.normalizeMention(rawPayload);

        case WebhookEventType.MESSAGE:
          return this.normalizeMessage(rawPayload);

        case WebhookEventType.STORY_INSIGHT:
          return this.normalizeStoryInsight(rawPayload);

        case WebhookEventType.LIVE_COMMENT:
          // Live comments use same structure as regular comments
          return this.normalizeComment(rawPayload);

        default:
          throw new Error(`Unknown event type: ${eventType}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to normalize event: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Normalize Instagram comment event
   *
   * @param payload - Raw comment payload
   * @returns Normalized comment
   */
  private normalizeComment(payload: any): NormalizedComment {
    return {
      id: payload.id || payload.comment_id,
      text: payload.text || '',
      timestamp: this.parseTimestamp(payload.timestamp || payload.created_time),
      from: {
        id: payload.from?.id || '',
        username: payload.from?.username || 'unknown',
      },
      media: {
        id: payload.media?.id || payload.media_id || '',
        type: payload.media?.media_type || 'unknown',
      },
      parentId: payload.parent_id || payload.parent?.id,
      likeCount: payload.like_count || 0,
      isHidden: payload.is_hidden || false,
    };
  }

  /**
   * Normalize Instagram mention event
   *
   * @param payload - Raw mention payload
   * @returns Normalized mention
   */
  private normalizeMention(payload: any): NormalizedMention {
    // Determine where the mention occurred
    let mentionedIn: 'story' | 'post' | 'comment' = 'post';

    if (payload.media?.media_product_type === 'STORY') {
      mentionedIn = 'story';
    } else if (payload.comment_id) {
      mentionedIn = 'comment';
    }

    return {
      id: payload.id,
      mediaId: payload.media_id,
      commentId: payload.comment_id,
      timestamp: this.parseTimestamp(payload.timestamp || payload.created_time),
      mentionedIn,
      from: {
        id: payload.from?.id || '',
        username: payload.from?.username || 'unknown',
      },
    };
  }

  /**
   * Normalize Instagram direct message event
   *
   * @param payload - Raw message payload
   * @returns Normalized message
   */
  private normalizeMessage(payload: any): NormalizedMessage {
    const attachments = [];

    // Parse attachments if present
    if (payload.attachments && Array.isArray(payload.attachments)) {
      for (const attachment of payload.attachments) {
        attachments.push({
          type: attachment.type,
          url: attachment.payload?.url || '',
        });
      }
    }

    return {
      id: payload.id || payload.mid,
      text: payload.message?.text || payload.text,
      attachments: attachments.length > 0 ? attachments : undefined,
      timestamp: this.parseTimestamp(payload.timestamp || payload.created_time),
      from: {
        id: payload.from?.id || payload.sender?.id || '',
        username: payload.from?.username || payload.sender?.username,
      },
      conversationId:
        payload.conversation_id ||
        payload.recipient?.id ||
        payload.from?.id ||
        '',
      isEcho: payload.is_echo || false,
    };
  }

  /**
   * Normalize Instagram story insight event
   *
   * @param payload - Raw story insight payload
   * @returns Normalized story insight
   */
  private normalizeStoryInsight(payload: any): NormalizedStoryInsight {
    return {
      mediaId: payload.media_id,
      metric: payload.metric,
      value: parseInt(String(payload.value), 10) || 0,
      timestamp: this.parseTimestamp(payload.timestamp || payload.end_time),
    };
  }

  /**
   * Validate normalized event has required fields
   *
   * @param event - Normalized event
   * @param eventType - Event type
   * @returns true if valid, false otherwise
   */
  validateNormalizedEvent(
    event: NormalizedEvent,
    eventType: WebhookEventType,
  ): boolean {
    try {
      switch (eventType) {
        case WebhookEventType.COMMENT:
        case WebhookEventType.LIVE_COMMENT: {
          const comment = event as NormalizedComment;
          return !!(comment.id && comment.text && comment.from.id);
        }

        case WebhookEventType.MENTION: {
          const mention = event as NormalizedMention;
          return !!(mention.id && mention.mediaId && mention.from.id);
        }

        case WebhookEventType.MESSAGE: {
          const message = event as NormalizedMessage;
          return !!(message.id && message.from.id);
        }

        case WebhookEventType.STORY_INSIGHT: {
          const insight = event as NormalizedStoryInsight;
          return !!(insight.mediaId && insight.metric && insight.value >= 0);
        }

        default:
          return false;
      }
    } catch (error) {
      this.logger.error(
        `Validation error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Parse timestamp from various formats
   *
   * Instagram API may send timestamps as Unix timestamp (seconds) or ISO string
   *
   * @param timestamp - Timestamp in various formats
   * @returns Parsed Date object
   */
  private parseTimestamp(timestamp: any): Date {
    if (!timestamp) {
      return new Date();
    }

    // If it's already a Date object
    if (timestamp instanceof Date) {
      return timestamp;
    }

    // If it's a number (Unix timestamp in seconds)
    if (typeof timestamp === 'number') {
      return new Date(timestamp * 1000);
    }

    // If it's a string (ISO format or Unix timestamp)
    if (typeof timestamp === 'string') {
      // Try parsing as number first (Unix timestamp)
      const numTimestamp = parseInt(timestamp, 10);
      if (!isNaN(numTimestamp)) {
        return new Date(numTimestamp * 1000);
      }

      // Try parsing as ISO string
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Fallback to current time
    this.logger.warn(
      `Could not parse timestamp: ${timestamp}, using current time`,
    );
    return new Date();
  }
}

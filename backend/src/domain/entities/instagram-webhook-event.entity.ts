import { v4 as uuid } from 'uuid';

export enum WebhookEventType {
  COMMENT = 'comment',
  MENTION = 'mention',
  MESSAGE = 'message',
  STORY_MENTION = 'story_mention',
  LIVE_COMMENT = 'live_comment',
}

export interface InstagramWebhookEventProps {
  id: string;
  eventType: WebhookEventType;
  eventId: string;
  instagramAccountId?: string;
  objectType?: string;
  objectId?: string;
  senderIgId?: string;
  senderUsername?: string;
  payload: Record<string, unknown>;
  processed: boolean;
  processedAt?: Date;
  processingAttempts: number;
  lastProcessingError?: string;
  isDuplicate: boolean;
  duplicateOf?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class InstagramWebhookEvent {
  private props: InstagramWebhookEventProps;

  private constructor(props: InstagramWebhookEventProps) {
    this.props = props;
  }

  static create(
    props: Omit<InstagramWebhookEventProps, 'id' | 'createdAt' | 'updatedAt' | 'processingAttempts'>,
  ): InstagramWebhookEvent {
    return new InstagramWebhookEvent({
      ...props,
      id: uuid(),
      processingAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: InstagramWebhookEventProps): InstagramWebhookEvent {
    return new InstagramWebhookEvent(props);
  }

  get id(): string {
    return this.props.id;
  }

  get eventType(): WebhookEventType {
    return this.props.eventType;
  }

  get eventId(): string {
    return this.props.eventId;
  }

  get instagramAccountId(): string | undefined {
    return this.props.instagramAccountId;
  }

  get processed(): boolean {
    return this.props.processed;
  }

  get isDuplicate(): boolean {
    return this.props.isDuplicate;
  }

  get payload(): Record<string, unknown> {
    return this.props.payload;
  }

  get processingAttempts(): number {
    return this.props.processingAttempts;
  }

  markAsProcessed(): void {
    this.props.processed = true;
    this.props.processedAt = new Date();
    this.props.updatedAt = new Date();
  }

  markAsFailed(error: string): void {
    this.props.processingAttempts++;
    this.props.lastProcessingError = error;
    this.props.updatedAt = new Date();
  }

  markAsDuplicate(originalEventId: string): void {
    this.props.isDuplicate = true;
    this.props.duplicateOf = originalEventId;
    this.props.updatedAt = new Date();
  }

  canRetry(maxRetries: number = 3): boolean {
    return this.props.processingAttempts < maxRetries && !this.props.processed;
  }

  toJSON() {
    return {
      id: this.props.id,
      eventType: this.props.eventType,
      eventId: this.props.eventId,
      instagramAccountId: this.props.instagramAccountId,
      objectType: this.props.objectType,
      objectId: this.props.objectId,
      senderIgId: this.props.senderIgId,
      senderUsername: this.props.senderUsername,
      payload: this.props.payload,
      processed: this.props.processed,
      processedAt: this.props.processedAt,
      processingAttempts: this.props.processingAttempts,
      lastProcessingError: this.props.lastProcessingError,
      isDuplicate: this.props.isDuplicate,
      duplicateOf: this.props.duplicateOf,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}

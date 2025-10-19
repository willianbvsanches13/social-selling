export enum PostMediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  CAROUSEL = 'CAROUSEL',
  REELS = 'REELS',
}

export enum PostStatus {
  SCHEDULED = 'scheduled',
  PUBLISHING = 'publishing',
  PUBLISHED = 'published',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface ProductTag {
  productId: string;
  x: number;
  y: number;
}

export interface InstagramScheduledPostProps {
  id: string;
  clientAccountId: string;
  userId: string;
  scheduledFor: Date;
  publishedAt?: Date;
  caption: string;
  mediaUrls: string[];
  mediaType: PostMediaType;
  productTags?: ProductTag[];
  locationId?: string;
  templateId?: string;
  templateVariables?: Record<string, string>;
  status: PostStatus;
  publishAttempts: number;
  lastPublishError?: string;
  instagramMediaId?: string;
  instagramMediaUrl?: string;
  permalink?: string;
  initialLikes?: number;
  initialComments?: number;
  initialReach?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
}

export class InstagramScheduledPost {
  private props: InstagramScheduledPostProps;

  private constructor(props: InstagramScheduledPostProps) {
    this.props = props;
  }

  static create(
    props: Omit<
      InstagramScheduledPostProps,
      'id' | 'createdAt' | 'updatedAt' | 'publishAttempts' | 'status'
    >,
  ): InstagramScheduledPost {
    return new InstagramScheduledPost({
      ...props,
      id: crypto.randomUUID(),
      status: PostStatus.SCHEDULED,
      publishAttempts: 0,
      metadata: props.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(
    props: InstagramScheduledPostProps,
  ): InstagramScheduledPost {
    return new InstagramScheduledPost(props);
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get clientAccountId(): string {
    return this.props.clientAccountId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get status(): PostStatus {
    return this.props.status;
  }

  get scheduledFor(): Date {
    return this.props.scheduledFor;
  }

  get caption(): string {
    return this.props.caption;
  }

  get mediaUrls(): string[] {
    return this.props.mediaUrls;
  }

  get mediaType(): PostMediaType {
    return this.props.mediaType;
  }

  get publishAttempts(): number {
    return this.props.publishAttempts;
  }

  get isScheduled(): boolean {
    return this.props.status === PostStatus.SCHEDULED;
  }

  get isPublished(): boolean {
    return this.props.status === PostStatus.PUBLISHED;
  }

  get isFailed(): boolean {
    return this.props.status === PostStatus.FAILED;
  }

  get isCancelled(): boolean {
    return this.props.status === PostStatus.CANCELLED;
  }

  get isPublishing(): boolean {
    return this.props.status === PostStatus.PUBLISHING;
  }

  // Mutators
  markAsPublishing(): void {
    if (this.props.status !== PostStatus.SCHEDULED) {
      throw new Error('Only scheduled posts can be marked as publishing');
    }
    this.props.status = PostStatus.PUBLISHING;
    this.props.updatedAt = new Date();
  }

  markAsPublished(instagramMediaId: string, permalink: string): void {
    this.props.status = PostStatus.PUBLISHED;
    this.props.instagramMediaId = instagramMediaId;
    this.props.permalink = permalink;
    this.props.publishedAt = new Date();
    this.props.updatedAt = new Date();
  }

  markAsFailed(error: string): void {
    this.props.status = PostStatus.FAILED;
    this.props.lastPublishError = error;
    this.props.publishAttempts++;
    this.props.updatedAt = new Date();
  }

  markAsCancelled(): void {
    if (
      ![PostStatus.SCHEDULED, PostStatus.FAILED].includes(this.props.status)
    ) {
      throw new Error('Only scheduled or failed posts can be cancelled');
    }
    this.props.status = PostStatus.CANCELLED;
    this.props.cancelledAt = new Date();
    this.props.updatedAt = new Date();
  }

  updateScheduledTime(newScheduledFor: Date): void {
    if (!this.isScheduled) {
      throw new Error('Can only reschedule posts that are in scheduled status');
    }
    this.props.scheduledFor = newScheduledFor;
    this.props.updatedAt = new Date();
  }

  updateCaption(newCaption: string): void {
    if (!this.isScheduled) {
      throw new Error('Can only edit posts that are in scheduled status');
    }
    this.props.caption = newCaption;
    this.props.updatedAt = new Date();
  }

  updateMediaUrls(newMediaUrls: string[]): void {
    if (!this.isScheduled) {
      throw new Error('Can only edit posts that are in scheduled status');
    }
    this.props.mediaUrls = newMediaUrls;
    this.props.updatedAt = new Date();
  }

  canRetry(maxRetries: number = 3): boolean {
    return (
      this.props.publishAttempts < maxRetries &&
      this.props.status === PostStatus.FAILED
    );
  }

  setInitialMetrics(likes: number, comments: number, reach: number): void {
    this.props.initialLikes = likes;
    this.props.initialComments = comments;
    this.props.initialReach = reach;
    this.props.updatedAt = new Date();
  }

  toJSON(): InstagramScheduledPostProps {
    return {
      ...this.props,
    };
  }
}

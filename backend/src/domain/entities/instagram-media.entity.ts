export enum InstagramMediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  CAROUSEL_ALBUM = 'carousel_album',
  STORY = 'story',
  REEL = 'reel',
}

export enum PublishStatus {
  SCHEDULED = 'scheduled',
  PUBLISHING = 'publishing',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

export interface InstagramMediaProps {
  id: string;
  clientAccountId: string;
  platformMediaId?: string;
  mediaType: InstagramMediaType;
  caption?: string;
  mediaUrls: string[];
  scheduledAt?: Date;
  publishedAt?: Date;
  status: PublishStatus;
  errorMessage?: string;
  retryCount: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class InstagramMedia {
  private props: InstagramMediaProps;

  private constructor(props: InstagramMediaProps) {
    this.props = props;
  }

  static create(
    props: Omit<InstagramMediaProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): InstagramMedia {
    return new InstagramMedia({
      ...props,
      id: crypto.randomUUID(),
      metadata: props.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: InstagramMediaProps): InstagramMedia {
    return new InstagramMedia(props);
  }

  get id(): string {
    return this.props.id;
  }

  get clientAccountId(): string {
    return this.props.clientAccountId;
  }

  get status(): PublishStatus {
    return this.props.status;
  }

  get isScheduled(): boolean {
    return this.props.status === PublishStatus.SCHEDULED;
  }

  get isPublished(): boolean {
    return this.props.status === PublishStatus.PUBLISHED;
  }

  markAsPublishing(): void {
    this.props.status = PublishStatus.PUBLISHING;
    this.props.updatedAt = new Date();
  }

  markAsPublished(platformMediaId: string): void {
    this.props.status = PublishStatus.PUBLISHED;
    this.props.platformMediaId = platformMediaId;
    this.props.publishedAt = new Date();
    this.props.updatedAt = new Date();
  }

  markAsFailed(errorMessage: string): void {
    this.props.status = PublishStatus.FAILED;
    this.props.errorMessage = errorMessage;
    this.props.retryCount++;
    this.props.updatedAt = new Date();
  }

  canRetry(maxRetries: number = 3): boolean {
    return this.props.retryCount < maxRetries;
  }

  toJSON() {
    return {
      id: this.props.id,
      clientAccountId: this.props.clientAccountId,
      platformMediaId: this.props.platformMediaId,
      mediaType: this.props.mediaType,
      caption: this.props.caption,
      mediaUrls: this.props.mediaUrls,
      scheduledAt: this.props.scheduledAt,
      publishedAt: this.props.publishedAt,
      status: this.props.status,
      errorMessage: this.props.errorMessage,
      retryCount: this.props.retryCount,
      metadata: this.props.metadata,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}

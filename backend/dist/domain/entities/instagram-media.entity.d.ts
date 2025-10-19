export declare enum InstagramMediaType {
    IMAGE = "image",
    VIDEO = "video",
    CAROUSEL_ALBUM = "carousel_album",
    STORY = "story",
    REEL = "reel"
}
export declare enum PublishStatus {
    SCHEDULED = "scheduled",
    PUBLISHING = "publishing",
    PUBLISHED = "published",
    FAILED = "failed"
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
export declare class InstagramMedia {
    private props;
    private constructor();
    static create(props: Omit<InstagramMediaProps, 'id' | 'createdAt' | 'updatedAt'>): InstagramMedia;
    static reconstitute(props: InstagramMediaProps): InstagramMedia;
    get id(): string;
    get clientAccountId(): string;
    get status(): PublishStatus;
    get isScheduled(): boolean;
    get isPublished(): boolean;
    markAsPublishing(): void;
    markAsPublished(platformMediaId: string): void;
    markAsFailed(errorMessage: string): void;
    canRetry(maxRetries?: number): boolean;
    toJSON(): {
        id: string;
        clientAccountId: string;
        platformMediaId: string | undefined;
        mediaType: InstagramMediaType;
        caption: string | undefined;
        mediaUrls: string[];
        scheduledAt: Date | undefined;
        publishedAt: Date | undefined;
        status: PublishStatus;
        errorMessage: string | undefined;
        retryCount: number;
        metadata: Record<string, unknown>;
        createdAt: Date;
        updatedAt: Date;
    };
}

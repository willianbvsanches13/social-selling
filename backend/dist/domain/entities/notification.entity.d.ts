export declare enum NotificationType {
    NEW_MESSAGE = "new_message",
    POST_PUBLISHED = "post_published",
    POST_FAILED = "post_failed",
    TOKEN_EXPIRING = "token_expiring"
}
export interface NotificationProps {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    isRead: boolean;
    metadata: Record<string, unknown>;
    createdAt: Date;
}
export declare class Notification {
    private props;
    private constructor();
    static create(props: Omit<NotificationProps, 'id' | 'isRead' | 'createdAt'>): Notification;
    static reconstitute(props: NotificationProps): Notification;
    get id(): string;
    get userId(): string;
    get type(): NotificationType;
    get isRead(): boolean;
    markAsRead(): void;
    toJSON(): {
        id: string;
        userId: string;
        type: NotificationType;
        title: string;
        message: string;
        isRead: boolean;
        metadata: Record<string, unknown>;
        createdAt: Date;
    };
}

export declare enum MessageType {
    TEXT = "text",
    IMAGE = "image",
    VIDEO = "video",
    AUDIO = "audio",
    STORY_MENTION = "story_mention",
    STORY_REPLY = "story_reply"
}
export declare enum SenderType {
    USER = "user",
    CUSTOMER = "customer"
}
export interface MessageProps {
    id: string;
    conversationId: string;
    platformMessageId: string;
    senderType: SenderType;
    senderPlatformId?: string;
    messageType: MessageType;
    content?: string;
    mediaUrl?: string;
    mediaType?: string;
    isRead: boolean;
    sentAt: Date;
    deliveredAt?: Date;
    readAt?: Date;
    metadata: Record<string, unknown>;
    createdAt: Date;
}
export declare class Message {
    private props;
    private constructor();
    static create(props: Omit<MessageProps, 'id' | 'createdAt' | 'isRead'>): Message;
    static reconstitute(props: MessageProps): Message;
    private validate;
    get id(): string;
    get conversationId(): string;
    get senderType(): SenderType;
    get isFromCustomer(): boolean;
    get isRead(): boolean;
    get sentAt(): Date;
    get content(): string | undefined;
    markAsRead(): void;
    markAsDelivered(): void;
    isWithinResponseWindow(windowHours?: number): boolean;
    containsProductMention(productName: string): boolean;
    toJSON(): {
        id: string;
        conversationId: string;
        platformMessageId: string;
        senderType: SenderType;
        senderPlatformId: string | undefined;
        messageType: MessageType;
        content: string | undefined;
        mediaUrl: string | undefined;
        mediaType: string | undefined;
        isRead: boolean;
        sentAt: Date;
        deliveredAt: Date | undefined;
        readAt: Date | undefined;
        metadata: Record<string, unknown>;
        createdAt: Date;
    };
}

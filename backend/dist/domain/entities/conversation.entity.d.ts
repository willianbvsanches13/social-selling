export declare enum ConversationStatus {
    OPEN = "open",
    CLOSED = "closed",
    ARCHIVED = "archived"
}
export interface ConversationProps {
    id: string;
    clientAccountId: string;
    platformConversationId: string;
    participantPlatformId: string;
    participantUsername?: string;
    participantProfilePic?: string;
    lastMessageAt?: Date;
    unreadCount: number;
    status: ConversationStatus;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
export declare class Conversation {
    private props;
    private constructor();
    static create(props: Omit<ConversationProps, 'id' | 'unreadCount' | 'status' | 'createdAt' | 'updatedAt'>): Conversation;
    static reconstitute(props: ConversationProps): Conversation;
    get id(): string;
    get clientAccountId(): string;
    get unreadCount(): number;
    get status(): ConversationStatus;
    get isOpen(): boolean;
    get lastMessageAt(): Date | undefined;
    incrementUnreadCount(): void;
    markAllAsRead(): void;
    updateLastMessage(timestamp: Date): void;
    close(): void;
    reopen(): void;
    archive(): void;
    isStale(daysSinceLastMessage?: number): boolean;
    toJSON(): {
        id: string;
        clientAccountId: string;
        platformConversationId: string;
        participantPlatformId: string;
        participantUsername: string | undefined;
        participantProfilePic: string | undefined;
        lastMessageAt: Date | undefined;
        unreadCount: number;
        status: ConversationStatus;
        metadata: Record<string, unknown>;
        createdAt: Date;
        updatedAt: Date;
    };
}

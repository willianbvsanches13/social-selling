export declare enum Platform {
    INSTAGRAM = "instagram",
    WHATSAPP = "whatsapp"
}
export declare enum AccountStatus {
    ACTIVE = "active",
    TOKEN_EXPIRED = "token_expired",
    DISCONNECTED = "disconnected"
}
export interface ClientAccountProps {
    id: string;
    userId: string;
    platform: Platform;
    platformAccountId: string;
    username: string;
    profilePictureUrl?: string;
    followerCount?: number;
    status: AccountStatus;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
export declare class ClientAccount {
    private props;
    private constructor();
    static create(props: Omit<ClientAccountProps, 'id' | 'createdAt' | 'updatedAt'>): ClientAccount;
    static reconstitute(props: ClientAccountProps): ClientAccount;
    private validate;
    get id(): string;
    get userId(): string;
    get platform(): Platform;
    get username(): string;
    get status(): AccountStatus;
    get isActive(): boolean;
    markAsTokenExpired(): void;
    reactivate(): void;
    disconnect(): void;
    updateMetadata(followerCount: number, profilePictureUrl?: string): void;
    toJSON(): {
        id: string;
        userId: string;
        platform: Platform;
        platformAccountId: string;
        username: string;
        profilePictureUrl: string | undefined;
        followerCount: number | undefined;
        status: AccountStatus;
        metadata: Record<string, unknown>;
        createdAt: Date;
        updatedAt: Date;
    };
}

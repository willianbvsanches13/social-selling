export declare enum Platform {
    INSTAGRAM = "instagram",
    WHATSAPP = "whatsapp"
}
export declare enum AccountStatus {
    ACTIVE = "active",
    TOKEN_EXPIRED = "token_expired",
    DISCONNECTED = "disconnected",
    RATE_LIMITED = "rate_limited",
    ERROR = "error"
}
export declare enum InstagramAccountType {
    PERSONAL = "personal",
    BUSINESS = "business",
    CREATOR = "creator"
}
export interface AccountMetadata {
    igId?: string;
    igBusinessAccountId?: string;
    facebookPageId?: string;
    isVerified?: boolean;
    lastMetadataUpdate?: Date;
    errorDetails?: {
        code: string;
        message: string;
        timestamp: Date;
    };
}
export interface ClientAccountProps {
    id: string;
    userId: string;
    platform: Platform;
    platformAccountId: string;
    username: string;
    displayName?: string;
    profilePictureUrl?: string;
    followerCount?: number;
    followingCount?: number;
    mediaCount?: number;
    biography?: string;
    website?: string;
    status: AccountStatus;
    accountType: InstagramAccountType;
    metadata: AccountMetadata;
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
    lastSyncAt?: Date;
    tokenExpiresAt?: Date;
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
    get platformAccountId(): string;
    get displayName(): string | undefined;
    get profilePictureUrl(): string | undefined;
    get followerCount(): number | undefined;
    get followingCount(): number | undefined;
    get mediaCount(): number | undefined;
    get biography(): string | undefined;
    get website(): string | undefined;
    get accountType(): InstagramAccountType;
    get metadata(): AccountMetadata;
    get permissions(): string[];
    get lastSyncAt(): Date | undefined;
    get tokenExpiresAt(): Date | undefined;
    get isActive(): boolean;
    get isTokenExpired(): boolean;
    markAsTokenExpired(): void;
    markAsRateLimited(): void;
    markAsError(error: {
        code: string;
        message: string;
    }): void;
    reactivate(): void;
    disconnect(): void;
    updateMetadata(data: {
        displayName?: string;
        profilePictureUrl?: string;
        followerCount?: number;
        followingCount?: number;
        mediaCount?: number;
        biography?: string;
        website?: string;
        metadata?: Partial<AccountMetadata>;
    }): void;
    updateTokenExpiration(expiresAt: Date): void;
    toJSON(): {
        id: string;
        userId: string;
        platform: Platform;
        platformAccountId: string;
        username: string;
        displayName: string | undefined;
        profilePictureUrl: string | undefined;
        followerCount: number | undefined;
        followingCount: number | undefined;
        mediaCount: number | undefined;
        biography: string | undefined;
        website: string | undefined;
        status: AccountStatus;
        accountType: InstagramAccountType;
        metadata: AccountMetadata;
        permissions: string[];
        createdAt: Date;
        updatedAt: Date;
        lastSyncAt: Date | undefined;
        tokenExpiresAt: Date | undefined;
    };
}

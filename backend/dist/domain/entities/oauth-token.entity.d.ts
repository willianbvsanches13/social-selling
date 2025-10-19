export interface OAuthTokenProps {
    id: string;
    clientAccountId: string;
    encryptedAccessToken: string;
    encryptedRefreshToken?: string;
    tokenType: string;
    expiresAt: Date;
    scope?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class OAuthToken {
    private props;
    private constructor();
    static create(props: Omit<OAuthTokenProps, 'id' | 'createdAt' | 'updatedAt'>): OAuthToken;
    static reconstitute(props: OAuthTokenProps): OAuthToken;
    private validate;
    get id(): string;
    get clientAccountId(): string;
    get isExpired(): boolean;
    get expiresAt(): Date;
    get encryptedAccessToken(): string;
    get encryptedRefreshToken(): string | undefined;
    isExpiringSoon(thresholdDays?: number): boolean;
    updateToken(encryptedAccessToken: string, expiresAt: Date, encryptedRefreshToken?: string): void;
    toJSON(): {
        id: string;
        clientAccountId: string;
        tokenType: string;
        expiresAt: Date;
        scope: string | undefined;
        createdAt: Date;
        updatedAt: Date;
    };
}

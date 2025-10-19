import { Email } from '../value-objects/email.vo';
export declare enum SubscriptionTier {
    FREE = "free",
    BASIC = "basic",
    PRO = "pro",
    ENTERPRISE = "enterprise"
}
export interface UserProps {
    id: string;
    email: Email;
    passwordHash: string;
    name: string;
    timezone: string;
    language: string;
    subscriptionTier: SubscriptionTier;
    emailVerified: boolean;
    emailVerificationToken?: string;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    lastLoginAt?: Date;
    lastLoginIp?: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}
export declare class User {
    private props;
    private constructor();
    static create(props: Omit<UserProps, 'id' | 'createdAt' | 'updatedAt'>): User;
    static reconstitute(props: UserProps): User;
    private validate;
    get id(): string;
    get email(): Email;
    get name(): string;
    get subscriptionTier(): SubscriptionTier;
    get emailVerified(): boolean;
    get isDeleted(): boolean;
    get passwordHash(): string;
    verifyEmail(): void;
    updateLastLogin(ip: string): void;
    upgradeTier(tier: SubscriptionTier): void;
    canConnectInstagramAccount(): boolean;
    setPasswordResetToken(token: string, expiresInMinutes?: number): void;
    isPasswordResetTokenValid(): boolean;
    softDelete(): void;
    updateProfile(name?: string, timezone?: string, language?: string): void;
    changePassword(newPasswordHash: string): void;
    setEmailVerificationToken(token: string): void;
    get timezone(): string;
    get language(): string;
    toJSON(): {
        id: string;
        email: string;
        name: string;
        timezone: string;
        language: string;
        subscriptionTier: SubscriptionTier;
        emailVerified: boolean;
        lastLoginAt: Date | undefined;
        createdAt: Date;
        updatedAt: Date;
    };
}

import { Email } from '../value-objects/email.vo';
import { DomainException } from '../exceptions/domain.exception';

export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
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

export class User {
  private props: UserProps;

  private constructor(props: UserProps) {
    this.props = props;
    this.validate();
  }

  static create(
    props: Omit<UserProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): User {
    return new User({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: UserProps): User {
    return new User(props);
  }

  private validate(): void {
    if (!this.props.name || this.props.name.trim().length < 2) {
      throw new DomainException('User name must be at least 2 characters');
    }
    if (!this.props.passwordHash) {
      throw new DomainException('Password hash is required');
    }
  }

  get id(): string {
    return this.props.id;
  }

  get email(): Email {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  get subscriptionTier(): SubscriptionTier {
    return this.props.subscriptionTier;
  }

  get emailVerified(): boolean {
    return this.props.emailVerified;
  }

  get isDeleted(): boolean {
    return !!this.props.deletedAt;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  verifyEmail(): void {
    this.props.emailVerified = true;
    this.props.emailVerificationToken = undefined;
    this.props.updatedAt = new Date();
  }

  updateLastLogin(ip: string): void {
    this.props.lastLoginAt = new Date();
    this.props.lastLoginIp = ip;
    this.props.updatedAt = new Date();
  }

  upgradeTier(tier: SubscriptionTier): void {
    const tierHierarchy = {
      [SubscriptionTier.FREE]: 0,
      [SubscriptionTier.BASIC]: 1,
      [SubscriptionTier.PRO]: 2,
      [SubscriptionTier.ENTERPRISE]: 3,
    };
    if (tierHierarchy[tier] <= tierHierarchy[this.props.subscriptionTier]) {
      throw new DomainException('Cannot downgrade or upgrade to same tier');
    }
    this.props.subscriptionTier = tier;
    this.props.updatedAt = new Date();
  }

  canConnectInstagramAccount(): boolean {
    return true;
  }

  setPasswordResetToken(token: string, expiresInMinutes: number = 60): void {
    this.props.passwordResetToken = token;
    this.props.passwordResetExpires = new Date(
      Date.now() + expiresInMinutes * 60000,
    );
    this.props.updatedAt = new Date();
  }

  isPasswordResetTokenValid(): boolean {
    if (!this.props.passwordResetToken || !this.props.passwordResetExpires) {
      return false;
    }
    return this.props.passwordResetExpires > new Date();
  }

  softDelete(): void {
    this.props.deletedAt = new Date();
    this.props.updatedAt = new Date();
  }

  updateProfile(name?: string, timezone?: string, language?: string): void {
    if (name !== undefined) {
      if (name.trim().length < 2) {
        throw new DomainException('User name must be at least 2 characters');
      }
      this.props.name = name;
    }
    if (timezone !== undefined) {
      this.props.timezone = timezone;
    }
    if (language !== undefined) {
      this.props.language = language;
    }
    this.props.updatedAt = new Date();
  }

  changePassword(newPasswordHash: string): void {
    if (!newPasswordHash) {
      throw new DomainException('Password hash is required');
    }
    this.props.passwordHash = newPasswordHash;
    this.props.updatedAt = new Date();
  }

  setEmailVerificationToken(token: string): void {
    this.props.emailVerificationToken = token;
    this.props.updatedAt = new Date();
  }

  get timezone(): string {
    return this.props.timezone;
  }

  get language(): string {
    return this.props.language;
  }

  toJSON() {
    return {
      id: this.props.id,
      email: this.props.email.value,
      name: this.props.name,
      timezone: this.props.timezone,
      language: this.props.language,
      subscriptionTier: this.props.subscriptionTier,
      emailVerified: this.props.emailVerified,
      lastLoginAt: this.props.lastLoginAt,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}

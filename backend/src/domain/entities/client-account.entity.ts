import { DomainException } from '../exceptions/domain.exception';

export enum Platform {
  INSTAGRAM = 'instagram',
  WHATSAPP = 'whatsapp',
}

export enum AccountStatus {
  ACTIVE = 'active',
  TOKEN_EXPIRED = 'token_expired',
  DISCONNECTED = 'disconnected',
  RATE_LIMITED = 'rate_limited',
  ERROR = 'error',
}

export enum InstagramAccountType {
  PERSONAL = 'personal',
  BUSINESS = 'business',
  CREATOR = 'creator',
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

export class ClientAccount {
  private props: ClientAccountProps;

  private constructor(props: ClientAccountProps) {
    this.props = props;
    this.validate();
  }

  static create(props: Omit<ClientAccountProps, 'id' | 'createdAt' | 'updatedAt'>): ClientAccount {
    return new ClientAccount({
      ...props,
      id: crypto.randomUUID(),
      metadata: props.metadata || {},
      permissions: props.permissions || [],
      accountType: props.accountType || InstagramAccountType.PERSONAL,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: ClientAccountProps): ClientAccount {
    return new ClientAccount(props);
  }

  private validate(): void {
    if (!this.props.platformAccountId) {
      throw new DomainException('Platform account ID is required');
    }
    if (!this.props.username) {
      throw new DomainException('Username is required');
    }
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get platform(): Platform {
    return this.props.platform;
  }

  get username(): string {
    return this.props.username;
  }

  get status(): AccountStatus {
    return this.props.status;
  }

  get platformAccountId(): string {
    return this.props.platformAccountId;
  }

  get displayName(): string | undefined {
    return this.props.displayName;
  }

  get profilePictureUrl(): string | undefined {
    return this.props.profilePictureUrl;
  }

  get followerCount(): number | undefined {
    return this.props.followerCount;
  }

  get followingCount(): number | undefined {
    return this.props.followingCount;
  }

  get mediaCount(): number | undefined {
    return this.props.mediaCount;
  }

  get biography(): string | undefined {
    return this.props.biography;
  }

  get website(): string | undefined {
    return this.props.website;
  }

  get accountType(): InstagramAccountType {
    return this.props.accountType;
  }

  get metadata(): AccountMetadata {
    return this.props.metadata;
  }

  get permissions(): string[] {
    return this.props.permissions;
  }

  get lastSyncAt(): Date | undefined {
    return this.props.lastSyncAt;
  }

  get tokenExpiresAt(): Date | undefined {
    return this.props.tokenExpiresAt;
  }

  get isActive(): boolean {
    return this.props.status === AccountStatus.ACTIVE;
  }

  get isTokenExpired(): boolean {
    if (!this.props.tokenExpiresAt) return false;
    return new Date() > this.props.tokenExpiresAt;
  }

  markAsTokenExpired(): void {
    this.props.status = AccountStatus.TOKEN_EXPIRED;
    this.props.updatedAt = new Date();
  }

  markAsRateLimited(): void {
    this.props.status = AccountStatus.RATE_LIMITED;
    this.props.updatedAt = new Date();
  }

  markAsError(error: { code: string; message: string }): void {
    this.props.status = AccountStatus.ERROR;
    this.props.metadata = {
      ...this.props.metadata,
      errorDetails: {
        code: error.code,
        message: error.message,
        timestamp: new Date(),
      },
    };
    this.props.updatedAt = new Date();
  }

  reactivate(): void {
    this.props.status = AccountStatus.ACTIVE;
    this.props.updatedAt = new Date();
  }

  disconnect(): void {
    this.props.status = AccountStatus.DISCONNECTED;
    this.props.updatedAt = new Date();
  }

  updateMetadata(data: {
    displayName?: string;
    profilePictureUrl?: string;
    followerCount?: number;
    followingCount?: number;
    mediaCount?: number;
    biography?: string;
    website?: string;
    metadata?: Partial<AccountMetadata>;
  }): void {
    if (data.displayName !== undefined) this.props.displayName = data.displayName;
    if (data.profilePictureUrl !== undefined) this.props.profilePictureUrl = data.profilePictureUrl;
    if (data.followerCount !== undefined) this.props.followerCount = data.followerCount;
    if (data.followingCount !== undefined) this.props.followingCount = data.followingCount;
    if (data.mediaCount !== undefined) this.props.mediaCount = data.mediaCount;
    if (data.biography !== undefined) this.props.biography = data.biography;
    if (data.website !== undefined) this.props.website = data.website;

    if (data.metadata) {
      this.props.metadata = {
        ...this.props.metadata,
        ...data.metadata,
        lastMetadataUpdate: new Date(),
      };
    }

    this.props.lastSyncAt = new Date();
    this.props.updatedAt = new Date();
  }

  updateTokenExpiration(expiresAt: Date): void {
    this.props.tokenExpiresAt = expiresAt;
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      platform: this.props.platform,
      platformAccountId: this.props.platformAccountId,
      username: this.props.username,
      displayName: this.props.displayName,
      profilePictureUrl: this.props.profilePictureUrl,
      followerCount: this.props.followerCount,
      followingCount: this.props.followingCount,
      mediaCount: this.props.mediaCount,
      biography: this.props.biography,
      website: this.props.website,
      status: this.props.status,
      accountType: this.props.accountType,
      metadata: this.props.metadata,
      permissions: this.props.permissions,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
      lastSyncAt: this.props.lastSyncAt,
      tokenExpiresAt: this.props.tokenExpiresAt,
    };
  }
}

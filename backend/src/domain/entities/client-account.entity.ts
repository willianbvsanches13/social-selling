import { DomainException } from '../exceptions/domain.exception';

export enum Platform {
  INSTAGRAM = 'instagram',
  WHATSAPP = 'whatsapp',
}

export enum AccountStatus {
  ACTIVE = 'active',
  TOKEN_EXPIRED = 'token_expired',
  DISCONNECTED = 'disconnected',
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

  get isActive(): boolean {
    return this.props.status === AccountStatus.ACTIVE;
  }

  markAsTokenExpired(): void {
    this.props.status = AccountStatus.TOKEN_EXPIRED;
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

  updateMetadata(followerCount: number, profilePictureUrl?: string): void {
    this.props.followerCount = followerCount;
    this.props.profilePictureUrl = profilePictureUrl;
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      platform: this.props.platform,
      platformAccountId: this.props.platformAccountId,
      username: this.props.username,
      profilePictureUrl: this.props.profilePictureUrl,
      followerCount: this.props.followerCount,
      status: this.props.status,
      metadata: this.props.metadata,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}

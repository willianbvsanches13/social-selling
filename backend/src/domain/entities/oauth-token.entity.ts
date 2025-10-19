import { DomainException } from '../exceptions/domain.exception';

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

export class OAuthToken {
  private props: OAuthTokenProps;

  private constructor(props: OAuthTokenProps) {
    this.props = props;
    this.validate();
  }

  static create(props: Omit<OAuthTokenProps, 'id' | 'createdAt' | 'updatedAt'>): OAuthToken {
    return new OAuthToken({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: OAuthTokenProps): OAuthToken {
    return new OAuthToken(props);
  }

  private validate(): void {
    if (!this.props.encryptedAccessToken) {
      throw new DomainException('Encrypted access token is required');
    }
  }

  get id(): string {
    return this.props.id;
  }

  get clientAccountId(): string {
    return this.props.clientAccountId;
  }

  get isExpired(): boolean {
    return this.props.expiresAt < new Date();
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get encryptedAccessToken(): string {
    return this.props.encryptedAccessToken;
  }

  get encryptedRefreshToken(): string | undefined {
    return this.props.encryptedRefreshToken;
  }

  isExpiringSoon(thresholdDays: number = 7): boolean {
    const now = new Date();
    const threshold = new Date(now.getTime() + thresholdDays * 24 * 60 * 60 * 1000);
    return this.props.expiresAt <= threshold;
  }

  updateToken(encryptedAccessToken: string, expiresAt: Date, encryptedRefreshToken?: string): void {
    this.props.encryptedAccessToken = encryptedAccessToken;
    this.props.expiresAt = expiresAt;
    if (encryptedRefreshToken) {
      this.props.encryptedRefreshToken = encryptedRefreshToken;
    }
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.props.id,
      clientAccountId: this.props.clientAccountId,
      tokenType: this.props.tokenType,
      expiresAt: this.props.expiresAt,
      scope: this.props.scope,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}

import { v4 as uuid } from 'uuid';

export interface InstagramWebhookSubscriptionProps {
  id: string;
  instagramAccountId: string;
  subscriptionFields: string[];
  callbackUrl: string;
  verifyToken: string;
  isActive: boolean;
  lastVerifiedAt?: Date;
  lastEventReceivedAt?: Date;
  eventsReceivedCount: number;
  subscriptionErrors: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class InstagramWebhookSubscription {
  private props: InstagramWebhookSubscriptionProps;

  private constructor(props: InstagramWebhookSubscriptionProps) {
    this.props = props;
  }

  static create(
    props: Omit<
      InstagramWebhookSubscriptionProps,
      | 'id'
      | 'createdAt'
      | 'updatedAt'
      | 'eventsReceivedCount'
      | 'subscriptionErrors'
    >,
  ): InstagramWebhookSubscription {
    return new InstagramWebhookSubscription({
      ...props,
      id: uuid(),
      eventsReceivedCount: 0,
      subscriptionErrors: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(
    props: InstagramWebhookSubscriptionProps,
  ): InstagramWebhookSubscription {
    return new InstagramWebhookSubscription(props);
  }

  get id(): string {
    return this.props.id;
  }

  get instagramAccountId(): string {
    return this.props.instagramAccountId;
  }

  get subscriptionFields(): string[] {
    return this.props.subscriptionFields;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get eventsReceivedCount(): number {
    return this.props.eventsReceivedCount;
  }

  recordEventReceived(): void {
    this.props.lastEventReceivedAt = new Date();
    this.props.eventsReceivedCount++;
    this.props.updatedAt = new Date();
  }

  recordError(error: string): void {
    this.props.subscriptionErrors++;
    this.props.lastError = error;
    this.props.updatedAt = new Date();
  }

  recordVerification(): void {
    this.props.lastVerifiedAt = new Date();
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  updateFields(fields: string[]): void {
    this.props.subscriptionFields = fields;
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.props.id,
      instagramAccountId: this.props.instagramAccountId,
      subscriptionFields: this.props.subscriptionFields,
      callbackUrl: this.props.callbackUrl,
      verifyToken: this.props.verifyToken,
      isActive: this.props.isActive,
      lastVerifiedAt: this.props.lastVerifiedAt,
      lastEventReceivedAt: this.props.lastEventReceivedAt,
      eventsReceivedCount: this.props.eventsReceivedCount,
      subscriptionErrors: this.props.subscriptionErrors,
      lastError: this.props.lastError,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}

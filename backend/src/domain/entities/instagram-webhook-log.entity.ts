import { v4 as uuid } from 'uuid';

export enum WebhookLogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

export interface InstagramWebhookLogProps {
  id: string;
  eventId?: string;
  logLevel: WebhookLogLevel;
  message: string;
  context: Record<string, unknown>;
  createdAt: Date;
}

export class InstagramWebhookLog {
  private props: InstagramWebhookLogProps;

  private constructor(props: InstagramWebhookLogProps) {
    this.props = props;
  }

  static create(
    props: Omit<InstagramWebhookLogProps, 'id' | 'createdAt'>,
  ): InstagramWebhookLog {
    return new InstagramWebhookLog({
      ...props,
      id: uuid(),
      context: props.context || {},
      createdAt: new Date(),
    });
  }

  static reconstitute(props: InstagramWebhookLogProps): InstagramWebhookLog {
    return new InstagramWebhookLog(props);
  }

  get id(): string {
    return this.props.id;
  }

  get eventId(): string | undefined {
    return this.props.eventId;
  }

  get logLevel(): WebhookLogLevel {
    return this.props.logLevel;
  }

  get message(): string {
    return this.props.message;
  }

  get context(): Record<string, unknown> {
    return this.props.context;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toJSON() {
    return {
      id: this.props.id,
      eventId: this.props.eventId,
      logLevel: this.props.logLevel,
      message: this.props.message,
      context: this.props.context,
      createdAt: this.props.createdAt,
    };
  }
}

export enum NotificationType {
  NEW_MESSAGE = 'new_message',
  POST_PUBLISHED = 'post_published',
  POST_FAILED = 'post_failed',
  TOKEN_EXPIRING = 'token_expiring',
}

export interface NotificationProps {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export class Notification {
  private props: NotificationProps;

  private constructor(props: NotificationProps) {
    this.props = props;
  }

  static create(
    props: Omit<NotificationProps, 'id' | 'isRead' | 'createdAt'>,
  ): Notification {
    return new Notification({
      ...props,
      id: crypto.randomUUID(),
      isRead: false,
      metadata: props.metadata || {},
      createdAt: new Date(),
    });
  }

  static reconstitute(props: NotificationProps): Notification {
    return new Notification(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get type(): NotificationType {
    return this.props.type;
  }

  get isRead(): boolean {
    return this.props.isRead;
  }

  markAsRead(): void {
    this.props.isRead = true;
  }

  toJSON() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      type: this.props.type,
      title: this.props.title,
      message: this.props.message,
      isRead: this.props.isRead,
      metadata: this.props.metadata,
      createdAt: this.props.createdAt,
    };
  }
}

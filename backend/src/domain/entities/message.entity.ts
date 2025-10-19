import { DomainException } from '../exceptions/domain.exception';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  STORY_MENTION = 'story_mention',
  STORY_REPLY = 'story_reply',
}

export enum SenderType {
  USER = 'user',
  CUSTOMER = 'customer',
}

export interface MessageProps {
  id: string;
  conversationId: string;
  platformMessageId: string;
  senderType: SenderType;
  senderPlatformId?: string;
  messageType: MessageType;
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  isRead: boolean;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export class Message {
  private props: MessageProps;

  private constructor(props: MessageProps) {
    this.props = props;
    this.validate();
  }

  static create(props: Omit<MessageProps, 'id' | 'createdAt' | 'isRead'>): Message {
    return new Message({
      ...props,
      id: crypto.randomUUID(),
      isRead: false,
      metadata: props.metadata || {},
      createdAt: new Date(),
    });
  }

  static reconstitute(props: MessageProps): Message {
    return new Message(props);
  }

  private validate(): void {
    if (this.props.messageType === MessageType.TEXT && !this.props.content) {
      throw new DomainException('Text messages must have content');
    }
    if (
      [MessageType.IMAGE, MessageType.VIDEO, MessageType.AUDIO].includes(this.props.messageType) &&
      !this.props.mediaUrl
    ) {
      throw new DomainException(`${this.props.messageType} messages must have media URL`);
    }
  }

  get id(): string {
    return this.props.id;
  }

  get conversationId(): string {
    return this.props.conversationId;
  }

  get senderType(): SenderType {
    return this.props.senderType;
  }

  get isFromCustomer(): boolean {
    return this.props.senderType === SenderType.CUSTOMER;
  }

  get isRead(): boolean {
    return this.props.isRead;
  }

  get sentAt(): Date {
    return this.props.sentAt;
  }

  get content(): string | undefined {
    return this.props.content;
  }

  markAsRead(): void {
    if (this.props.isRead) {
      return;
    }
    this.props.isRead = true;
    this.props.readAt = new Date();
  }

  markAsDelivered(): void {
    if (this.props.deliveredAt) {
      return;
    }
    this.props.deliveredAt = new Date();
  }

  isWithinResponseWindow(windowHours: number = 24): boolean {
    const now = new Date();
    const windowMs = windowHours * 60 * 60 * 1000;
    return now.getTime() - this.props.sentAt.getTime() <= windowMs;
  }

  containsProductMention(productName: string): boolean {
    if (!this.props.content) {
      return false;
    }
    const normalizedContent = this.props.content.toLowerCase();
    const normalizedProduct = productName.toLowerCase();
    return normalizedContent.includes(normalizedProduct);
  }

  toJSON() {
    return {
      id: this.props.id,
      conversationId: this.props.conversationId,
      platformMessageId: this.props.platformMessageId,
      senderType: this.props.senderType,
      senderPlatformId: this.props.senderPlatformId,
      messageType: this.props.messageType,
      content: this.props.content,
      mediaUrl: this.props.mediaUrl,
      mediaType: this.props.mediaType,
      isRead: this.props.isRead,
      sentAt: this.props.sentAt,
      deliveredAt: this.props.deliveredAt,
      readAt: this.props.readAt,
      metadata: this.props.metadata,
      createdAt: this.props.createdAt,
    };
  }
}

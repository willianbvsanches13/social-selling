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

export enum AttachmentType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
}

export interface Attachment {
  url: string;
  type: AttachmentType;
  metadata: Record<string, unknown>;
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
  repliedToMessageId?: string;
  attachments?: Attachment[];
}

export class Message {
  private props: MessageProps;

  private constructor(props: MessageProps) {
    this.props = props;
    this.validate();
  }

  static create(
    props: Omit<MessageProps, 'id' | 'createdAt' | 'isRead'>,
  ): Message {
    return new Message({
      ...props,
      id: crypto.randomUUID(),
      isRead: false,
      metadata: props.metadata || {},
      attachments: props.attachments || [],
      createdAt: new Date(),
    });
  }

  static reconstitute(props: MessageProps): Message {
    return new Message(props);
  }

  private validate(): void {
    // Text messages can have empty content for reactions, likes, or echo messages
    // Media messages must have a URL
    if (
      [MessageType.IMAGE, MessageType.VIDEO, MessageType.AUDIO].includes(
        this.props.messageType,
      ) &&
      !this.props.mediaUrl
    ) {
      throw new DomainException(
        `${this.props.messageType} messages must have media URL`,
      );
    }

    // Validate attachments if present
    if (this.props.attachments && this.props.attachments.length > 0) {
      for (const attachment of this.props.attachments) {
        this.validateAttachment(attachment);
      }
    }
  }

  private validateAttachment(attachment: Attachment): void {
    // Validate URL format
    if (!attachment.url || attachment.url.trim().length === 0) {
      throw new DomainException('Attachment URL cannot be empty');
    }

    // Basic URL format validation
    try {
      new URL(attachment.url);
    } catch {
      throw new DomainException('Attachment URL must be a valid URL');
    }

    // Validate attachment type
    const validTypes = Object.values(AttachmentType);
    if (!validTypes.includes(attachment.type)) {
      throw new DomainException(
        `Invalid attachment type. Must be one of: ${validTypes.join(', ')}`,
      );
    }

    // Validate metadata
    if (!attachment.metadata || typeof attachment.metadata !== 'object') {
      throw new DomainException('Attachment metadata must be an object');
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

  get repliedToMessageId(): string | undefined {
    return this.props.repliedToMessageId;
  }

  get attachments(): Attachment[] {
    return this.props.attachments || [];
  }

  get hasAttachments(): boolean {
    return (this.props.attachments?.length || 0) > 0;
  }

  get isReply(): boolean {
    return !!this.props.repliedToMessageId;
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
      repliedToMessageId: this.props.repliedToMessageId,
      attachments: this.props.attachments || [],
    };
  }
}

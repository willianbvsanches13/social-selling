import { v4 as uuid } from 'uuid';

export interface InstagramMessagingPostbackProps {
  id: string;
  messageId: string;
  conversationId?: string;
  accountId: string;
  senderIgId: string;
  recipientIgId: string;
  isSelf: boolean;
  postbackTitle?: string;
  postbackPayload?: string;
  timestamp: Date;
  rawData?: Record<string, unknown>;
  processed: boolean;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class InstagramMessagingPostback {
  private props: InstagramMessagingPostbackProps;

  private constructor(props: InstagramMessagingPostbackProps) {
    this.props = props;
  }

  static create(
    props: Omit<
      InstagramMessagingPostbackProps,
      'id' | 'processed' | 'createdAt' | 'updatedAt'
    >,
  ): InstagramMessagingPostback {
    return new InstagramMessagingPostback({
      ...props,
      id: uuid(),
      processed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(
    props: InstagramMessagingPostbackProps,
  ): InstagramMessagingPostback {
    return new InstagramMessagingPostback(props);
  }

  get id(): string {
    return this.props.id;
  }

  get messageId(): string {
    return this.props.messageId;
  }

  get conversationId(): string | undefined {
    return this.props.conversationId;
  }

  get accountId(): string {
    return this.props.accountId;
  }

  get senderIgId(): string {
    return this.props.senderIgId;
  }

  get recipientIgId(): string {
    return this.props.recipientIgId;
  }

  get isSelf(): boolean {
    return this.props.isSelf;
  }

  get postbackTitle(): string | undefined {
    return this.props.postbackTitle;
  }

  get postbackPayload(): string | undefined {
    return this.props.postbackPayload;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  get rawData(): Record<string, unknown> | undefined {
    return this.props.rawData;
  }

  get processed(): boolean {
    return this.props.processed;
  }

  get processedAt(): Date | undefined {
    return this.props.processedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Mark postback as processed (for auto-reply or other workflows)
   */
  markAsProcessed(): void {
    this.props.processed = true;
    this.props.processedAt = new Date();
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.props.id,
      messageId: this.props.messageId,
      conversationId: this.props.conversationId,
      accountId: this.props.accountId,
      senderIgId: this.props.senderIgId,
      recipientIgId: this.props.recipientIgId,
      isSelf: this.props.isSelf,
      postbackTitle: this.props.postbackTitle,
      postbackPayload: this.props.postbackPayload,
      timestamp: this.props.timestamp,
      rawData: this.props.rawData,
      processed: this.props.processed,
      processedAt: this.props.processedAt,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}

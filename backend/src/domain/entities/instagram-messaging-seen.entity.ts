import { v4 as uuid } from 'uuid';

export interface InstagramMessagingSeenProps {
  id: string;
  lastMessageId: string;
  conversationId?: string;
  accountId: string;
  readerIgId: string;
  recipientIgId: string;
  timestamp: Date;
  rawData?: Record<string, unknown>;
  createdAt: Date;
}

export class InstagramMessagingSeen {
  private props: InstagramMessagingSeenProps;

  private constructor(props: InstagramMessagingSeenProps) {
    this.props = props;
  }

  static create(
    props: Omit<InstagramMessagingSeenProps, 'id' | 'createdAt'>,
  ): InstagramMessagingSeen {
    return new InstagramMessagingSeen({
      ...props,
      id: uuid(),
      createdAt: new Date(),
    });
  }

  static reconstitute(
    props: InstagramMessagingSeenProps,
  ): InstagramMessagingSeen {
    return new InstagramMessagingSeen(props);
  }

  get id(): string {
    return this.props.id;
  }

  get lastMessageId(): string {
    return this.props.lastMessageId;
  }

  get conversationId(): string | undefined {
    return this.props.conversationId;
  }

  get accountId(): string {
    return this.props.accountId;
  }

  get readerIgId(): string {
    return this.props.readerIgId;
  }

  get recipientIgId(): string {
    return this.props.recipientIgId;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  get rawData(): Record<string, unknown> | undefined {
    return this.props.rawData;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toJSON() {
    return {
      id: this.props.id,
      lastMessageId: this.props.lastMessageId,
      conversationId: this.props.conversationId,
      accountId: this.props.accountId,
      readerIgId: this.props.readerIgId,
      recipientIgId: this.props.recipientIgId,
      timestamp: this.props.timestamp,
      rawData: this.props.rawData,
      createdAt: this.props.createdAt,
    };
  }
}

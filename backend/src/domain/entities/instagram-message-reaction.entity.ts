import { v4 as uuid } from 'uuid';

export interface InstagramMessageReactionProps {
  id: string;
  messageId: string;
  conversationId?: string;
  accountId: string;
  senderIgId: string;
  recipientIgId: string;
  action: 'react' | 'unreact';
  reactionType?: string;
  emoji?: string;
  timestamp: Date;
  rawData?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class InstagramMessageReaction {
  private props: InstagramMessageReactionProps;

  private constructor(props: InstagramMessageReactionProps) {
    this.props = props;
  }

  static create(
    props: Omit<InstagramMessageReactionProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): InstagramMessageReaction {
    return new InstagramMessageReaction({
      ...props,
      id: uuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(
    props: InstagramMessageReactionProps,
  ): InstagramMessageReaction {
    return new InstagramMessageReaction(props);
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

  get action(): 'react' | 'unreact' {
    return this.props.action;
  }

  get reactionType(): string | undefined {
    return this.props.reactionType;
  }

  get emoji(): string | undefined {
    return this.props.emoji;
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

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toJSON() {
    return {
      id: this.props.id,
      messageId: this.props.messageId,
      conversationId: this.props.conversationId,
      accountId: this.props.accountId,
      senderIgId: this.props.senderIgId,
      recipientIgId: this.props.recipientIgId,
      action: this.props.action,
      reactionType: this.props.reactionType,
      emoji: this.props.emoji,
      timestamp: this.props.timestamp,
      rawData: this.props.rawData,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}

import { DomainException } from '../exceptions/domain.exception';

export enum ConversationStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

export interface ConversationProps {
  id: string;
  clientAccountId: string;
  platformConversationId: string;
  participantPlatformId: string;
  participantUsername?: string;
  participantProfilePic?: string;
  lastMessageAt?: Date;
  unreadCount: number;
  status: ConversationStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class Conversation {
  private props: ConversationProps;

  private constructor(props: ConversationProps) {
    this.props = props;
  }

  static create(
    props: Omit<
      ConversationProps,
      'id' | 'unreadCount' | 'status' | 'createdAt' | 'updatedAt'
    >,
  ): Conversation {
    return new Conversation({
      ...props,
      id: crypto.randomUUID(),
      unreadCount: 0,
      status: ConversationStatus.OPEN,
      metadata: props.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: ConversationProps): Conversation {
    return new Conversation(props);
  }

  get id(): string {
    return this.props.id;
  }

  get clientAccountId(): string {
    return this.props.clientAccountId;
  }

  get participantPlatformId(): string {
    return this.props.participantPlatformId;
  }

  get unreadCount(): number {
    return this.props.unreadCount;
  }

  get status(): ConversationStatus {
    return this.props.status;
  }

  get isOpen(): boolean {
    return this.props.status === ConversationStatus.OPEN;
  }

  get lastMessageAt(): Date | undefined {
    return this.props.lastMessageAt;
  }

  incrementUnreadCount(): void {
    this.props.unreadCount++;
    this.props.updatedAt = new Date();
  }

  markAllAsRead(): void {
    this.props.unreadCount = 0;
    this.props.updatedAt = new Date();
  }

  updateLastMessage(timestamp: Date): void {
    this.props.lastMessageAt = timestamp;
    this.props.updatedAt = new Date();
  }

  close(): void {
    this.props.status = ConversationStatus.CLOSED;
    this.props.updatedAt = new Date();
  }

  reopen(): void {
    if (this.props.status === ConversationStatus.ARCHIVED) {
      throw new DomainException('Cannot reopen archived conversation');
    }
    this.props.status = ConversationStatus.OPEN;
    this.props.updatedAt = new Date();
  }

  archive(): void {
    this.props.status = ConversationStatus.ARCHIVED;
    this.props.updatedAt = new Date();
  }

  isStale(daysSinceLastMessage: number = 7): boolean {
    if (!this.props.lastMessageAt) {
      return false;
    }
    const now = new Date();
    const daysSince =
      (now.getTime() - this.props.lastMessageAt.getTime()) /
      (1000 * 60 * 60 * 24);
    return daysSince >= daysSinceLastMessage;
  }

  /**
   * Update participant profile information
   *
   * Sets the username and profile picture URL for the conversation participant.
   * This method is typically called after fetching profile data from Instagram API
   * to enrich conversation metadata with participant information.
   *
   * @param username - Instagram username (must not be empty)
   * @param profilePic - Profile picture URL (must not be empty)
   * @throws DomainException if username or profilePic is empty
   */
  updateParticipantProfile(username: string, profilePic: string): void {
    if (!username || username.trim().length === 0) {
      throw new DomainException('Username cannot be empty');
    }
    if (!profilePic || profilePic.trim().length === 0) {
      throw new DomainException('Profile picture cannot be empty');
    }
    this.props.participantUsername = username;
    this.props.participantProfilePic = profilePic;
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.props.id,
      clientAccountId: this.props.clientAccountId,
      platformConversationId: this.props.platformConversationId,
      participantPlatformId: this.props.participantPlatformId,
      participantUsername: this.props.participantUsername,
      participantProfilePic: this.props.participantProfilePic,
      lastMessageAt: this.props.lastMessageAt,
      unreadCount: this.props.unreadCount,
      status: this.props.status,
      metadata: this.props.metadata,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}

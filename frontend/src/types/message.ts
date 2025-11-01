export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  BLOCKED = 'blocked',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  STORY_MENTION = 'story_mention',
  STORY_REPLY = 'story_reply',
  REEL_SHARE = 'reel_share',
  POST_SHARE = 'post_share',
}

export enum SenderType {
  USER = 'user',
  CUSTOMER = 'customer',
}

export interface Conversation {
  id: string;
  clientAccountId: string;
  platformConversationId: string;
  participantPlatformId: string;
  participantUsername?: string;
  participantProfilePic?: string;
  lastMessageAt?: string;
  unreadCount: number;
  status: ConversationStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
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
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  createdAt: string;
}

export interface SendMessageRequest {
  text: string;
}

export interface ConversationFilters {
  clientAccountId: string;
  status?: ConversationStatus;
  hasUnread?: boolean;
  limit?: number;
  offset?: number;
}

export interface MessageFilters {
  limit?: number;
  offset?: number;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
  limit: number;
  offset: number;
}

export interface MessageListResponse {
  messages: Message[];
  total: number;
  limit: number;
  offset: number;
}

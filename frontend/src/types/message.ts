export interface Conversation {
  id: string;
  instagramAccountId: string;
  participantId: string;
  participantUsername: string;
  participantName: string;
  participantProfilePic: string;
  lastMessage: Message | null;
  unreadCount: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  text?: string;
  mediaType?: 'image' | 'video' | 'audio';
  mediaUrl?: string;
  timestamp: string;
  isRead: boolean;
  isSent: boolean;
  isDelivered: boolean;
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
  conversationId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
}

export interface ConversationFilters {
  search?: string;
  isArchived?: boolean;
  page?: number;
  perPage?: number;
}

export interface MessageFilters {
  page?: number;
  perPage?: number;
}

export interface ConversationsResponse {
  data: Conversation[];
  total: number;
}

export interface MessagesResponse {
  data: Message[];
  total: number;
}

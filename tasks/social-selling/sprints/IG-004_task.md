# IG-004: Instagram Direct Messages

**Epic:** Social Selling Platform - Instagram Integration
**Sprint:** Sprint 2
**Story Points:** 13
**Priority:** High
**Assignee:** Backend Team
**Status:** Ready for Development

---

## Overview

Implement comprehensive Instagram Direct Message functionality to enable automated and manual customer communication through Instagram DMs. This includes fetching conversations, sending messages with media, handling attachments, real-time webhook sync, message templates, and full conversation management.

---

## Business Value

- **Customer Engagement**: Enable direct communication with Instagram followers
- **Response Automation**: Quick replies and templates for faster customer service
- **Sales Funnel**: Move prospects from comments to private conversations
- **Relationship Building**: Track conversation history and context
- **Multi-Agent Support**: Allow multiple team members to handle DMs

---

## Technical Requirements

### 1. Database Schema

#### Conversations Table
```sql
-- Migration: 20250118000004_create_instagram_conversations.sql

CREATE TABLE instagram_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instagram_account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
    conversation_ig_id VARCHAR(255) NOT NULL UNIQUE,
    participant_ig_id VARCHAR(255) NOT NULL,
    participant_username VARCHAR(255),
    participant_name VARCHAR(255),
    participant_profile_pic_url TEXT,
    participant_is_verified BOOLEAN DEFAULT FALSE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    last_message_text TEXT,
    last_message_sender VARCHAR(50), -- 'user' or 'page'
    unread_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active', -- active, archived, spam
    tags JSONB DEFAULT '[]',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    priority VARCHAR(50) DEFAULT 'normal', -- low, normal, high, urgent
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(instagram_account_id, conversation_ig_id)
);

CREATE INDEX idx_instagram_conversations_account ON instagram_conversations(instagram_account_id);
CREATE INDEX idx_instagram_conversations_participant ON instagram_conversations(participant_ig_id);
CREATE INDEX idx_instagram_conversations_status ON instagram_conversations(status);
CREATE INDEX idx_instagram_conversations_assigned ON instagram_conversations(assigned_to);
CREATE INDEX idx_instagram_conversations_last_message ON instagram_conversations(last_message_at DESC);
CREATE INDEX idx_instagram_conversations_unread ON instagram_conversations(unread_count) WHERE unread_count > 0;
```

#### Messages Table
```sql
-- Migration: 20250118000005_create_instagram_messages.sql

CREATE TABLE instagram_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES instagram_conversations(id) ON DELETE CASCADE,
    message_ig_id VARCHAR(255) NOT NULL UNIQUE,
    sender_ig_id VARCHAR(255) NOT NULL,
    sender_type VARCHAR(50) NOT NULL, -- 'user' or 'page'
    message_type VARCHAR(50) NOT NULL, -- text, image, video, audio, sticker, share, story_reply
    text_content TEXT,
    attachments JSONB DEFAULT '[]',
    is_deleted BOOLEAN DEFAULT FALSE,
    is_unsupported BOOLEAN DEFAULT FALSE,
    reply_to_message_id UUID REFERENCES instagram_messages(id) ON DELETE SET NULL,
    story_id VARCHAR(255),
    story_url TEXT,
    share_url TEXT,
    sticker_id VARCHAR(255),
    reaction_emoji VARCHAR(10),
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    error_code VARCHAR(100),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_instagram_messages_conversation ON instagram_messages(conversation_id, sent_at DESC);
CREATE INDEX idx_instagram_messages_sender ON instagram_messages(sender_ig_id);
CREATE INDEX idx_instagram_messages_type ON instagram_messages(message_type);
CREATE INDEX idx_instagram_messages_sent_at ON instagram_messages(sent_at DESC);
CREATE INDEX idx_instagram_messages_reply ON instagram_messages(reply_to_message_id);
```

#### Message Templates Table
```sql
-- Migration: 20250118000006_create_instagram_message_templates.sql

CREATE TABLE instagram_message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    instagram_account_id UUID REFERENCES instagram_accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- greeting, product_info, pricing, closing, faq
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- Array of variable names used in template
    media_urls JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_message_templates_user ON instagram_message_templates(user_id);
CREATE INDEX idx_message_templates_account ON instagram_message_templates(instagram_account_id);
CREATE INDEX idx_message_templates_category ON instagram_message_templates(category);
CREATE INDEX idx_message_templates_active ON instagram_message_templates(is_active);
```

#### Quick Replies Table
```sql
-- Migration: 20250118000007_create_instagram_quick_replies.sql

CREATE TABLE instagram_quick_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instagram_account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
    trigger_keyword VARCHAR(255) NOT NULL,
    response_text TEXT NOT NULL,
    response_media_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    match_type VARCHAR(50) DEFAULT 'exact', -- exact, contains, starts_with, regex
    priority INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(instagram_account_id, trigger_keyword)
);

CREATE INDEX idx_quick_replies_account ON instagram_quick_replies(instagram_account_id);
CREATE INDEX idx_quick_replies_active ON instagram_quick_replies(is_active);
CREATE INDEX idx_quick_replies_priority ON instagram_quick_replies(priority DESC);
```

---

### 2. DTOs (Data Transfer Objects)

```typescript
// src/modules/instagram/dto/conversation.dto.ts

import { IsString, IsOptional, IsInt, IsEnum, IsArray, IsUUID, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  SPAM = 'spam',
}

export enum ConversationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class ListConversationsDto {
  @ApiPropertyOptional({ description: 'Status filter', enum: ConversationStatus })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @ApiPropertyOptional({ description: 'Filter by assigned user ID' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Only show unread conversations' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  unreadOnly?: boolean;

  @ApiPropertyOptional({ description: 'Filter by priority', enum: ConversationPriority })
  @IsOptional()
  @IsEnum(ConversationPriority)
  priority?: ConversationPriority;

  @ApiPropertyOptional({ description: 'Search participant name or username' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

export class UpdateConversationDto {
  @ApiPropertyOptional({ description: 'Conversation status', enum: ConversationStatus })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @ApiPropertyOptional({ description: 'Assign to user ID' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Conversation priority', enum: ConversationPriority })
  @IsOptional()
  @IsEnum(ConversationPriority)
  priority?: ConversationPriority;

  @ApiPropertyOptional({ description: 'Conversation tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Mark as read' })
  @IsOptional()
  @IsBoolean()
  markAsRead?: boolean;
}

export class ConversationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  conversationIgId: string;

  @ApiProperty()
  participantIgId: string;

  @ApiProperty()
  participantUsername: string;

  @ApiProperty()
  participantName: string;

  @ApiProperty()
  participantProfilePicUrl: string;

  @ApiProperty()
  participantIsVerified: boolean;

  @ApiProperty()
  lastMessageAt: Date;

  @ApiProperty()
  lastMessageText: string;

  @ApiProperty()
  lastMessageSender: string;

  @ApiProperty()
  unreadCount: number;

  @ApiProperty({ enum: ConversationStatus })
  status: ConversationStatus;

  @ApiProperty()
  tags: string[];

  @ApiProperty()
  assignedTo: string | null;

  @ApiProperty({ enum: ConversationPriority })
  priority: ConversationPriority;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
```

```typescript
// src/modules/instagram/dto/message.dto.ts

import { IsString, IsOptional, IsEnum, IsArray, IsUUID, IsUrl, ValidateNested, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  STICKER = 'sticker',
  SHARE = 'share',
  STORY_REPLY = 'story_reply',
}

export class MessageAttachmentDto {
  @ApiProperty({ description: 'Attachment type' })
  @IsEnum(MessageType)
  type: MessageType;

  @ApiProperty({ description: 'Attachment URL' })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL for videos' })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsOptional()
  @IsInt()
  size?: number;

  @ApiPropertyOptional({ description: 'Duration in seconds for audio/video' })
  @IsOptional()
  @IsInt()
  duration?: number;
}

export class SendMessageDto {
  @ApiProperty({ description: 'Instagram account ID' })
  @IsUUID()
  instagramAccountId: string;

  @ApiProperty({ description: 'Recipient Instagram user ID or conversation ID' })
  @IsString()
  recipient: string;

  @ApiPropertyOptional({ description: 'Message text content' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ description: 'Message attachments', type: [MessageAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentDto)
  attachments?: MessageAttachmentDto[];

  @ApiPropertyOptional({ description: 'Message ID to reply to' })
  @IsOptional()
  @IsUUID()
  replyToMessageId?: string;

  @ApiPropertyOptional({ description: 'Story ID if replying to story' })
  @IsOptional()
  @IsString()
  storyId?: string;

  @ApiPropertyOptional({ description: 'Use message template ID' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Template variables as key-value pairs' })
  @IsOptional()
  templateVariables?: Record<string, string>;
}

export class ListMessagesDto {
  @ApiPropertyOptional({ description: 'Filter by message type', enum: MessageType })
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;

  @ApiPropertyOptional({ description: 'Filter by sender type (user/page)' })
  @IsOptional()
  @IsString()
  senderType?: string;

  @ApiPropertyOptional({ description: 'Search message content' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Get messages before this date' })
  @IsOptional()
  @Type(() => Date)
  before?: Date;

  @ApiPropertyOptional({ description: 'Get messages after this date' })
  @IsOptional()
  @Type(() => Date)
  after?: Date;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;
}

export class MessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  messageIgId: string;

  @ApiProperty()
  senderIgId: string;

  @ApiProperty()
  senderType: string;

  @ApiProperty({ enum: MessageType })
  messageType: MessageType;

  @ApiProperty()
  textContent: string | null;

  @ApiProperty()
  attachments: MessageAttachmentDto[];

  @ApiProperty()
  isDeleted: boolean;

  @ApiProperty()
  sentAt: Date;

  @ApiProperty()
  deliveredAt: Date | null;

  @ApiProperty()
  readAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}
```

```typescript
// src/modules/instagram/dto/message-template.dto.ts

import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TemplateCategory {
  GREETING = 'greeting',
  PRODUCT_INFO = 'product_info',
  PRICING = 'pricing',
  CLOSING = 'closing',
  FAQ = 'faq',
}

export class CreateMessageTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Template category', enum: TemplateCategory })
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @ApiProperty({ description: 'Template content with variables like {{name}}' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Media URLs to attach', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  mediaUrls?: string[];

  @ApiPropertyOptional({ description: 'Instagram account ID (optional, for account-specific templates)' })
  @IsOptional()
  @IsString()
  instagramAccountId?: string;
}

export class UpdateMessageTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Template category', enum: TemplateCategory })
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @ApiPropertyOptional({ description: 'Template content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Media URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  mediaUrls?: string[];

  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class MessageTemplateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  variables: string[];

  @ApiProperty()
  mediaUrls: string[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  usageCount: number;

  @ApiProperty()
  createdAt: Date;
}
```

```typescript
// src/modules/instagram/dto/quick-reply.dto.ts

import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum QuickReplyMatchType {
  EXACT = 'exact',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  REGEX = 'regex',
}

export class CreateQuickReplyDto {
  @ApiProperty({ description: 'Instagram account ID' })
  @IsString()
  instagramAccountId: string;

  @ApiProperty({ description: 'Trigger keyword' })
  @IsString()
  triggerKeyword: string;

  @ApiProperty({ description: 'Response text' })
  @IsString()
  responseText: string;

  @ApiPropertyOptional({ description: 'Response media URL' })
  @IsOptional()
  @IsUrl()
  responseMediaUrl?: string;

  @ApiPropertyOptional({ description: 'Match type', enum: QuickReplyMatchType, default: QuickReplyMatchType.EXACT })
  @IsOptional()
  @IsEnum(QuickReplyMatchType)
  matchType?: QuickReplyMatchType;

  @ApiPropertyOptional({ description: 'Priority (higher = checked first)', default: 0 })
  @IsOptional()
  @IsInt()
  priority?: number;
}

export class UpdateQuickReplyDto {
  @ApiPropertyOptional({ description: 'Trigger keyword' })
  @IsOptional()
  @IsString()
  triggerKeyword?: string;

  @ApiPropertyOptional({ description: 'Response text' })
  @IsOptional()
  @IsString()
  responseText?: string;

  @ApiPropertyOptional({ description: 'Response media URL' })
  @IsOptional()
  @IsUrl()
  responseMediaUrl?: string;

  @ApiPropertyOptional({ description: 'Match type', enum: QuickReplyMatchType })
  @IsOptional()
  @IsEnum(QuickReplyMatchType)
  matchType?: QuickReplyMatchType;

  @ApiPropertyOptional({ description: 'Priority' })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
```

---

### 3. Service Implementation

```typescript
// src/modules/instagram/services/instagram-messages.service.ts

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, In } from 'typeorm';
import { InstagramConversation } from '../entities/instagram-conversation.entity';
import { InstagramMessage } from '../entities/instagram-message.entity';
import { InstagramMessageTemplate } from '../entities/instagram-message-template.entity';
import { InstagramQuickReply } from '../entities/instagram-quick-reply.entity';
import { InstagramGraphApiService } from './instagram-graph-api.service';
import { SendMessageDto, ListMessagesDto, MessageResponseDto } from '../dto/message.dto';
import { ListConversationsDto, UpdateConversationDto, ConversationResponseDto } from '../dto/conversation.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class InstagramMessagesService {
  private readonly logger = new Logger(InstagramMessagesService.name);

  constructor(
    @InjectRepository(InstagramConversation)
    private conversationRepository: Repository<InstagramConversation>,
    @InjectRepository(InstagramMessage)
    private messageRepository: Repository<InstagramMessage>,
    @InjectRepository(InstagramMessageTemplate)
    private templateRepository: Repository<InstagramMessageTemplate>,
    @InjectRepository(InstagramQuickReply)
    private quickReplyRepository: Repository<InstagramQuickReply>,
    private graphApiService: InstagramGraphApiService,
    @InjectQueue('instagram-messages') private messageQueue: Queue,
  ) {}

  /**
   * List conversations with filtering and pagination
   */
  async listConversations(
    userId: string,
    dto: ListConversationsDto,
  ): Promise<{ conversations: ConversationResponseDto[]; total: number; page: number; limit: number }> {
    const { status, assignedTo, unreadOnly, priority, search, tags, page = 1, limit = 20 } = dto;

    const where: FindOptionsWhere<InstagramConversation> = {};

    if (status) {
      where.status = status;
    }

    if (assignedTo) {
      where.assigned_to = assignedTo;
    }

    if (priority) {
      where.priority = priority;
    }

    const queryBuilder = this.conversationRepository.createQueryBuilder('conversation');
    queryBuilder.leftJoinAndSelect('conversation.instagramAccount', 'account');

    // Filter by user's accounts
    queryBuilder.andWhere('account.userId = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('conversation.status = :status', { status });
    }

    if (assignedTo) {
      queryBuilder.andWhere('conversation.assigned_to = :assignedTo', { assignedTo });
    }

    if (unreadOnly) {
      queryBuilder.andWhere('conversation.unread_count > 0');
    }

    if (priority) {
      queryBuilder.andWhere('conversation.priority = :priority', { priority });
    }

    if (search) {
      queryBuilder.andWhere(
        '(conversation.participant_username ILIKE :search OR conversation.participant_name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('conversation.tags @> :tags', { tags: JSON.stringify(tags) });
    }

    queryBuilder.orderBy('conversation.last_message_at', 'DESC');
    queryBuilder.skip((page - 1) * limit);
    queryBuilder.take(limit);

    const [conversations, total] = await queryBuilder.getManyAndCount();

    return {
      conversations: conversations.map(c => this.mapConversationToDto(c)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string, userId: string): Promise<ConversationResponseDto> {
    const conversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.instagramAccount', 'account')
      .where('conversation.id = :conversationId', { conversationId })
      .andWhere('account.userId = :userId', { userId })
      .getOne();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.mapConversationToDto(conversation);
  }

  /**
   * Update conversation
   */
  async updateConversation(
    conversationId: string,
    userId: string,
    dto: UpdateConversationDto,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.instagramAccount', 'account')
      .where('conversation.id = :conversationId', { conversationId })
      .andWhere('account.userId = :userId', { userId })
      .getOne();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (dto.status) {
      conversation.status = dto.status;
      if (dto.status === 'archived') {
        conversation.archived_at = new Date();
      }
    }

    if (dto.assignedTo !== undefined) {
      conversation.assigned_to = dto.assignedTo;
    }

    if (dto.priority) {
      conversation.priority = dto.priority;
    }

    if (dto.tags) {
      conversation.tags = dto.tags;
    }

    if (dto.markAsRead) {
      conversation.unread_count = 0;
    }

    conversation.updated_at = new Date();

    await this.conversationRepository.save(conversation);

    return this.mapConversationToDto(conversation);
  }

  /**
   * List messages in a conversation
   */
  async listMessages(
    conversationId: string,
    userId: string,
    dto: ListMessagesDto,
  ): Promise<{ messages: MessageResponseDto[]; total: number; page: number; limit: number }> {
    // Verify user has access to this conversation
    const conversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.instagramAccount', 'account')
      .where('conversation.id = :conversationId', { conversationId })
      .andWhere('account.userId = :userId', { userId })
      .getOne();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const { messageType, senderType, search, before, after, page = 1, limit = 50 } = dto;

    const queryBuilder = this.messageRepository.createQueryBuilder('message');
    queryBuilder.where('message.conversation_id = :conversationId', { conversationId });

    if (messageType) {
      queryBuilder.andWhere('message.message_type = :messageType', { messageType });
    }

    if (senderType) {
      queryBuilder.andWhere('message.sender_type = :senderType', { senderType });
    }

    if (search) {
      queryBuilder.andWhere('message.text_content ILIKE :search', { search: `%${search}%` });
    }

    if (before) {
      queryBuilder.andWhere('message.sent_at < :before', { before });
    }

    if (after) {
      queryBuilder.andWhere('message.sent_at > :after', { after });
    }

    queryBuilder.orderBy('message.sent_at', 'DESC');
    queryBuilder.skip((page - 1) * limit);
    queryBuilder.take(limit);

    const [messages, total] = await queryBuilder.getManyAndCount();

    return {
      messages: messages.map(m => this.mapMessageToDto(m)),
      total,
      page,
      limit,
    };
  }

  /**
   * Send a message
   */
  async sendMessage(userId: string, dto: SendMessageDto): Promise<MessageResponseDto> {
    this.logger.log(`Sending message from user ${userId} to ${dto.recipient}`);

    // Get Instagram account with access token
    const account = await this.graphApiService.getAccountWithToken(dto.instagramAccountId, userId);

    // Process template if templateId is provided
    let messageText = dto.text;
    let attachments = dto.attachments || [];

    if (dto.templateId) {
      const template = await this.templateRepository.findOne({
        where: { id: dto.templateId, user_id: userId },
      });

      if (!template) {
        throw new NotFoundException('Message template not found');
      }

      // Replace variables in template
      messageText = this.processTemplate(template.content, dto.templateVariables || {});

      // Add template media
      if (template.media_urls && template.media_urls.length > 0) {
        attachments = [
          ...attachments,
          ...template.media_urls.map(url => ({
            type: this.getMediaTypeFromUrl(url),
            url,
          })),
        ];
      }

      // Update template usage
      template.usage_count += 1;
      template.last_used_at = new Date();
      await this.templateRepository.save(template);
    }

    if (!messageText && attachments.length === 0) {
      throw new BadRequestException('Message must contain text or attachments');
    }

    // Find or create conversation
    let conversation = await this.conversationRepository.findOne({
      where: {
        instagram_account_id: dto.instagramAccountId,
        participant_ig_id: dto.recipient,
      },
    });

    if (!conversation) {
      // Fetch participant info from Instagram
      const participantInfo = await this.graphApiService.getUserInfo(account.access_token, dto.recipient);

      conversation = this.conversationRepository.create({
        instagram_account_id: dto.instagramAccountId,
        conversation_ig_id: `temp_${Date.now()}`, // Will be updated when webhook receives it
        participant_ig_id: dto.recipient,
        participant_username: participantInfo.username,
        participant_name: participantInfo.name,
        participant_profile_pic_url: participantInfo.profile_picture_url,
        participant_is_verified: participantInfo.is_verified || false,
        status: 'active',
        priority: 'normal',
      });

      await this.conversationRepository.save(conversation);
    }

    // Send via Instagram Graph API
    const igResponse = await this.graphApiService.sendMessage(account.access_token, {
      recipient: dto.recipient,
      message: messageText,
      attachments,
      replyToMessageId: dto.replyToMessageId,
      storyId: dto.storyId,
    });

    // Save message to database
    const message = this.messageRepository.create({
      conversation_id: conversation.id,
      message_ig_id: igResponse.messageId,
      sender_ig_id: account.instagram_business_account_id,
      sender_type: 'page',
      message_type: attachments.length > 0 ? attachments[0].type : 'text',
      text_content: messageText,
      attachments: attachments,
      reply_to_message_id: dto.replyToMessageId,
      story_id: dto.storyId,
      sent_at: new Date(),
    });

    await this.messageRepository.save(message);

    // Update conversation
    conversation.last_message_at = new Date();
    conversation.last_message_text = messageText || '[Attachment]';
    conversation.last_message_sender = 'page';
    conversation.updated_at = new Date();
    await this.conversationRepository.save(conversation);

    this.logger.log(`Message sent successfully: ${message.id}`);

    return this.mapMessageToDto(message);
  }

  /**
   * Process incoming message from webhook
   */
  async processIncomingMessage(webhookData: any): Promise<void> {
    this.logger.log('Processing incoming message from webhook');

    const { object, entry } = webhookData;

    if (object !== 'instagram') {
      this.logger.warn(`Unexpected webhook object type: ${object}`);
      return;
    }

    for (const item of entry) {
      const changes = item.changes || item.messaging || [];

      for (const change of changes) {
        if (change.field === 'messages' || change.message) {
          await this.handleMessageEvent(change);
        }
      }
    }
  }

  /**
   * Handle message event from webhook
   */
  private async handleMessageEvent(event: any): Promise<void> {
    const messageData = event.value?.messages?.[0] || event.message;
    const senderId = event.value?.sender?.id || event.sender?.id;
    const recipientId = event.value?.recipient?.id || event.recipient?.id;

    if (!messageData || !senderId) {
      this.logger.warn('Invalid message event data');
      return;
    }

    // Find Instagram account
    const account = await this.graphApiService.findAccountByIgId(recipientId);
    if (!account) {
      this.logger.warn(`Instagram account not found for ID: ${recipientId}`);
      return;
    }

    // Check if message already exists
    const existingMessage = await this.messageRepository.findOne({
      where: { message_ig_id: messageData.id },
    });

    if (existingMessage) {
      this.logger.debug(`Message ${messageData.id} already processed`);
      return;
    }

    // Find or create conversation
    let conversation = await this.conversationRepository.findOne({
      where: {
        instagram_account_id: account.id,
        participant_ig_id: senderId,
      },
    });

    if (!conversation) {
      // Fetch sender info
      const senderInfo = await this.graphApiService.getUserInfo(account.access_token, senderId);

      conversation = this.conversationRepository.create({
        instagram_account_id: account.id,
        conversation_ig_id: event.value?.conversation_id || `conv_${Date.now()}`,
        participant_ig_id: senderId,
        participant_username: senderInfo.username,
        participant_name: senderInfo.name,
        participant_profile_pic_url: senderInfo.profile_picture_url,
        participant_is_verified: senderInfo.is_verified || false,
        status: 'active',
        priority: 'normal',
      });

      await this.conversationRepository.save(conversation);
    }

    // Parse message content
    const { messageType, textContent, attachments } = this.parseMessageContent(messageData);

    // Save message
    const message = this.messageRepository.create({
      conversation_id: conversation.id,
      message_ig_id: messageData.id,
      sender_ig_id: senderId,
      sender_type: 'user',
      message_type: messageType,
      text_content: textContent,
      attachments: attachments,
      sent_at: new Date(messageData.timestamp || Date.now()),
    });

    await this.messageRepository.save(message);

    // Update conversation
    conversation.last_message_at = message.sent_at;
    conversation.last_message_text = textContent || '[Attachment]';
    conversation.last_message_sender = 'user';
    conversation.unread_count += 1;
    conversation.updated_at = new Date();
    await this.conversationRepository.save(conversation);

    // Check for quick reply triggers
    if (textContent) {
      await this.checkQuickReply(account.id, conversation.id, textContent);
    }

    this.logger.log(`Incoming message processed: ${message.id}`);
  }

  /**
   * Parse message content from Instagram webhook
   */
  private parseMessageContent(messageData: any): {
    messageType: string;
    textContent: string | null;
    attachments: any[];
  } {
    let messageType = 'text';
    let textContent = messageData.text || null;
    const attachments = [];

    // Image
    if (messageData.attachments) {
      for (const attachment of messageData.attachments) {
        if (attachment.type === 'image') {
          messageType = 'image';
          attachments.push({
            type: 'image',
            url: attachment.payload.url,
          });
        } else if (attachment.type === 'video') {
          messageType = 'video';
          attachments.push({
            type: 'video',
            url: attachment.payload.url,
          });
        } else if (attachment.type === 'audio') {
          messageType = 'audio';
          attachments.push({
            type: 'audio',
            url: attachment.payload.url,
          });
        }
      }
    }

    // Story reply
    if (messageData.reply_to) {
      messageType = 'story_reply';
    }

    // Share
    if (messageData.is_echo && messageData.app_id) {
      messageType = 'share';
    }

    return { messageType, textContent, attachments };
  }

  /**
   * Check and trigger quick reply
   */
  private async checkQuickReply(accountId: string, conversationId: string, messageText: string): Promise<void> {
    const quickReplies = await this.quickReplyRepository.find({
      where: { instagram_account_id: accountId, is_active: true },
      order: { priority: 'DESC' },
    });

    for (const quickReply of quickReplies) {
      let isMatch = false;

      switch (quickReply.match_type) {
        case 'exact':
          isMatch = messageText.toLowerCase().trim() === quickReply.trigger_keyword.toLowerCase().trim();
          break;
        case 'contains':
          isMatch = messageText.toLowerCase().includes(quickReply.trigger_keyword.toLowerCase());
          break;
        case 'starts_with':
          isMatch = messageText.toLowerCase().startsWith(quickReply.trigger_keyword.toLowerCase());
          break;
        case 'regex':
          try {
            const regex = new RegExp(quickReply.trigger_keyword, 'i');
            isMatch = regex.test(messageText);
          } catch (error) {
            this.logger.error(`Invalid regex in quick reply: ${quickReply.trigger_keyword}`);
          }
          break;
      }

      if (isMatch) {
        this.logger.log(`Quick reply triggered: ${quickReply.trigger_keyword}`);

        // Queue the response
        await this.messageQueue.add(
          'send-quick-reply',
          {
            conversationId,
            accountId,
            responseText: quickReply.response_text,
            responseMediaUrl: quickReply.response_media_url,
            quickReplyId: quickReply.id,
          },
          { delay: 1000 }, // Small delay to seem natural
        );

        // Update usage count
        quickReply.usage_count += 1;
        await this.quickReplyRepository.save(quickReply);

        break; // Only trigger first match
      }
    }
  }

  /**
   * Sync conversations from Instagram
   */
  async syncConversations(instagramAccountId: string, userId: string): Promise<number> {
    this.logger.log(`Syncing conversations for account ${instagramAccountId}`);

    const account = await this.graphApiService.getAccountWithToken(instagramAccountId, userId);

    const conversations = await this.graphApiService.getConversations(account.access_token);

    let syncedCount = 0;

    for (const igConv of conversations) {
      let conversation = await this.conversationRepository.findOne({
        where: { conversation_ig_id: igConv.id },
      });

      if (!conversation) {
        conversation = this.conversationRepository.create({
          instagram_account_id: instagramAccountId,
          conversation_ig_id: igConv.id,
          participant_ig_id: igConv.participants[0].id,
          participant_username: igConv.participants[0].username,
          participant_name: igConv.participants[0].name,
          participant_profile_pic_url: igConv.participants[0].profile_picture_url,
          status: 'active',
          priority: 'normal',
        });
      }

      // Update last message info
      if (igConv.last_message) {
        conversation.last_message_at = new Date(igConv.last_message.created_time);
        conversation.last_message_text = igConv.last_message.message || '[Attachment]';
      }

      conversation.updated_at = new Date();
      await this.conversationRepository.save(conversation);

      syncedCount++;
    }

    this.logger.log(`Synced ${syncedCount} conversations`);
    return syncedCount;
  }

  /**
   * Process template variables
   */
  private processTemplate(content: string, variables: Record<string, string>): string {
    let processed = content;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processed = processed.replace(regex, value);
    }

    // Remove any unmatched variables
    processed = processed.replace(/{{\s*\w+\s*}}/g, '');

    return processed;
  }

  /**
   * Get media type from URL
   */
  private getMediaTypeFromUrl(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return 'image';
    }
    if (['mp4', 'mov', 'avi'].includes(extension)) {
      return 'video';
    }
    if (['mp3', 'wav', 'aac'].includes(extension)) {
      return 'audio';
    }

    return 'image'; // default
  }

  /**
   * Map conversation entity to DTO
   */
  private mapConversationToDto(conversation: InstagramConversation): ConversationResponseDto {
    return {
      id: conversation.id,
      conversationIgId: conversation.conversation_ig_id,
      participantIgId: conversation.participant_ig_id,
      participantUsername: conversation.participant_username,
      participantName: conversation.participant_name,
      participantProfilePicUrl: conversation.participant_profile_pic_url,
      participantIsVerified: conversation.participant_is_verified,
      lastMessageAt: conversation.last_message_at,
      lastMessageText: conversation.last_message_text,
      lastMessageSender: conversation.last_message_sender,
      unreadCount: conversation.unread_count,
      status: conversation.status as any,
      tags: conversation.tags || [],
      assignedTo: conversation.assigned_to,
      priority: conversation.priority as any,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
    };
  }

  /**
   * Map message entity to DTO
   */
  private mapMessageToDto(message: InstagramMessage): MessageResponseDto {
    return {
      id: message.id,
      conversationId: message.conversation_id,
      messageIgId: message.message_ig_id,
      senderIgId: message.sender_ig_id,
      senderType: message.sender_type,
      messageType: message.message_type as any,
      textContent: message.text_content,
      attachments: message.attachments || [],
      isDeleted: message.is_deleted,
      sentAt: message.sent_at,
      deliveredAt: message.delivered_at,
      readAt: message.read_at,
      createdAt: message.created_at,
    };
  }
}
```

```typescript
// src/modules/instagram/services/instagram-message-templates.service.ts

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstagramMessageTemplate } from '../entities/instagram-message-template.entity';
import { CreateMessageTemplateDto, UpdateMessageTemplateDto, MessageTemplateResponseDto } from '../dto/message-template.dto';

@Injectable()
export class InstagramMessageTemplatesService {
  private readonly logger = new Logger(InstagramMessageTemplatesService.name);

  constructor(
    @InjectRepository(InstagramMessageTemplate)
    private templateRepository: Repository<InstagramMessageTemplate>,
  ) {}

  /**
   * Create message template
   */
  async createTemplate(userId: string, dto: CreateMessageTemplateDto): Promise<MessageTemplateResponseDto> {
    // Extract variables from content
    const variables = this.extractVariables(dto.content);

    const template = this.templateRepository.create({
      user_id: userId,
      instagram_account_id: dto.instagramAccountId,
      name: dto.name,
      category: dto.category,
      content: dto.content,
      variables,
      media_urls: dto.mediaUrls || [],
      is_active: true,
    });

    await this.templateRepository.save(template);

    this.logger.log(`Template created: ${template.id}`);

    return this.mapToDto(template);
  }

  /**
   * List templates
   */
  async listTemplates(userId: string, category?: string): Promise<MessageTemplateResponseDto[]> {
    const where: any = { user_id: userId };

    if (category) {
      where.category = category;
    }

    const templates = await this.templateRepository.find({
      where,
      order: { created_at: 'DESC' },
    });

    return templates.map(t => this.mapToDto(t));
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string, userId: string): Promise<MessageTemplateResponseDto> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, user_id: userId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return this.mapToDto(template);
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    userId: string,
    dto: UpdateMessageTemplateDto,
  ): Promise<MessageTemplateResponseDto> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, user_id: userId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (dto.name) template.name = dto.name;
    if (dto.category) template.category = dto.category;
    if (dto.content) {
      template.content = dto.content;
      template.variables = this.extractVariables(dto.content);
    }
    if (dto.mediaUrls) template.media_urls = dto.mediaUrls;
    if (dto.isActive !== undefined) template.is_active = dto.isActive;

    template.updated_at = new Date();

    await this.templateRepository.save(template);

    return this.mapToDto(template);
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    const result = await this.templateRepository.delete({
      id: templateId,
      user_id: userId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Template not found');
    }

    this.logger.log(`Template deleted: ${templateId}`);
  }

  /**
   * Extract variables from template content
   */
  private extractVariables(content: string): string[] {
    const regex = /{{\s*(\w+)\s*}}/g;
    const variables = new Set<string>();
    let match;

    while ((match = regex.exec(content)) !== null) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  }

  /**
   * Map entity to DTO
   */
  private mapToDto(template: InstagramMessageTemplate): MessageTemplateResponseDto {
    return {
      id: template.id,
      name: template.name,
      category: template.category,
      content: template.content,
      variables: template.variables || [],
      mediaUrls: template.media_urls || [],
      isActive: template.is_active,
      usageCount: template.usage_count,
      createdAt: template.created_at,
    };
  }
}
```

---

### 4. Controller Implementation

```typescript
// src/modules/instagram/controllers/instagram-messages.controller.ts

import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InstagramMessagesService } from '../services/instagram-messages.service';
import { InstagramMessageTemplatesService } from '../services/instagram-message-templates.service';
import { InstagramQuickRepliesService } from '../services/instagram-quick-replies.service';
import {
  SendMessageDto,
  ListMessagesDto,
  MessageResponseDto,
} from '../dto/message.dto';
import {
  ListConversationsDto,
  UpdateConversationDto,
  ConversationResponseDto,
} from '../dto/conversation.dto';
import {
  CreateMessageTemplateDto,
  UpdateMessageTemplateDto,
  MessageTemplateResponseDto,
} from '../dto/message-template.dto';
import {
  CreateQuickReplyDto,
  UpdateQuickReplyDto,
} from '../dto/quick-reply.dto';

@ApiTags('Instagram Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('instagram/messages')
export class InstagramMessagesController {
  constructor(
    private messagesService: InstagramMessagesService,
    private templatesService: InstagramMessageTemplatesService,
    private quickRepliesService: InstagramQuickRepliesService,
  ) {}

  // ========== Conversations ==========

  @Get('conversations')
  @ApiOperation({ summary: 'List Instagram conversations' })
  @ApiResponse({ status: 200, description: 'Conversations retrieved successfully' })
  async listConversations(@Request() req, @Query() dto: ListConversationsDto) {
    return this.messagesService.listConversations(req.user.id, dto);
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get conversation by ID' })
  @ApiResponse({ status: 200, description: 'Conversation retrieved successfully', type: ConversationResponseDto })
  async getConversation(@Request() req, @Param('conversationId') conversationId: string) {
    return this.messagesService.getConversation(conversationId, req.user.id);
  }

  @Put('conversations/:conversationId')
  @ApiOperation({ summary: 'Update conversation' })
  @ApiResponse({ status: 200, description: 'Conversation updated successfully', type: ConversationResponseDto })
  async updateConversation(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.messagesService.updateConversation(conversationId, req.user.id, dto);
  }

  @Post('conversations/sync/:accountId')
  @ApiOperation({ summary: 'Sync conversations from Instagram' })
  @ApiResponse({ status: 200, description: 'Conversations synced successfully' })
  async syncConversations(@Request() req, @Param('accountId') accountId: string) {
    const count = await this.messagesService.syncConversations(accountId, req.user.id);
    return { synced: count };
  }

  // ========== Messages ==========

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'List messages in conversation' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async listMessages(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Query() dto: ListMessagesDto,
  ) {
    return this.messagesService.listMessages(conversationId, req.user.id, dto);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send Instagram DM' })
  @ApiResponse({ status: 201, description: 'Message sent successfully', type: MessageResponseDto })
  async sendMessage(@Request() req, @Body() dto: SendMessageDto) {
    return this.messagesService.sendMessage(req.user.id, dto);
  }

  // ========== Templates ==========

  @Post('templates')
  @ApiOperation({ summary: 'Create message template' })
  @ApiResponse({ status: 201, description: 'Template created successfully', type: MessageTemplateResponseDto })
  async createTemplate(@Request() req, @Body() dto: CreateMessageTemplateDto) {
    return this.templatesService.createTemplate(req.user.id, dto);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List message templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully', type: [MessageTemplateResponseDto] })
  async listTemplates(@Request() req, @Query('category') category?: string) {
    return this.templatesService.listTemplates(req.user.id, category);
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully', type: MessageTemplateResponseDto })
  async getTemplate(@Request() req, @Param('templateId') templateId: string) {
    return this.templatesService.getTemplate(templateId, req.user.id);
  }

  @Put('templates/:templateId')
  @ApiOperation({ summary: 'Update template' })
  @ApiResponse({ status: 200, description: 'Template updated successfully', type: MessageTemplateResponseDto })
  async updateTemplate(
    @Request() req,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateMessageTemplateDto,
  ) {
    return this.templatesService.updateTemplate(templateId, req.user.id, dto);
  }

  @Delete('templates/:templateId')
  @ApiOperation({ summary: 'Delete template' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  async deleteTemplate(@Request() req, @Param('templateId') templateId: string) {
    await this.templatesService.deleteTemplate(templateId, req.user.id);
    return { message: 'Template deleted successfully' };
  }

  // ========== Quick Replies ==========

  @Post('quick-replies')
  @ApiOperation({ summary: 'Create quick reply' })
  @ApiResponse({ status: 201, description: 'Quick reply created successfully' })
  async createQuickReply(@Request() req, @Body() dto: CreateQuickReplyDto) {
    return this.quickRepliesService.createQuickReply(req.user.id, dto);
  }

  @Get('quick-replies/:accountId')
  @ApiOperation({ summary: 'List quick replies for account' })
  @ApiResponse({ status: 200, description: 'Quick replies retrieved successfully' })
  async listQuickReplies(@Request() req, @Param('accountId') accountId: string) {
    return this.quickRepliesService.listQuickReplies(accountId, req.user.id);
  }

  @Put('quick-replies/:replyId')
  @ApiOperation({ summary: 'Update quick reply' })
  @ApiResponse({ status: 200, description: 'Quick reply updated successfully' })
  async updateQuickReply(
    @Request() req,
    @Param('replyId') replyId: string,
    @Body() dto: UpdateQuickReplyDto,
  ) {
    return this.quickRepliesService.updateQuickReply(replyId, req.user.id, dto);
  }

  @Delete('quick-replies/:replyId')
  @ApiOperation({ summary: 'Delete quick reply' })
  @ApiResponse({ status: 200, description: 'Quick reply deleted successfully' })
  async deleteQuickReply(@Request() req, @Param('replyId') replyId: string) {
    await this.quickRepliesService.deleteQuickReply(replyId, req.user.id);
    return { message: 'Quick reply deleted successfully' };
  }
}
```

---

### 5. Instagram Graph API Integration

```typescript
// src/modules/instagram/services/instagram-graph-api.service.ts (Additional methods)

/**
 * Get conversations from Instagram
 */
async getConversations(accessToken: string, limit: number = 25): Promise<any[]> {
  try {
    const response = await this.httpService.axiosRef.get(
      `${this.GRAPH_API_URL}/me/conversations`,
      {
        params: {
          access_token: accessToken,
          fields: 'id,participants,updated_time,messages.limit(1){message,created_time,from}',
          limit,
        },
      },
    );

    return response.data.data || [];
  } catch (error) {
    this.logger.error('Failed to fetch conversations', error.response?.data);
    throw new Error('Failed to fetch conversations from Instagram');
  }
}

/**
 * Get messages from a conversation
 */
async getConversationMessages(accessToken: string, conversationId: string, limit: number = 50): Promise<any[]> {
  try {
    const response = await this.httpService.axiosRef.get(
      `${this.GRAPH_API_URL}/${conversationId}/messages`,
      {
        params: {
          access_token: accessToken,
          fields: 'id,created_time,from,to,message,attachments',
          limit,
        },
      },
    );

    return response.data.data || [];
  } catch (error) {
    this.logger.error('Failed to fetch conversation messages', error.response?.data);
    throw new Error('Failed to fetch messages from Instagram');
  }
}

/**
 * Send message via Instagram
 */
async sendMessage(
  accessToken: string,
  payload: {
    recipient: string;
    message?: string;
    attachments?: Array<{ type: string; url: string }>;
    replyToMessageId?: string;
    storyId?: string;
  },
): Promise<{ messageId: string }> {
  try {
    const body: any = {
      recipient: { id: payload.recipient },
    };

    // Text message
    if (payload.message) {
      body.message = { text: payload.message };
    }

    // Attachments
    if (payload.attachments && payload.attachments.length > 0) {
      const attachment = payload.attachments[0]; // Instagram only supports one attachment per message
      body.message = {
        attachment: {
          type: attachment.type,
          payload: {
            url: attachment.url,
            is_reusable: true,
          },
        },
      };
    }

    const response = await this.httpService.axiosRef.post(
      `${this.GRAPH_API_URL}/me/messages`,
      body,
      {
        params: { access_token: accessToken },
      },
    );

    return {
      messageId: response.data.message_id,
    };
  } catch (error) {
    this.logger.error('Failed to send message', error.response?.data);
    throw new Error(`Failed to send message: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Get user info
 */
async getUserInfo(accessToken: string, userId: string): Promise<any> {
  try {
    const response = await this.httpService.axiosRef.get(
      `${this.GRAPH_API_URL}/${userId}`,
      {
        params: {
          access_token: accessToken,
          fields: 'id,username,name,profile_picture_url,is_verified',
        },
      },
    );

    return response.data;
  } catch (error) {
    this.logger.error('Failed to fetch user info', error.response?.data);
    return {
      username: 'unknown',
      name: 'Unknown User',
      profile_picture_url: '',
      is_verified: false,
    };
  }
}
```

---

### 6. BullMQ Queue Processor

```typescript
// src/modules/instagram/processors/instagram-messages.processor.ts

import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InstagramMessagesService } from '../services/instagram-messages.service';
import { InstagramGraphApiService } from '../services/instagram-graph-api.service';

@Processor('instagram-messages')
export class InstagramMessagesProcessor {
  private readonly logger = new Logger(InstagramMessagesProcessor.name);

  constructor(
    private messagesService: InstagramMessagesService,
    private graphApiService: InstagramGraphApiService,
  ) {}

  @Process('send-quick-reply')
  async handleSendQuickReply(job: Job) {
    this.logger.log(`Processing quick reply job ${job.id}`);

    const { conversationId, accountId, responseText, responseMediaUrl, quickReplyId } = job.data;

    try {
      // Get conversation and account
      const conversation = await this.messagesService.getConversationById(conversationId);
      const account = await this.graphApiService.getAccountById(accountId);

      // Send message
      const attachments = responseMediaUrl ? [{ type: 'image', url: responseMediaUrl }] : [];

      await this.messagesService.sendMessage(account.user_id, {
        instagramAccountId: accountId,
        recipient: conversation.participant_ig_id,
        text: responseText,
        attachments,
      });

      this.logger.log(`Quick reply sent for job ${job.id}`);
    } catch (error) {
      this.logger.error(`Failed to send quick reply for job ${job.id}`, error);
      throw error;
    }
  }

  @Process('sync-messages')
  async handleSyncMessages(job: Job) {
    this.logger.log(`Processing message sync job ${job.id}`);

    const { conversationId, accountId } = job.data;

    try {
      // Sync messages from Instagram
      await this.messagesService.syncConversationMessages(conversationId, accountId);

      this.logger.log(`Messages synced for conversation ${conversationId}`);
    } catch (error) {
      this.logger.error(`Failed to sync messages for job ${job.id}`, error);
      throw error;
    }
  }
}
```

---

### 7. API Examples

#### List Conversations
```bash
curl -X GET "http://localhost:3000/api/instagram/messages/conversations?status=active&unreadOnly=true&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Send Message
```bash
curl -X POST "http://localhost:3000/api/instagram/messages/send" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instagramAccountId": "550e8400-e29b-41d4-a716-446655440000",
    "recipient": "17841405309211844",
    "text": "Hello! Thanks for your interest. How can I help you today?"
  }'
```

#### Send Message with Template
```bash
curl -X POST "http://localhost:3000/api/instagram/messages/send" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instagramAccountId": "550e8400-e29b-41d4-a716-446655440000",
    "recipient": "17841405309211844",
    "templateId": "660e8400-e29b-41d4-a716-446655440000",
    "templateVariables": {
      "name": "John",
      "product": "Premium Course",
      "price": "$99"
    }
  }'
```

#### Send Message with Image
```bash
curl -X POST "http://localhost:3000/api/instagram/messages/send" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instagramAccountId": "550e8400-e29b-41d4-a716-446655440000",
    "recipient": "17841405309211844",
    "text": "Check out this product!",
    "attachments": [
      {
        "type": "image",
        "url": "https://yourdomain.com/products/image.jpg"
      }
    ]
  }'
```

#### List Messages in Conversation
```bash
curl -X GET "http://localhost:3000/api/instagram/messages/conversations/550e8400-e29b-41d4-a716-446655440000/messages?page=1&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Update Conversation
```bash
curl -X PUT "http://localhost:3000/api/instagram/messages/conversations/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active",
    "priority": "high",
    "assignedTo": "770e8400-e29b-41d4-a716-446655440000",
    "tags": ["sales", "hot-lead"],
    "markAsRead": true
  }'
```

#### Create Message Template
```bash
curl -X POST "http://localhost:3000/api/instagram/messages/templates" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Info",
    "category": "product_info",
    "content": "Hi {{name}}! Thanks for asking about {{product}}. The price is {{price}}. Would you like to place an order?",
    "mediaUrls": ["https://yourdomain.com/products/image.jpg"]
  }'
```

#### Create Quick Reply
```bash
curl -X POST "http://localhost:3000/api/instagram/messages/quick-replies" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instagramAccountId": "550e8400-e29b-41d4-a716-446655440000",
    "triggerKeyword": "price",
    "responseText": "Thanks for asking! Our pricing starts at $99. Would you like more details?",
    "matchType": "contains",
    "priority": 10
  }'
```

#### Sync Conversations
```bash
curl -X POST "http://localhost:3000/api/instagram/messages/conversations/sync/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 8. Testing Procedures

#### Unit Tests
```typescript
// src/modules/instagram/services/instagram-messages.service.spec.ts

describe('InstagramMessagesService', () => {
  let service: InstagramMessagesService;
  let conversationRepository: Repository<InstagramConversation>;
  let messageRepository: Repository<InstagramMessage>;
  let graphApiService: InstagramGraphApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstagramMessagesService,
        {
          provide: getRepositoryToken(InstagramConversation),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(InstagramMessage),
          useClass: Repository,
        },
        {
          provide: InstagramGraphApiService,
          useValue: {
            sendMessage: jest.fn(),
            getUserInfo: jest.fn(),
            getConversations: jest.fn(),
          },
        },
        {
          provide: 'BullQueue_instagram-messages',
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<InstagramMessagesService>(InstagramMessagesService);
    conversationRepository = module.get(getRepositoryToken(InstagramConversation));
    messageRepository = module.get(getRepositoryToken(InstagramMessage));
    graphApiService = module.get<InstagramGraphApiService>(InstagramGraphApiService);
  });

  describe('sendMessage', () => {
    it('should send a text message successfully', async () => {
      const dto: SendMessageDto = {
        instagramAccountId: 'account-123',
        recipient: 'user-456',
        text: 'Hello!',
      };

      jest.spyOn(graphApiService, 'sendMessage').mockResolvedValue({ messageId: 'msg-789' });
      jest.spyOn(conversationRepository, 'findOne').mockResolvedValue(mockConversation);

      const result = await service.sendMessage('user-123', dto);

      expect(result.textContent).toBe('Hello!');
      expect(graphApiService.sendMessage).toHaveBeenCalled();
    });

    it('should process template variables', async () => {
      const template = {
        id: 'tpl-123',
        content: 'Hi {{name}}, the price is {{price}}',
        media_urls: [],
      };

      jest.spyOn(templateRepository, 'findOne').mockResolvedValue(template);

      const dto: SendMessageDto = {
        instagramAccountId: 'account-123',
        recipient: 'user-456',
        templateId: 'tpl-123',
        templateVariables: { name: 'John', price: '$99' },
      };

      const result = await service.sendMessage('user-123', dto);

      expect(result.textContent).toBe('Hi John, the price is $99');
    });
  });

  describe('processIncomingMessage', () => {
    it('should create new conversation for new participant', async () => {
      const webhookData = {
        object: 'instagram',
        entry: [
          {
            changes: [
              {
                field: 'messages',
                value: {
                  messages: [{ id: 'msg-123', text: 'Hi there!' }],
                  sender: { id: 'user-456' },
                  recipient: { id: 'page-789' },
                },
              },
            ],
          },
        ],
      };

      jest.spyOn(conversationRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(graphApiService, 'getUserInfo').mockResolvedValue({
        username: 'johndoe',
        name: 'John Doe',
      });

      await service.processIncomingMessage(webhookData);

      expect(conversationRepository.create).toHaveBeenCalled();
    });
  });
});
```

#### Integration Tests
```bash
# Test conversation listing
npm run test:e2e -- instagram-messages.e2e-spec.ts

# Test message sending
npm run test:e2e -- instagram-messages-send.e2e-spec.ts

# Test webhook processing
npm run test:e2e -- instagram-webhooks.e2e-spec.ts
```

---

## Acceptance Criteria

### Functional Requirements

1. **Conversation Management**
   - [ ] List conversations with filtering (status, assigned, unread, priority, tags)
   - [ ] Pagination support with configurable page size
   - [ ] Search conversations by participant name/username
   - [ ] Get conversation details with participant info
   - [ ] Update conversation (status, assigned user, priority, tags)
   - [ ] Mark conversations as read/unread
   - [ ] Archive conversations
   - [ ] Unread count accurately tracked

2. **Message Operations**
   - [ ] Send text messages via Instagram DM
   - [ ] Send messages with image attachments
   - [ ] Send messages with video attachments
   - [ ] Reply to specific messages
   - [ ] Reply to Instagram stories
   - [ ] List messages with pagination
   - [ ] Filter messages by type, sender, date range
   - [ ] Search message content
   - [ ] Track message delivery and read status

3. **Message Templates**
   - [ ] Create message templates with variables
   - [ ] List templates by category
   - [ ] Update template content and media
   - [ ] Delete templates
   - [ ] Process template variables ({{name}}, {{product}}, etc.)
   - [ ] Track template usage count
   - [ ] Support template media attachments
   - [ ] Variable extraction from template content

4. **Quick Replies**
   - [ ] Create quick reply triggers
   - [ ] Support multiple match types (exact, contains, starts_with, regex)
   - [ ] Automatic reply triggering on incoming messages
   - [ ] Priority-based quick reply selection
   - [ ] Update quick reply settings
   - [ ] Delete quick replies
   - [ ] Track quick reply usage
   - [ ] Support media in quick replies

5. **Webhook Integration**
   - [ ] Process incoming messages from webhooks
   - [ ] Create conversations for new participants
   - [ ] Update existing conversations
   - [ ] Store message attachments
   - [ ] Handle story replies
   - [ ] Prevent duplicate message processing
   - [ ] Update unread counts
   - [ ] Trigger quick replies automatically

6. **Instagram API Integration**
   - [ ] Fetch conversations from Instagram
   - [ ] Fetch conversation messages
   - [ ] Send messages via Graph API
   - [ ] Fetch user/participant info
   - [ ] Handle API rate limits
   - [ ] Proper error handling for API failures
   - [ ] Token validation before API calls

### Technical Requirements

7. **Database**
   - [ ] Conversations table with proper indexes
   - [ ] Messages table with relationship to conversations
   - [ ] Message templates table
   - [ ] Quick replies table
   - [ ] Foreign key constraints
   - [ ] Cascading deletes configured
   - [ ] JSONB fields for flexible data

8. **Performance**
   - [ ] Conversation list loads < 200ms
   - [ ] Message list loads < 300ms
   - [ ] Message send < 2s total time
   - [ ] Webhook processing < 500ms
   - [ ] Database queries optimized with indexes
   - [ ] Pagination for large datasets

9. **Security**
   - [ ] JWT authentication on all endpoints
   - [ ] User can only access their own conversations
   - [ ] Access token encryption in database
   - [ ] Input validation on all DTOs
   - [ ] SQL injection prevention
   - [ ] XSS prevention

10. **Queue Processing**
    - [ ] Quick replies sent via BullMQ
    - [ ] Message sync jobs queued
    - [ ] Failed jobs retry with exponential backoff
    - [ ] Dead letter queue for permanent failures
    - [ ] Job progress tracking

### Quality Requirements

11. **Error Handling**
    - [ ] Proper error messages for invalid inputs
    - [ ] Graceful handling of Instagram API errors
    - [ ] Logging of all errors with context
    - [ ] User-friendly error responses
    - [ ] No sensitive data in error messages

12. **Validation**
    - [ ] DTO validation using class-validator
    - [ ] Required fields enforced
    - [ ] Format validation (URLs, UUIDs, etc.)
    - [ ] Enum validation for status/type fields
    - [ ] Min/max validation for pagination

13. **Documentation**
    - [ ] Swagger API documentation complete
    - [ ] All endpoints documented with examples
    - [ ] DTO properties documented
    - [ ] Response types documented
    - [ ] curl examples for all operations

14. **Testing**
    - [ ] Unit tests for service methods (>80% coverage)
    - [ ] Integration tests for controllers
    - [ ] E2E tests for critical flows
    - [ ] Mock Instagram API in tests
    - [ ] Test error scenarios

15. **Monitoring**
    - [ ] Log message send operations
    - [ ] Log webhook processing
    - [ ] Log quick reply triggers
    - [ ] Track API call failures
    - [ ] Monitor queue processing

### User Experience

16. **Response Times**
    - [ ] List conversations returns within 200ms
    - [ ] Send message completes within 2s
    - [ ] Webhook processing within 500ms
    - [ ] Template application within 100ms

17. **Data Accuracy**
    - [ ] Conversation participant info accurate
    - [ ] Message timestamps correct
    - [ ] Unread counts accurate
    - [ ] Template variables replaced correctly
    - [ ] Quick reply matching works reliably

18. **Scalability**
    - [ ] Support 10,000+ conversations per account
    - [ ] Support 100,000+ messages per conversation
    - [ ] Support 100+ concurrent webhook events
    - [ ] Efficient pagination for large datasets
    - [ ] Database queries optimized with indexes

19. **Reliability**
    - [ ] Message delivery guaranteed (retry on failure)
    - [ ] No duplicate messages sent
    - [ ] No duplicate webhook processing
    - [ ] Conversation state consistency
    - [ ] Transaction rollback on errors

20. **Maintenance**
    - [ ] Clear code structure and organization
    - [ ] Comprehensive logging for debugging
    - [ ] Database migration scripts
    - [ ] Easy to add new message types
    - [ ] Configuration via environment variables

---

## Dependencies

- **IG-001**: Instagram OAuth authentication (for access tokens)
- **IG-002**: Instagram account connection (for account data)
- **IG-005**: Instagram webhooks (for real-time message sync)
- **Database**: PostgreSQL with uuid-ossp extension
- **Queue**: BullMQ for async processing
- **Storage**: MinIO S3 for media attachments (future)

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/instagram/messages/conversations` | List conversations |
| GET | `/instagram/messages/conversations/:id` | Get conversation |
| PUT | `/instagram/messages/conversations/:id` | Update conversation |
| POST | `/instagram/messages/conversations/sync/:accountId` | Sync conversations |
| GET | `/instagram/messages/conversations/:id/messages` | List messages |
| POST | `/instagram/messages/send` | Send message |
| POST | `/instagram/messages/templates` | Create template |
| GET | `/instagram/messages/templates` | List templates |
| GET | `/instagram/messages/templates/:id` | Get template |
| PUT | `/instagram/messages/templates/:id` | Update template |
| DELETE | `/instagram/messages/templates/:id` | Delete template |
| POST | `/instagram/messages/quick-replies` | Create quick reply |
| GET | `/instagram/messages/quick-replies/:accountId` | List quick replies |
| PUT | `/instagram/messages/quick-replies/:id` | Update quick reply |
| DELETE | `/instagram/messages/quick-replies/:id` | Delete quick reply |

---

## Environment Variables

```bash
# Instagram Graph API
INSTAGRAM_GRAPH_API_URL=https://graph.instagram.com/v21.0

# Redis (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# Rate limiting
INSTAGRAM_MESSAGE_RATE_LIMIT=100  # messages per hour
```

---

## Notes

- Instagram messaging requires Page-level access token with `instagram_manage_messages` permission
- Message delivery is asynchronous - webhook confirms delivery
- Instagram supports one attachment per message
- Rate limits: ~100 messages per hour per user
- Webhook verification required for real-time message sync
- Story replies have 24-hour expiration from story creation

---

## Estimated Effort

- **Database Design & Migrations**: 4 hours
- **DTOs & Validation**: 3 hours
- **Service Implementation**: 12 hours
- **Controller Implementation**: 4 hours
- **Graph API Integration**: 6 hours
- **Webhook Processing**: 4 hours
- **Queue Processing**: 3 hours
- **Testing**: 8 hours
- **Documentation**: 2 hours
- **Total**: ~46 hours (13 story points)

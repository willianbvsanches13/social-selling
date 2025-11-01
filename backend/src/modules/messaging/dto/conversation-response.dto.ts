import { ApiProperty } from '@nestjs/swagger';

export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export class ConversationResponseDto {
  @ApiProperty({
    description: 'Conversation unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Instagram username of the conversation participant',
    example: 'john_doe_official',
  })
  participantUsername!: string;

  @ApiProperty({
    description: 'Timestamp of the last message in the conversation',
    example: '2025-10-31T22:30:00Z',
    nullable: true,
  })
  lastMessageAt: Date | null = null;

  @ApiProperty({
    description: 'Number of unread messages in the conversation',
    example: 3,
  })
  unreadCount!: number;

  @ApiProperty({
    description: 'Conversation status',
    enum: ConversationStatus,
    example: ConversationStatus.ACTIVE,
  })
  status!: ConversationStatus;
}

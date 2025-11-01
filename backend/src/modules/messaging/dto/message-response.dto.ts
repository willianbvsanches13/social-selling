import { ApiProperty } from '@nestjs/swagger';

export enum MessageSenderType {
  USER = 'user',
  CUSTOMER = 'customer',
}

export class MessageResponseDto {
  @ApiProperty({
    description: 'Message unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Conversation ID this message belongs to',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  conversationId!: string;

  @ApiProperty({
    description: 'Message text content',
    example: 'Hello! How can I help you?',
  })
  content!: string;

  @ApiProperty({
    description: 'Type of sender (user or customer)',
    enum: MessageSenderType,
    example: MessageSenderType.USER,
  })
  senderType!: MessageSenderType;

  @ApiProperty({
    description: 'Timestamp when message was sent',
    example: '2025-10-31T22:30:00Z',
  })
  sentAt!: Date;

  @ApiProperty({
    description: 'Whether the message has been read',
    example: false,
  })
  isRead!: boolean;
}

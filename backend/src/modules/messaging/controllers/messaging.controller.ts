import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConversationService } from '../services/conversation.service';
import { MessagingService } from '../services/messaging.service';
import {
  ConversationFilterDto,
  SearchConversationsDto,
  ConversationResponseDto,
  ConversationListResponseDto,
} from '../dto/conversation.dto';
import {
  MessageFilterDto,
  SendMessageDto,
  MessageResponseDto,
  MessageListResponseDto,
} from '../dto/message.dto';

@ApiTags('Messaging')
@Controller('messaging')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagingController {
  private readonly logger = new Logger(MessagingController.name);

  constructor(
    private readonly conversationService: ConversationService,
    private readonly messagingService: MessagingService,
  ) {}

  @Get('conversations')
  @ApiOperation({
    summary: 'List conversations',
    description:
      'Retrieves a paginated list of conversations for a client account with optional filters',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of conversations retrieved successfully',
    type: ConversationListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Client account not found',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Unauthorized' })
  async listConversations(
    @Request() req: any,
    @Query() filters: ConversationFilterDto,
  ): Promise<ConversationListResponseDto> {
    const { clientAccountId, ...otherFilters } = filters;
    const result = await this.conversationService.listConversations(
      req.user.id,
      clientAccountId,
      otherFilters,
    );

    return {
      conversations: result.conversations.map((conv) => conv.toJSON()),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }

  @Get('conversations/:id')
  @ApiOperation({
    summary: 'Get conversation details',
    description: 'Retrieves detailed information about a specific conversation',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversation details retrieved successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversation not found',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Unauthorized' })
  async getConversation(
    @Request() req: any,
    @Param('id') conversationId: string,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.conversationService.getConversation(
      req.user.id,
      conversationId,
    );

    return conversation.toJSON() as ConversationResponseDto;
  }

  @Get('conversations/:id/messages')
  @ApiOperation({
    summary: 'List messages in conversation',
    description:
      'Retrieves a paginated list of messages for a specific conversation',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of messages retrieved successfully',
    type: MessageListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversation not found',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Unauthorized' })
  async listMessages(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Query() filters: MessageFilterDto,
  ): Promise<MessageListResponseDto> {
    // Verify access through conversation service
    await this.conversationService.getConversation(req.user.id, conversationId);

    const { limit = 100, offset = 0 } = filters;

    const messages = await this.messagingService[
      'messageRepository'
    ].findByConversation(conversationId, { limit, offset });

    // Get total count (in production, you'd want a dedicated count method)
    const total = messages.length;

    return {
      messages: messages.map((msg) => msg.toJSON()),
      total,
      limit,
      offset,
    };
  }

  @Post('conversations/:id/messages')
  @ApiOperation({
    summary: 'Send a message',
    description:
      'Sends a text message to a participant in a conversation via Instagram',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Message sent successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid message or 24-hour response window has expired',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversation not found',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Unauthorized' })
  async sendMessage(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Body() sendMessageDto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    const message = await this.messagingService.sendTextMessage(
      req.user.id,
      conversationId,
      sendMessageDto.text,
    );

    this.logger.log(
      `Message sent to conversation ${conversationId} by user ${req.user.id}`,
    );

    return message.toJSON() as MessageResponseDto;
  }

  @Patch('conversations/:id/read')
  @ApiOperation({
    summary: 'Mark conversation as read',
    description: 'Marks all unread messages in a conversation as read',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversation marked as read successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversation not found',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Unauthorized' })
  async markAsRead(
    @Request() req: any,
    @Param('id') conversationId: string,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.conversationService.markAsRead(
      req.user.id,
      conversationId,
    );

    this.logger.log(
      `Conversation ${conversationId} marked as read by user ${req.user.id}`,
    );

    return conversation.toJSON() as ConversationResponseDto;
  }
}

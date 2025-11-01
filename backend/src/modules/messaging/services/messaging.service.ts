import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { IConversationRepository } from '../../../domain/repositories/conversation.repository.interface';
import { IMessageRepository } from '../../../domain/repositories/message.repository.interface';
import { IClientAccountRepository } from '../../../domain/repositories/client-account.repository.interface';
import { InstagramApiService } from '../../instagram/services/instagram-api.service';
import {
  Message,
  MessageType,
  SenderType,
} from '../../../domain/entities/message.entity';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private readonly RESPONSE_WINDOW_HOURS = 24;

  constructor(
    @Inject('IConversationRepository')
    private readonly conversationRepository: IConversationRepository,
    @Inject('IMessageRepository')
    private readonly messageRepository: IMessageRepository,
    @Inject('IClientAccountRepository')
    private readonly clientAccountRepository: IClientAccountRepository,
    private readonly instagramApiService: InstagramApiService,
  ) {}

  async sendTextMessage(
    userId: string,
    conversationId: string,
    text: string,
  ): Promise<Message> {
    const conversation =
      await this.conversationRepository.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const clientAccount = await this.clientAccountRepository.findById(
      conversation.clientAccountId,
    );

    if (!clientAccount) {
      throw new NotFoundException('Client account not found');
    }

    if (clientAccount.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this conversation',
      );
    }

    await this.validateResponseWindow(conversationId);

    let platformMessageId: string;
    try {
      const response = await this.instagramApiService.sendMessage(
        conversation.clientAccountId,
        conversation.participantPlatformId,
        text,
      );
      platformMessageId = response.id;
    } catch (error) {
      this.logger.error(
        `Failed to send message via Instagram API: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to send message to Instagram',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const message = Message.create({
      conversationId: conversation.id,
      platformMessageId,
      senderType: SenderType.USER,
      senderPlatformId: clientAccount.platformAccountId,
      messageType: MessageType.TEXT,
      content: text,
      sentAt: new Date(),
      metadata: {},
    });

    const savedMessage = await this.messageRepository.create(message);

    conversation.updateLastMessage(savedMessage.sentAt);
    await this.conversationRepository.update(conversation);

    this.logger.log(
      `Message sent successfully to conversation ${conversationId}`,
    );

    return savedMessage;
  }

  private async validateResponseWindow(conversationId: string): Promise<void> {
    const messages = await this.messageRepository.findByConversation(
      conversationId,
      { limit: 100, offset: 0 },
    );

    const lastCustomerMessage = messages.find(
      (message: Message) => message.senderType === SenderType.CUSTOMER,
    );

    if (!lastCustomerMessage) {
      throw new BadRequestException(
        'Cannot send message: no previous customer message found',
      );
    }

    if (
      !lastCustomerMessage.isWithinResponseWindow(this.RESPONSE_WINDOW_HOURS)
    ) {
      throw new BadRequestException(
        'Cannot send message: 24-hour response window has expired',
      );
    }
  }
}

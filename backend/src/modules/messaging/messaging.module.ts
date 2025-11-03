import { Module, forwardRef } from '@nestjs/common';
import { MessagingController } from './controllers/messaging.controller';
import { ConversationService } from './services/conversation.service';
import { MessagingService } from './services/messaging.service';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { InstagramModule } from '../instagram/instagram.module';
import { ConversationRepository } from '../../infrastructure/database/repositories/conversation.repository';
import { MessageRepository } from '../../infrastructure/database/repositories/message.repository';
import { ClientAccountRepository } from '../../infrastructure/database/repositories/client-account.repository';

@Module({
  imports: [DatabaseModule, forwardRef(() => InstagramModule)],
  controllers: [MessagingController],
  providers: [
    ConversationService,
    MessagingService,
    {
      provide: 'IConversationRepository',
      useClass: ConversationRepository,
    },
    {
      provide: 'IMessageRepository',
      useClass: MessageRepository,
    },
    {
      provide: 'IClientAccountRepository',
      useClass: ClientAccountRepository,
    },
  ],
  exports: [ConversationService, MessagingService],
})
export class MessagingModule {}

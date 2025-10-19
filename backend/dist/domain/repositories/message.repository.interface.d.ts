import { Message, MessageType } from '../entities/message.entity';
export interface FindMessagesOptions {
    conversationId?: string;
    messageType?: MessageType;
    isRead?: boolean;
    afterDate?: Date;
    beforeDate?: Date;
    limit?: number;
    offset?: number;
}
export interface IMessageRepository {
    findById(id: string): Promise<Message | null>;
    findByConversation(conversationId: string, options?: FindMessagesOptions): Promise<Message[]>;
    findByPlatformId(platformMessageId: string): Promise<Message | null>;
    create(message: Message): Promise<Message>;
    update(message: Message): Promise<Message>;
    bulkMarkAsRead(messageIds: string[]): Promise<void>;
    searchInContent(searchTerm: string, conversationId?: string): Promise<Message[]>;
    countUnreadByConversation(conversationId: string): Promise<number>;
}

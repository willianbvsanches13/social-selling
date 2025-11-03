/**
 * Data Transfer Object for replied/quoted messages
 * Contains essential information about the message being replied to
 */
export class RepliedMessageDto {
  /**
   * Unique identifier of the replied message
   */
  id!: string;

  /**
   * Text content of the replied message
   */
  content?: string;

  /**
   * Who sent the message (user or customer)
   */
  senderType!: string;

  /**
   * Media URL if the replied message contains media
   */
  mediaUrl?: string;

  /**
   * When the replied message was sent
   */
  sentAt!: Date;
}

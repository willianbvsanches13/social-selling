import { Injectable, Logger } from '@nestjs/common';
import { EmailTrackingService, EmailStatus } from './email-tracking.service';

@Injectable()
export class EmailWebhookHandlerService {
  private readonly logger = new Logger(EmailWebhookHandlerService.name);

  constructor(private tracking: EmailTrackingService) {}

  async handleSendGridWebhook(events: any[]): Promise<void> {
    for (const event of events) {
      try {
        const messageId = event.sg_message_id?.split('.')[0]; // Remove hash

        switch (event.event) {
          case 'delivered':
            await this.tracking.updateEmailStatus(
              messageId,
              EmailStatus.DELIVERED,
              {
                deliveredAt: new Date(event.timestamp * 1000),
              },
            );
            break;

          case 'open':
            await this.tracking.updateEmailStatus(
              messageId,
              EmailStatus.OPENED,
              {
                openedAt: new Date(event.timestamp * 1000),
              },
            );
            break;

          case 'click':
            await this.tracking.updateEmailStatus(
              messageId,
              EmailStatus.CLICKED,
              {
                clickedAt: new Date(event.timestamp * 1000),
              },
            );
            break;

          case 'bounce':
            await this.tracking.handleBounce(
              messageId,
              event.type, // hard or soft
              event.reason,
            );
            break;

          case 'spamreport':
            await this.tracking.handleComplaint(messageId);
            break;
        }
      } catch (error: any) {
        this.logger.error(`Failed to process SendGrid event: ${error.message}`);
      }
    }
  }

  async handleMailgunWebhook(event: any): Promise<void> {
    try {
      const messageId = event['message-id'];

      switch (event.event) {
        case 'delivered':
          await this.tracking.updateEmailStatus(
            messageId,
            EmailStatus.DELIVERED,
            {
              deliveredAt: new Date(event.timestamp * 1000),
            },
          );
          break;

        case 'opened':
          await this.tracking.updateEmailStatus(messageId, EmailStatus.OPENED, {
            openedAt: new Date(event.timestamp * 1000),
          });
          break;

        case 'clicked':
          await this.tracking.updateEmailStatus(
            messageId,
            EmailStatus.CLICKED,
            {
              clickedAt: new Date(event.timestamp * 1000),
            },
          );
          break;

        case 'bounced':
          await this.tracking.handleBounce(
            messageId,
            event.severity === 'permanent' ? 'hard' : 'soft',
            event.reason,
          );
          break;

        case 'complained':
          await this.tracking.handleComplaint(messageId);
          break;
      }
    } catch (error: any) {
      this.logger.error(`Failed to process Mailgun event: ${error.message}`);
    }
  }
}

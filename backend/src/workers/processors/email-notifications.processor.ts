import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailTemplateService } from '../services/email-template.service';
import { SmtpProviderService } from '../services/smtp-provider.service';
import { EmailTrackingService } from '../services/email-tracking.service';
import {
  EmailJobData,
  EmailJobResult,
} from '../queues/email-notifications.queue';

@Processor('email-notifications', {
  concurrency: 10,
  limiter: {
    max: 100,
    duration: 1000, // 100 emails per second
  },
})
@Injectable()
export class EmailNotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailNotificationsProcessor.name);
  private readonly defaultFrom: string;

  constructor(
    private configService: ConfigService,
    private templateService: EmailTemplateService,
    private smtpProvider: SmtpProviderService,
    private tracking: EmailTrackingService,
  ) {
    super();
    this.defaultFrom = this.configService.get(
      'EMAIL_FROM',
      'noreply@socialselling.com',
    );
  }

  async process(
    job: Job<EmailJobData, EmailJobResult>,
  ): Promise<EmailJobResult> {
    const { to, template, context } = job.data;

    this.logger.log(`Processing email job: ${template} to ${to}`);

    const result: EmailJobResult = {
      success: false,
      to,
      provider: this.configService.get('EMAIL_PROVIDER', 'sendgrid'),
    };

    try {
      // Step 1: Check if email is deliverable
      await job.updateProgress(10);

      const recipients = Array.isArray(to) ? to : [to];
      const deliverableRecipients =
        await this.filterDeliverableEmails(recipients);

      if (deliverableRecipients.length === 0) {
        this.logger.warn(`No deliverable recipients for job ${job.id}`);
        result.success = true; // Don't retry
        return result;
      }

      // Step 2: Render email template
      await job.updateProgress(30);

      const rendered = await this.templateService.renderTemplate(
        template,
        context,
      );

      await job.updateProgress(50);

      // Step 3: Send email via SMTP provider
      const sendResult = await this.smtpProvider.sendEmail({
        to: deliverableRecipients,
        from: job.data.from || this.defaultFrom,
        subject: job.data.subject || rendered.subject,
        html: rendered.html,
        text: rendered.text,
        replyTo: job.data.replyTo,
        cc: job.data.cc,
        bcc: job.data.bcc,
        attachments: job.data.attachments,
        tags: job.data.tags,
        headers: job.data.headers,
      });

      await job.updateProgress(80);

      // Step 4: Log email sent
      await this.tracking.logEmailSent(
        deliverableRecipients,
        job.data.subject || rendered.subject,
        template,
        sendResult.messageId,
        sendResult.provider,
        job.data.userId,
        job.data.from || this.defaultFrom,
        context,
        job.data.tags,
      );

      await job.updateProgress(100);

      result.success = true;
      result.messageId = sendResult.messageId;
      result.sentAt = new Date();

      this.logger.log(`Email sent successfully: ${sendResult.messageId}`);

      return result;
    } catch (error: any) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);

      // Log failure
      await this.tracking.logEmailFailed(
        to,
        job.data.subject,
        template,
        error.message,
        job.data.userId,
        job.data.from || this.defaultFrom,
      );

      result.error = {
        code: error.code || 'SEND_ERROR',
        message: error.message,
        retryable: this.isRetryableError(error),
      };

      return result;
    }
  }

  private async filterDeliverableEmails(emails: string[]): Promise<string[]> {
    const deliverable = await Promise.all(
      emails.map(async (email) => {
        const isDeliverable = await this.tracking.isEmailDeliverable(email);
        return isDeliverable ? email : null;
      }),
    );

    return deliverable.filter(Boolean) as string[];
  }

  private isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // SMTP temporary errors (4xx)
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return true;
    }

    // Rate limit errors
    if (
      error.message?.includes('rate limit') ||
      error.message?.includes('too many requests')
    ) {
      return true;
    }

    // Permanent errors (invalid email, rejected)
    const permanentErrors = [
      'invalid email',
      'does not exist',
      'mailbox unavailable',
      'recipient rejected',
    ];

    return !permanentErrors.some((msg) =>
      error.message?.toLowerCase().includes(msg),
    );
  }

  @OnWorkerEvent('active')
  onActive(job: Job<EmailJobData>) {
    this.logger.log(`Email job active: ${job.data.template} to ${job.data.to}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<EmailJobData>, result: EmailJobResult) {
    if (result.success) {
      this.logger.log(
        `Email sent: ${job.data.template} - Message ID: ${result.messageId}`,
      );
    } else {
      this.logger.warn(
        `Email job completed with errors: ${result.error?.message}`,
      );
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<EmailJobData>, error: Error) {
    this.logger.error(
      `Email job failed: ${job.data.template} to ${job.data.to} - ${error.message}`,
      error.stack,
    );
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import * as formData from 'form-data';
import Mailgun from 'mailgun.js';

export interface SendEmailOptions {
  to: string | string[];
  from: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  tags?: string[];
  headers?: Record<string, string>;
}

export interface SendEmailResult {
  success: boolean;
  messageId: string;
  provider: 'sendgrid' | 'mailgun';
}

@Injectable()
export class SmtpProviderService {
  private readonly logger = new Logger(SmtpProviderService.name);
  private readonly provider: 'sendgrid' | 'mailgun';
  private sendgridClient?: typeof sgMail;
  private mailgunClient?: any;

  constructor(private configService: ConfigService) {
    this.provider = this.configService.get('EMAIL_PROVIDER', 'sendgrid');
    this.initializeProvider();
  }

  private initializeProvider() {
    if (this.provider === 'sendgrid') {
      this.initializeSendGrid();
    } else if (this.provider === 'mailgun') {
      this.initializeMailgun();
    } else {
      throw new Error(`Unknown email provider: ${this.provider}`);
    }
  }

  private initializeSendGrid() {
    const apiKey = this.configService.get('SENDGRID_API_KEY');
    if (!apiKey) {
      this.logger.warn('SENDGRID_API_KEY is not configured - email notifications will be disabled');
      return;
    }

    sgMail.setApiKey(apiKey);
    this.sendgridClient = sgMail;

    this.logger.log('SendGrid client initialized');
  }

  private initializeMailgun() {
    const apiKey = this.configService.get('MAILGUN_API_KEY');
    const domain = this.configService.get('MAILGUN_DOMAIN');

    if (!apiKey || !domain) {
      this.logger.warn('MAILGUN_API_KEY or MAILGUN_DOMAIN is not configured - email notifications will be disabled');
      return;
    }

    const mailgun = new Mailgun(formData);
    this.mailgunClient = mailgun.client({
      username: 'api',
      key: apiKey,
    });

    this.logger.log('Mailgun client initialized');
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      if (this.provider === 'sendgrid') {
        if (!this.sendgridClient) {
          throw new Error('SendGrid client is not initialized. Please configure SENDGRID_API_KEY.');
        }
        return await this.sendViaSendGrid(options);
      } else if (this.provider === 'mailgun') {
        if (!this.mailgunClient) {
          throw new Error('Mailgun client is not initialized. Please configure MAILGUN_API_KEY and MAILGUN_DOMAIN.');
        }
        return await this.sendViaMailgun(options);
      }

      throw new Error(`Unknown provider: ${this.provider}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw this.transformError(error);
    }
  }

  private async sendViaSendGrid(
    options: SendEmailOptions,
  ): Promise<SendEmailResult> {
    const msg: any = {
      to: options.to,
      from: options.from,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    if (options.replyTo) {
      msg.replyTo = options.replyTo;
    }

    if (options.cc) {
      msg.cc = options.cc;
    }

    if (options.bcc) {
      msg.bcc = options.bcc;
    }

    if (options.attachments) {
      msg.attachments = options.attachments.map((att) => ({
        filename: att.filename,
        content: Buffer.isBuffer(att.content)
          ? att.content.toString('base64')
          : att.content,
        type: att.contentType || 'application/octet-stream',
        disposition: 'attachment',
      }));
    }

    if (options.tags) {
      msg.categories = options.tags;
    }

    if (options.headers) {
      msg.headers = options.headers;
    }

    const response = await this.sendgridClient!.send(msg);

    return {
      success: true,
      messageId: response[0].headers['x-message-id'],
      provider: 'sendgrid',
    };
  }

  private async sendViaMailgun(
    options: SendEmailOptions,
  ): Promise<SendEmailResult> {
    const domain = this.configService.get('MAILGUN_DOMAIN');

    const messageData: any = {
      from: options.from,
      to: Array.isArray(options.to) ? options.to.join(',') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    if (options.replyTo) {
      messageData['h:Reply-To'] = options.replyTo;
    }

    if (options.cc) {
      messageData.cc = options.cc.join(',');
    }

    if (options.bcc) {
      messageData.bcc = options.bcc.join(',');
    }

    if (options.tags) {
      messageData['o:tag'] = options.tags;
    }

    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        messageData[`h:${key}`] = value;
      }
    }

    if (options.attachments) {
      messageData.attachment = options.attachments.map((att) => ({
        filename: att.filename,
        data: att.content,
      }));
    }

    const response = await this.mailgunClient.messages.create(
      domain,
      messageData,
    );

    return {
      success: true,
      messageId: response.id,
      provider: 'mailgun',
    };
  }

  async verifyDomain(): Promise<boolean> {
    try {
      if (this.provider === 'sendgrid') {
        // SendGrid domain verification is done via web interface
        return true;
      } else if (this.provider === 'mailgun') {
        const domain = this.configService.get('MAILGUN_DOMAIN');
        const domainInfo = await this.mailgunClient.domains.get(domain);
        return domainInfo.state === 'active';
      }

      return false;
    } catch (error: any) {
      this.logger.error(`Domain verification failed: ${error.message}`);
      return false;
    }
  }

  async getDeliveryStats(days: number = 7) {
    try {
      if (this.provider === 'sendgrid') {
        // Use SendGrid Stats API
        // Implementation depends on SendGrid SDK
        return null;
      } else if (this.provider === 'mailgun') {
        const domain = this.configService.get('MAILGUN_DOMAIN');
        const stats = await this.mailgunClient.stats.getDomain(domain, {
          event: ['accepted', 'delivered', 'failed', 'opened', 'clicked'],
          duration: `${days}d`,
        });
        return stats;
      }

      return null;
    } catch (error: any) {
      this.logger.error(`Failed to get delivery stats: ${error.message}`);
      return null;
    }
  }

  private transformError(error: any): Error {
    if (error.response?.body?.errors) {
      // SendGrid error format
      const errors = error.response.body.errors;
      const message = errors.map((e: any) => e.message).join(', ');
      return new Error(`SendGrid error: ${message}`);
    }

    if (error.message) {
      return error;
    }

    return new Error('Unknown email sending error');
  }
}

import { Queue, QueueOptions } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum EmailPriority {
  CRITICAL = 1, // Password reset, 2FA
  HIGH = 5, // Welcome, verification
  NORMAL = 10, // Notifications
  LOW = 20, // Marketing, newsletters
}

export enum EmailTemplate {
  WELCOME = 'welcome',
  EMAIL_VERIFICATION = 'email-verification',
  PASSWORD_RESET = 'password-reset',
  PASSWORD_CHANGED = 'password-changed',
  TWO_FACTOR_ENABLED = 'two-factor-enabled',
  POST_PUBLISHED = 'post-published',
  POST_FAILED = 'post-failed',
  NEW_COMMENT = 'new-comment',
  NEW_MENTION = 'new-mention',
  NEW_MESSAGE = 'new-message',
  ANALYTICS_REPORT = 'analytics-report',
  ACCOUNT_DELETED = 'account-deleted',
}

export interface EmailJobData {
  userId?: string;
  to: string | string[];
  from?: string;
  subject: string;
  template: EmailTemplate;
  context: Record<string, any>;
  priority: EmailPriority;
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
  scheduledFor?: Date;
}

export interface EmailJobResult {
  success: boolean;
  messageId?: string;
  to: string | string[];
  sentAt?: Date;
  provider: 'sendgrid' | 'mailgun';
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

@Injectable()
export class EmailNotificationsQueue {
  private queue!: Queue<EmailJobData, EmailJobResult>;

  constructor(private configService: ConfigService) {
    this.initializeQueue();
  }

  private initializeQueue() {
    const queueOptions: QueueOptions = {
      connection: {
        host: this.configService.get('REDIS_HOST'),
        port: this.configService.get('REDIS_PORT'),
        password: this.configService.get('REDIS_PASSWORD'),
        db: this.configService.get('REDIS_DB', 0),
      },
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 10000, // 10 seconds base delay
        },
        removeOnComplete: {
          count: 10000,
          age: 604800, // 7 days
        },
        removeOnFail: {
          count: 50000,
          age: 2592000, // 30 days
        },
      },
    };

    this.queue = new Queue<EmailJobData, EmailJobResult>(
      'email-notifications',
      queueOptions,
    );
  }

  async sendEmail(data: EmailJobData): Promise<void> {
    const jobId = `email-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Calculate delay if scheduled
    const delay = data.scheduledFor
      ? Math.max(0, data.scheduledFor.getTime() - Date.now())
      : 0;

    await this.queue.add('send-email', data, {
      jobId,
      priority: data.priority,
      delay,
    });
  }

  async sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
    await this.sendEmail({
      to: userEmail,
      subject: 'Welcome to Social Selling!',
      template: EmailTemplate.WELCOME,
      context: {
        userName,
        loginUrl: `${this.configService.get('APP_URL')}/login`,
      },
      priority: EmailPriority.HIGH,
      tags: ['welcome', 'transactional'],
    });
  }

  async sendEmailVerification(
    userEmail: string,
    userName: string,
    verificationToken: string,
  ): Promise<void> {
    const verificationUrl = `${this.configService.get('APP_URL')}/verify-email?token=${verificationToken}`;

    await this.sendEmail({
      to: userEmail,
      subject: 'Verify your email address',
      template: EmailTemplate.EMAIL_VERIFICATION,
      context: {
        userName,
        verificationUrl,
      },
      priority: EmailPriority.HIGH,
      tags: ['verification', 'transactional'],
    });
  }

  async sendPasswordReset(
    userEmail: string,
    userName: string,
    resetToken: string,
  ): Promise<void> {
    const resetUrl = `${this.configService.get('APP_URL')}/reset-password?token=${resetToken}`;

    await this.sendEmail({
      to: userEmail,
      subject: 'Reset your password',
      template: EmailTemplate.PASSWORD_RESET,
      context: {
        userName,
        resetUrl,
      },
      priority: EmailPriority.CRITICAL,
      tags: ['password-reset', 'transactional'],
    });
  }

  async sendPasswordChanged(
    userEmail: string,
    userName: string,
  ): Promise<void> {
    await this.sendEmail({
      to: userEmail,
      subject: 'Your password has been changed',
      template: EmailTemplate.PASSWORD_CHANGED,
      context: {
        userName,
        supportUrl: `${this.configService.get('APP_URL')}/support`,
      },
      priority: EmailPriority.HIGH,
      tags: ['security', 'transactional'],
    });
  }

  async sendPostPublishedNotification(
    userEmail: string,
    userName: string,
    caption: string,
    permalink: string,
  ): Promise<void> {
    await this.sendEmail({
      to: userEmail,
      subject: 'Your Instagram post was published',
      template: EmailTemplate.POST_PUBLISHED,
      context: {
        userName,
        caption,
        permalink,
      },
      priority: EmailPriority.NORMAL,
      tags: ['notification', 'post-published'],
    });
  }

  async sendPostFailedNotification(
    userEmail: string,
    userName: string,
    caption: string,
    errorMessage: string,
  ): Promise<void> {
    await this.sendEmail({
      to: userEmail,
      subject: 'Failed to publish your Instagram post',
      template: EmailTemplate.POST_FAILED,
      context: {
        userName,
        caption,
        errorMessage,
        supportUrl: `${this.configService.get('APP_URL')}/support`,
      },
      priority: EmailPriority.HIGH,
      tags: ['notification', 'post-failed'],
    });
  }

  async getBulkJobStatus(jobIds: string[]) {
    const jobs = await Promise.all(jobIds.map((id) => this.queue.getJob(id)));

    return jobs.map((job) => {
      if (!job) return null;

      return {
        id: job.id,
        state: job.getState(),
        progress: job.progress,
        attemptsMade: job.attemptsMade,
        finishedOn: job.finishedOn,
      };
    });
  }

  getQueue() {
    return this.queue;
  }
}

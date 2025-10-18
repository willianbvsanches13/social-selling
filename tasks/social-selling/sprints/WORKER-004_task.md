# WORKER-004: Email Notification Worker

## Epic
Background Workers & Job Processing

## Story
As a system administrator, I need a reliable background worker that processes email notifications from a queue, uses a template system for consistent branding, integrates with SMTP providers (SendGrid/Mailgun), sends transactional emails (welcome, password reset, notifications), tracks delivery, handles bounces and complaints, and retries failed emails with appropriate strategies.

## Priority
P0 - Critical

## Estimated Effort
13 Story Points (Large)

## Dependencies
- PostgreSQL database with email logs table
- Redis for BullMQ
- BullMQ library installed
- SMTP provider account (SendGrid or Mailgun)
- Email templates designed

## Technical Context

### Technology Stack
- **Queue System**: BullMQ 5.x with Redis
- **Worker Runtime**: Node.js 20.x with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Template Engine**: Handlebars 4.x
- **Email Provider**: SendGrid or Mailgun
- **HTML Email**: MJML for responsive emails
- **Logging**: Winston/Pino
- **Monitoring**: Bull Board UI

### Architecture Overview
```
┌─────────────────┐
│  Application    │
│  Services       │
└────────┬────────┘
         │ Trigger Email
         ▼
┌─────────────────┐
│  Email Queue    │
│  (BullMQ)       │
└────────┬────────┘
         │ Process
         ▼
┌─────────────────┐
│  Email Worker   │
└────┬───┬───┬────┘
     │   │   │
     │   │   └──────────────┐
     │   │                  │
     ▼   ▼                  ▼
┌─────────┐  ┌──────────┐  ┌──────────┐
│Template │  │  SMTP    │  │PostgreSQL│
│ Engine  │  │ Provider │  │   Logs   │
└─────────┘  └──────────┘  └──────────┘
```

### Email Types
- **Transactional**
  - Welcome email
  - Email verification
  - Password reset
  - Account settings changed
  - Two-factor authentication

- **Notifications**
  - Post published successfully
  - Post publishing failed
  - New Instagram comment
  - New Instagram mention
  - New Instagram message
  - Analytics report ready

- **Marketing** (Future)
  - Product updates
  - Feature announcements
  - Tips and best practices

### Queue Design
- **Queue Name**: `email-notifications`
- **Concurrency**: 10 workers
- **Priority**: Critical (1), High (5), Normal (10), Low (20)
- **Retry Strategy**: Max 5 attempts with exponential backoff
- **Job Timeout**: 30 seconds per job
- **Rate Limiting**: Respect provider limits (SendGrid: 100/sec, Mailgun: varies)

## Detailed Requirements

### 1. BullMQ Queue Configuration

#### Queue Setup Module
```typescript
// src/workers/queues/email-notifications.queue.ts

import { Queue, QueueOptions } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum EmailPriority {
  CRITICAL = 1,  // Password reset, 2FA
  HIGH = 5,      // Welcome, verification
  NORMAL = 10,   // Notifications
  LOW = 20,      // Marketing, newsletters
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
  private queue: Queue<EmailJobData, EmailJobResult>;

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

  async sendPasswordChanged(userEmail: string, userName: string): Promise<void> {
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
    const jobs = await Promise.all(
      jobIds.map(id => this.queue.getJob(id))
    );

    return jobs.map(job => {
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
```

### 2. Email Template Service

#### Template Engine
```typescript
// src/workers/services/email-template.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Handlebars from 'handlebars';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as mjml from 'mjml';

export interface RenderedEmail {
  html: string;
  text: string;
  subject: string;
}

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);
  private templateCache = new Map<string, Handlebars.TemplateDelegate>();
  private readonly templateDir: string;

  constructor(private configService: ConfigService) {
    this.templateDir = path.join(process.cwd(), 'src', 'templates', 'emails');
    this.registerHelpers();
  }

  private registerHelpers() {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: Date, format: string) => {
      if (!date) return '';
      // Simple date formatting (can be enhanced with date-fns)
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // URL helper
    Handlebars.registerHelper('url', (path: string) => {
      const baseUrl = this.configService.get('APP_URL');
      return `${baseUrl}${path}`;
    });

    // Conditional helper
    Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    // Truncate helper
    Handlebars.registerHelper('truncate', (str: string, length: number) => {
      if (!str) return '';
      if (str.length <= length) return str;
      return str.substring(0, length) + '...';
    });
  }

  async renderTemplate(
    templateName: string,
    context: Record<string, any>,
  ): Promise<RenderedEmail> {
    try {
      // Add global context
      const fullContext = {
        ...context,
        appName: 'Social Selling',
        appUrl: this.configService.get('APP_URL'),
        supportEmail: this.configService.get('SUPPORT_EMAIL'),
        currentYear: new Date().getFullYear(),
      };

      // Render HTML
      const html = await this.renderHtml(templateName, fullContext);

      // Render text version
      const text = await this.renderText(templateName, fullContext);

      // Get subject from template metadata
      const subject = await this.getSubject(templateName, fullContext);

      return { html, text, subject };

    } catch (error) {
      this.logger.error(`Failed to render template ${templateName}: ${error.message}`, error.stack);
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  private async renderHtml(
    templateName: string,
    context: Record<string, any>,
  ): Promise<string> {
    // Load MJML template
    const mjmlPath = path.join(this.templateDir, templateName, 'template.mjml');
    const mjmlContent = await fs.readFile(mjmlPath, 'utf-8');

    // Compile with Handlebars first
    const mjmlTemplate = Handlebars.compile(mjmlContent);
    const compiledMjml = mjmlTemplate(context);

    // Convert MJML to HTML
    const { html, errors } = mjml(compiledMjml, {
      validationLevel: 'soft',
    });

    if (errors && errors.length > 0) {
      this.logger.warn(`MJML conversion warnings for ${templateName}:`, errors);
    }

    return html;
  }

  private async renderText(
    templateName: string,
    context: Record<string, any>,
  ): Promise<string> {
    const textPath = path.join(this.templateDir, templateName, 'template.txt');

    if (!await fs.pathExists(textPath)) {
      // Generate simple text version from context
      return this.generatePlainText(context);
    }

    const textContent = await fs.readFile(textPath, 'utf-8');
    const textTemplate = Handlebars.compile(textContent);
    return textTemplate(context);
  }

  private async getSubject(
    templateName: string,
    context: Record<string, any>,
  ): Promise<string> {
    const metaPath = path.join(this.templateDir, templateName, 'metadata.json');

    if (!await fs.pathExists(metaPath)) {
      return 'Notification from Social Selling';
    }

    const metadata = await fs.readJson(metaPath);
    const subjectTemplate = Handlebars.compile(metadata.subject);
    return subjectTemplate(context);
  }

  private generatePlainText(context: Record<string, any>): string {
    // Simple plain text generation
    return Object.entries(context)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }

  async previewTemplate(templateName: string, context: Record<string, any>): Promise<string> {
    const rendered = await this.renderTemplate(templateName, context);
    return rendered.html;
  }

  async validateTemplate(templateName: string): Promise<boolean> {
    try {
      const mjmlPath = path.join(this.templateDir, templateName, 'template.mjml');
      const textPath = path.join(this.templateDir, templateName, 'template.txt');
      const metaPath = path.join(this.templateDir, templateName, 'metadata.json');

      const mjmlExists = await fs.pathExists(mjmlPath);
      const metaExists = await fs.pathExists(metaPath);

      if (!mjmlExists || !metaExists) {
        return false;
      }

      // Try to render with sample data
      const sampleContext = { userName: 'Test User', test: true };
      await this.renderTemplate(templateName, sampleContext);

      return true;

    } catch (error) {
      this.logger.error(`Template validation failed for ${templateName}: ${error.message}`);
      return false;
    }
  }
}
```

### 3. SMTP Provider Service

#### SendGrid/Mailgun Integration
```typescript
// src/workers/services/smtp-provider.service.ts

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
    this.provider = this.configService.get('EMAIL_PROVIDER') as 'sendgrid' | 'mailgun';
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
      throw new Error('SENDGRID_API_KEY is not configured');
    }

    sgMail.setApiKey(apiKey);
    this.sendgridClient = sgMail;

    this.logger.log('SendGrid client initialized');
  }

  private initializeMailgun() {
    const apiKey = this.configService.get('MAILGUN_API_KEY');
    const domain = this.configService.get('MAILGUN_DOMAIN');

    if (!apiKey || !domain) {
      throw new Error('MAILGUN_API_KEY or MAILGUN_DOMAIN is not configured');
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
        return await this.sendViaSendGrid(options);
      } else if (this.provider === 'mailgun') {
        return await this.sendViaMailgun(options);
      }

      throw new Error(`Unknown provider: ${this.provider}`);

    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw this.transformError(error);
    }
  }

  private async sendViaSendGrid(options: SendEmailOptions): Promise<SendEmailResult> {
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
      msg.attachments = options.attachments.map(att => ({
        filename: att.filename,
        content: att.content.toString('base64'),
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

  private async sendViaMailgun(options: SendEmailOptions): Promise<SendEmailResult> {
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
      messageData.attachment = options.attachments.map(att => ({
        filename: att.filename,
        data: att.content,
      }));
    }

    const response = await this.mailgunClient.messages.create(domain, messageData);

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

    } catch (error) {
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

    } catch (error) {
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
```

### 4. Email Delivery Tracking Service

#### Delivery & Bounce Handling
```typescript
// src/workers/services/email-tracking.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export enum EmailStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  OPENED = 'OPENED',
  CLICKED = 'CLICKED',
  BOUNCED = 'BOUNCED',
  COMPLAINED = 'COMPLAINED',
  FAILED = 'FAILED',
}

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  template: string;
  status: EmailStatus;
  messageId?: string;
  provider: string;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  bounceReason?: string;
  error?: string;
}

@Injectable()
export class EmailTrackingService {
  private readonly logger = new Logger(EmailTrackingService.name);

  constructor(private prisma: PrismaService) {}

  async logEmailSent(
    to: string | string[],
    subject: string,
    template: string,
    messageId: string,
    provider: string,
  ): Promise<string> {
    const recipients = Array.isArray(to) ? to : [to];

    const log = await this.prisma.emailLog.create({
      data: {
        to: recipients.join(','),
        subject,
        template,
        status: EmailStatus.SENT,
        messageId,
        provider,
        sentAt: new Date(),
      },
    });

    return log.id;
  }

  async logEmailFailed(
    to: string | string[],
    subject: string,
    template: string,
    error: string,
  ): Promise<void> {
    const recipients = Array.isArray(to) ? to : [to];

    await this.prisma.emailLog.create({
      data: {
        to: recipients.join(','),
        subject,
        template,
        status: EmailStatus.FAILED,
        error,
      },
    });
  }

  async updateEmailStatus(
    messageId: string,
    status: EmailStatus,
    metadata?: {
      deliveredAt?: Date;
      openedAt?: Date;
      clickedAt?: Date;
      bouncedAt?: Date;
      bounceReason?: string;
    },
  ): Promise<void> {
    await this.prisma.emailLog.updateMany({
      where: { messageId },
      data: {
        status,
        ...metadata,
      },
    });
  }

  async handleBounce(messageId: string, bounceType: string, reason: string): Promise<void> {
    await this.updateEmailStatus(messageId, EmailStatus.BOUNCED, {
      bouncedAt: new Date(),
      bounceReason: `${bounceType}: ${reason}`,
    });

    // Get email from log
    const log = await this.prisma.emailLog.findFirst({
      where: { messageId },
    });

    if (!log) return;

    // Mark email as bounced in user table
    if (bounceType === 'hard') {
      await this.prisma.user.updateMany({
        where: { email: { in: log.to.split(',') } },
        data: {
          emailBounced: true,
          emailBouncedAt: new Date(),
        },
      });

      this.logger.warn(`Hard bounce for email: ${log.to}`);
    }
  }

  async handleComplaint(messageId: string): Promise<void> {
    await this.updateEmailStatus(messageId, EmailStatus.COMPLAINED);

    const log = await this.prisma.emailLog.findFirst({
      where: { messageId },
    });

    if (!log) return;

    // Mark user as complained (opt-out)
    await this.prisma.user.updateMany({
      where: { email: { in: log.to.split(',') } },
      data: {
        emailOptOut: true,
        emailOptOutAt: new Date(),
      },
    });

    this.logger.warn(`Email complaint received for: ${log.to}`);
  }

  async getEmailStats(days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const stats = await this.prisma.emailLog.groupBy({
      by: ['status'],
      where: {
        sentAt: {
          gte: since,
        },
      },
      _count: true,
    });

    return stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count;
      return acc;
    }, {} as Record<string, number>);
  }

  async getEmailHistory(userId: string, limit: number = 20) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) return [];

    return this.prisma.emailLog.findMany({
      where: {
        to: { contains: user.email },
      },
      take: limit,
      orderBy: {
        sentAt: 'desc',
      },
    });
  }

  async isEmailDeliverable(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        emailBounced: true,
        emailOptOut: true,
      },
    });

    if (!user) return true;

    return !user.emailBounced && !user.emailOptOut;
  }
}
```

### 5. Email Worker Processor

#### Main Email Processor
```typescript
// src/workers/processors/email-notifications.processor.ts

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
    this.defaultFrom = this.configService.get('EMAIL_FROM', 'noreply@socialselling.com');
  }

  async process(job: Job<EmailJobData, EmailJobResult>): Promise<EmailJobResult> {
    const { to, template, context, priority } = job.data;

    this.logger.log(`Processing email job: ${template} to ${to}`);

    const result: EmailJobResult = {
      success: false,
      to,
      provider: this.configService.get('EMAIL_PROVIDER') as 'sendgrid' | 'mailgun',
    };

    try {
      // Step 1: Check if email is deliverable
      await job.updateProgress(10);

      const recipients = Array.isArray(to) ? to : [to];
      const deliverableRecipients = await this.filterDeliverableEmails(recipients);

      if (deliverableRecipients.length === 0) {
        this.logger.warn(`No deliverable recipients for job ${job.id}`);
        result.success = true; // Don't retry
        return result;
      }

      // Step 2: Render email template
      await job.updateProgress(30);

      const rendered = await this.templateService.renderTemplate(template, context);

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
      );

      await job.updateProgress(100);

      result.success = true;
      result.messageId = sendResult.messageId;
      result.sentAt = new Date();

      this.logger.log(`Email sent successfully: ${sendResult.messageId}`);

      return result;

    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);

      // Log failure
      await this.tracking.logEmailFailed(
        to,
        job.data.subject,
        template,
        error.message,
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
      emails.map(async email => {
        const isDeliverable = await this.tracking.isEmailDeliverable(email);
        return isDeliverable ? email : null;
      })
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
    if (error.message?.includes('rate limit') || error.message?.includes('too many requests')) {
      return true;
    }

    // Permanent errors (invalid email, rejected)
    const permanentErrors = [
      'invalid email',
      'does not exist',
      'mailbox unavailable',
      'recipient rejected',
    ];

    return !permanentErrors.some(msg =>
      error.message?.toLowerCase().includes(msg)
    );
  }

  @OnWorkerEvent('active')
  onActive(job: Job<EmailJobData>) {
    this.logger.log(`Email job active: ${job.data.template} to ${job.data.to}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<EmailJobData>, result: EmailJobResult) {
    if (result.success) {
      this.logger.log(`Email sent: ${job.data.template} - Message ID: ${result.messageId}`);
    } else {
      this.logger.warn(`Email job completed with errors: ${result.error?.message}`);
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
```

### 6. Webhook Handler for Provider Events

#### Event Handler Service
```typescript
// src/workers/services/email-webhook-handler.service.ts

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
            await this.tracking.updateEmailStatus(messageId, EmailStatus.DELIVERED, {
              deliveredAt: new Date(event.timestamp * 1000),
            });
            break;

          case 'open':
            await this.tracking.updateEmailStatus(messageId, EmailStatus.OPENED, {
              openedAt: new Date(event.timestamp * 1000),
            });
            break;

          case 'click':
            await this.tracking.updateEmailStatus(messageId, EmailStatus.CLICKED, {
              clickedAt: new Date(event.timestamp * 1000),
            });
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

      } catch (error) {
        this.logger.error(`Failed to process SendGrid event: ${error.message}`);
      }
    }
  }

  async handleMailgunWebhook(event: any): Promise<void> {
    try {
      const messageId = event['message-id'];

      switch (event.event) {
        case 'delivered':
          await this.tracking.updateEmailStatus(messageId, EmailStatus.DELIVERED, {
            deliveredAt: new Date(event.timestamp * 1000),
          });
          break;

        case 'opened':
          await this.tracking.updateEmailStatus(messageId, EmailStatus.OPENED, {
            openedAt: new Date(event.timestamp * 1000),
          });
          break;

        case 'clicked':
          await this.tracking.updateEmailStatus(messageId, EmailStatus.CLICKED, {
            clickedAt: new Date(event.timestamp * 1000),
          });
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

    } catch (error) {
      this.logger.error(`Failed to process Mailgun event: ${error.message}`);
    }
  }
}
```

### 7. Module Configuration

```typescript
// src/workers/email-workers.module.ts

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';

import { EmailNotificationsQueue } from './queues/email-notifications.queue';
import { EmailNotificationsProcessor } from './processors/email-notifications.processor';
import { EmailTemplateService } from './services/email-template.service';
import { SmtpProviderService } from './services/smtp-provider.service';
import { EmailTrackingService } from './services/email-tracking.service';
import { EmailWebhookHandlerService } from './services/email-webhook-handler.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'email-notifications',
    }),
  ],
  providers: [
    EmailNotificationsQueue,
    EmailNotificationsProcessor,
    EmailTemplateService,
    SmtpProviderService,
    EmailTrackingService,
    EmailWebhookHandlerService,
  ],
  exports: [
    EmailNotificationsQueue,
    EmailTemplateService,
    EmailTrackingService,
    EmailWebhookHandlerService,
  ],
})
export class EmailWorkersModule {}
```

## Testing Requirements

### Unit Tests
```typescript
describe('EmailNotificationsProcessor', () => {
  it('should render template and send email', async () => {
    // Test implementation
  });

  it('should filter out bounced emails', async () => {
    // Test implementation
  });

  it('should retry on transient failures', async () => {
    // Test implementation
  });

  it('should not retry on permanent failures', async () => {
    // Test implementation
  });
});
```

## Acceptance Criteria

### Functional Requirements
- [ ] Email queue processes jobs with 10 concurrent workers
- [ ] Templates rendered with Handlebars
- [ ] MJML converts to responsive HTML
- [ ] SendGrid integration working
- [ ] Mailgun integration working
- [ ] Email delivery tracked in database
- [ ] Bounces handled correctly
- [ ] Complaints (spam reports) handled
- [ ] Bounced emails excluded from future sends
- [ ] Opted-out users excluded
- [ ] Attachments supported
- [ ] CC and BCC supported
- [ ] Custom headers supported
- [ ] Email tagging for analytics
- [ ] Retry logic for transient failures
- [ ] No retry for permanent failures
- [ ] Webhooks process delivery events
- [ ] Email stats queryable
- [ ] Email history per user available
- [ ] Template validation working

### Performance Requirements
- [ ] Process 100 emails per second
- [ ] Template rendering <100ms
- [ ] Email sending <500ms
- [ ] Queue lag <1 second
- [ ] No memory leaks

### Monitoring Requirements
- [ ] Send success rate tracked
- [ ] Bounce rate monitored
- [ ] Complaint rate monitored
- [ ] Template rendering errors logged
- [ ] SMTP errors logged with full context

## Related Tasks
- WORKER-001: Instagram Post Publishing Worker
- WORKER-002: Instagram Webhook Processing Worker
- WORKER-003: Instagram Analytics Sync Worker

## References
- [SendGrid API](https://docs.sendgrid.com/api-reference/mail-send/mail-send)
- [Mailgun API](https://documentation.mailgun.com/en/latest/api-sending.html)
- [MJML Documentation](https://mjml.io/documentation/)
- [Handlebars](https://handlebarsjs.com/)

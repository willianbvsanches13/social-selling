import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendVerificationEmail(
    email: string,
    name: string,
    verificationUrl: string,
  ): Promise<void> {
    // TODO: Implement actual email sending with SendGrid/Mailgun
    // For now, just log the verification URL
    this.logger.log(`
      ====================================
      Email Verification Request
      ====================================
      To: ${email}
      Name: ${name}
      Verification URL: ${verificationUrl}
      ====================================
    `);

    // In production, implement with email service:
    // await this.sendEmail({
    //   to: email,
    //   subject: 'Verify your email address',
    //   template: 'email-verification',
    //   context: { name, verificationUrl },
    // });
  }

  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetUrl: string,
  ): Promise<void> {
    this.logger.log(`
      ====================================
      Password Reset Request
      ====================================
      To: ${email}
      Name: ${name}
      Reset URL: ${resetUrl}
      ====================================
    `);
  }
}

import { ConfigService } from '@nestjs/config';
export declare class EmailService {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    sendVerificationEmail(email: string, name: string, verificationUrl: string): Promise<void>;
    sendPasswordResetEmail(email: string, name: string, resetUrl: string): Promise<void>;
}

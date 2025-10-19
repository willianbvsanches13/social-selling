import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Session, DeviceInfo } from '../../../domain/entities/session.entity';
export declare class SessionService implements OnModuleDestroy {
    private readonly configService;
    private readonly redis;
    private readonly sessionPrefix;
    private readonly userSessionsPrefix;
    private readonly oauthStatePrefix;
    constructor(configService: ConfigService);
    onModuleDestroy(): void;
    createSession(userId: string, email: string, deviceInfo: DeviceInfo, ipAddress: string, userAgent: string, permissions?: string[]): Promise<{
        sessionId: string;
        session: Session;
    }>;
    getSession(sessionId: string): Promise<Session | null>;
    private updateSessionActivity;
    validateSession(sessionId: string): Promise<Session>;
    destroySession(sessionId: string): Promise<void>;
    destroyAllUserSessions(userId: string): Promise<void>;
    getUserSessions(userId: string): Promise<Session[]>;
    private enforceConcurrentSessionLimit;
    storeOAuthState(sessionId: string, state: string, provider: 'instagram' | 'whatsapp', redirectUrl: string): Promise<void>;
    verifyOAuthState(state: string): Promise<{
        sessionId: string;
        provider: string;
        redirectUrl: string;
    }>;
    updateSessionPermissions(sessionId: string, permissions: string[]): Promise<void>;
    private getSessionKey;
    private getUserSessionsKey;
    private getOAuthStateKey;
    cleanupExpiredSessions(): Promise<number>;
}

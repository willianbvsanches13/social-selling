import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { SessionService } from './services/session.service';
import { DeviceInfo } from '../../domain/entities/session.entity';
export declare class AuthController {
    private readonly authService;
    private readonly sessionService;
    constructor(authService: AuthService, sessionService: SessionService);
    register(registerDto: RegisterDto): Promise<AuthResponseDto>;
    login(loginDto: LoginDto, ip: string, userAgent: string, res: Response): Promise<AuthResponseDto>;
    refreshToken(refreshTokenDto: RefreshTokenDto): Promise<{
        accessToken: string;
        expiresIn: number;
    }>;
    logout(refreshTokenDto: RefreshTokenDto, req: any, res: Response): Promise<{
        message: string;
    }>;
    getCurrentUser(req: any): Promise<any>;
    getUserSessions(userId: string): Promise<{
        sessions: {
            id: string;
            deviceInfo: DeviceInfo;
            createdAt: Date;
            lastActivityAt: Date;
            ipAddress: string;
        }[];
        total: number;
        maxAllowed: number;
    }>;
    revokeSession(sessionId: string, userId: string): Promise<{
        message: string;
    }>;
    private parseDeviceInfo;
    private detectBrowser;
    private detectOS;
}

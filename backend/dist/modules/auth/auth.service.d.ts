import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, JwtTokenPair } from './interfaces/jwt-payload.interface';
import { User } from '../../domain/entities/user.entity';
import { SessionService } from './services/session.service';
import { DeviceInfo } from '../../domain/entities/session.entity';
export declare class AuthService {
    private readonly userRepository;
    private readonly jwtService;
    private readonly configService;
    private readonly sessionService;
    private readonly bcryptRounds;
    constructor(userRepository: IUserRepository, jwtService: JwtService, configService: ConfigService, sessionService: SessionService);
    register(registerDto: RegisterDto): Promise<JwtTokenPair & {
        user: any;
    }>;
    login(loginDto: LoginDto, ip: string, userAgent: string, deviceInfo: DeviceInfo): Promise<JwtTokenPair & {
        user: any;
        sessionId: string;
    }>;
    refreshAccessToken(refreshToken: string): Promise<{
        accessToken: string;
        expiresIn: number;
    }>;
    logout(refreshToken: string, sessionId?: string): Promise<void>;
    validateUser(payload: JwtPayload): Promise<User>;
    private generateTokenPair;
    private generateAccessToken;
    private generateRefreshToken;
    private hashToken;
    private getTokenExpirationSeconds;
    private sanitizeUser;
}

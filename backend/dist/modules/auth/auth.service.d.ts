import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, JwtTokenPair } from './interfaces/jwt-payload.interface';
import { User } from '../../domain/entities/user.entity';
export declare class AuthService {
    private readonly userRepository;
    private readonly jwtService;
    private readonly configService;
    private readonly bcryptRounds;
    constructor(userRepository: IUserRepository, jwtService: JwtService, configService: ConfigService);
    register(registerDto: RegisterDto): Promise<JwtTokenPair & {
        user: any;
    }>;
    login(loginDto: LoginDto, ip: string): Promise<JwtTokenPair & {
        user: any;
    }>;
    refreshAccessToken(refreshToken: string): Promise<{
        accessToken: string;
        expiresIn: number;
    }>;
    logout(refreshToken: string): Promise<void>;
    validateUser(payload: JwtPayload): Promise<User>;
    private generateTokenPair;
    private generateAccessToken;
    private generateRefreshToken;
    private hashToken;
    private getTokenExpirationSeconds;
    private sanitizeUser;
}

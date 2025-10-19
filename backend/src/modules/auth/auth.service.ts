import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, JwtTokenPair } from './interfaces/jwt-payload.interface';
import { User, SubscriptionTier } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { SessionService } from './services/session.service';
import { DeviceInfo } from '../../domain/entities/session.entity';

@Injectable()
export class AuthService {
  private readonly bcryptRounds = 12;

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
  ) {}

  async register(
    registerDto: RegisterDto,
  ): Promise<JwtTokenPair & { user: any }> {
    const existingUser = await this.userRepository.findByEmail(
      registerDto.email,
    );
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(
      registerDto.password,
      this.bcryptRounds,
    );
    const email = new Email(registerDto.email);

    const user = User.create({
      email,
      passwordHash,
      name: registerDto.name,
      timezone: 'America/Sao_Paulo',
      language: 'pt-BR',
      subscriptionTier: SubscriptionTier.FREE,
      emailVerified: false,
    });

    const createdUser = await this.userRepository.create(user);
    const tokens = await this.generateTokenPair(createdUser);

    return {
      user: this.sanitizeUser(createdUser),
      ...tokens,
    };
  }

  async login(
    loginDto: LoginDto,
    ip: string,
    userAgent: string,
    deviceInfo: DeviceInfo,
  ): Promise<JwtTokenPair & { user: any; sessionId: string }> {
    const user = await this.userRepository.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.userRepository.updateLastLogin(user.id, ip);

    // Create session
    const { sessionId } = await this.sessionService.createSession(
      user.id,
      user.email.value,
      deviceInfo,
      ip,
      userAgent,
      ['user'], // Basic permissions
    );

    const tokens = await this.generateTokenPair(user);

    return {
      user: this.sanitizeUser(user),
      sessionId,
      ...tokens,
    };
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch (_error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.userRepository.findRefreshToken(tokenHash);
    if (!storedToken) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const accessToken = this.generateAccessToken(user);
    const expiresIn = this.getTokenExpirationSeconds(
      this.configService.get<string>('jwt.expiresIn', '24h'),
    );

    return { accessToken, expiresIn };
  }

  async logout(refreshToken: string, sessionId?: string): Promise<void> {
    // Revoke refresh token
    const tokenHash = this.hashToken(refreshToken);
    await this.userRepository.revokeRefreshToken(tokenHash);

    // Destroy session if provided
    if (sessionId) {
      await this.sessionService.destroySession(sessionId);
    }
  }

  async validateUser(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  private async generateTokenPair(user: User): Promise<JwtTokenPair> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.userRepository.storeRefreshToken(user.id, tokenHash, expiresAt);

    const expiresIn = this.getTokenExpirationSeconds(
      this.configService.get<string>('jwt.expiresIn', '24h'),
    );

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  private generateAccessToken(user: User): string {
    const expiresIn = this.configService.get<string>('jwt.expiresIn', '24h');
    const expirationSeconds = this.getTokenExpirationSeconds(expiresIn);

    const payload: Omit<JwtPayload, 'exp' | 'iat'> = {
      sub: user.id,
      email: user.email.value,
      type: 'access',
    };

    return this.jwtService.sign(payload as Record<string, any>, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: expirationSeconds,
    });
  }

  private generateRefreshToken(user: User): string {
    const expiresIn = this.configService.get<string>(
      'jwt.refreshExpiresIn',
      '7d',
    );
    const expirationSeconds = this.getTokenExpirationSeconds(expiresIn);

    const payload: Omit<JwtPayload, 'exp' | 'iat'> = {
      sub: user.id,
      email: user.email.value,
      type: 'refresh',
    };

    return this.jwtService.sign(payload as Record<string, any>, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: expirationSeconds,
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private getTokenExpirationSeconds(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 86400;

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return value * (multipliers[unit] || 1);
  }

  private sanitizeUser(user: User): any {
    const json = user.toJSON();
    return {
      id: json.id,
      email: json.email,
      name: json.name,
      emailVerified: json.emailVerified,
    };
  }
}

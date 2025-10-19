import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Ip,
  UseGuards,
  Get,
  Request,
  Headers,
  Res,
  Delete,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SessionService } from './services/session.service';
import { SessionGuard } from '../../common/guards/session.guard';
import { GetUserId, GetSession } from '../../common/decorators/session.decorator';
import { Session, DeviceInfo } from '../../domain/entities/session.entity';
import { SESSION_CONFIG } from './config/session.config';
import { v4 as uuidv4 } from 'uuid';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    // Parse device info from user agent
    const deviceInfo: DeviceInfo = this.parseDeviceInfo(userAgent);

    const result = await this.authService.login(loginDto, ip, userAgent, deviceInfo);

    // Set session cookie
    res.cookie(SESSION_CONFIG.cookieName, result.sessionId, {
      httpOnly: SESSION_CONFIG.cookieHttpOnly,
      secure: SESSION_CONFIG.cookieSecure,
      sameSite: SESSION_CONFIG.cookieSameSite,
      maxAge: SESSION_CONFIG.ttl * 1000, // Convert to milliseconds
      path: '/',
    });

    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Extract session ID from cookie
    const sessionId = req.cookies?.[SESSION_CONFIG.cookieName];

    await this.authService.logout(refreshTokenDto.refreshToken, sessionId);

    // Clear session cookie
    res.clearCookie(SESSION_CONFIG.cookieName, { path: '/' });

    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Request() req: any) {
    return req.user.toJSON();
  }

  @Get('sessions')
  @UseGuards(SessionGuard)
  async getUserSessions(@GetUserId() userId: string) {
    const sessions = await this.sessionService.getUserSessions(userId);

    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        deviceInfo: session.deviceInfo,
        createdAt: session.createdAt,
        lastActivityAt: session.lastActivityAt,
        ipAddress: session.ipAddress,
      })),
      total: sessions.length,
      maxAllowed: SESSION_CONFIG.maxConcurrentSessions,
    };
  }

  @Delete('sessions/:sessionId')
  @UseGuards(SessionGuard)
  async revokeSession(
    @Param('sessionId') sessionId: string,
    @GetUserId() userId: string,
  ) {
    // Verify session belongs to user
    const session = await this.sessionService.getSession(sessionId);
    if (!session || session.userId !== userId) {
      throw new UnauthorizedException('Session not found');
    }

    await this.sessionService.destroySession(sessionId);

    return { message: 'Session revoked successfully' };
  }

  private parseDeviceInfo(userAgent: string): DeviceInfo {
    // Simple device info parsing
    const isMobile = /mobile/i.test(userAgent);
    const isTablet = /tablet|ipad/i.test(userAgent);

    let platform = 'web';
    if (isMobile) platform = 'mobile';
    if (isTablet) platform = 'tablet';

    return {
      deviceId: uuidv4(),
      deviceName: userAgent.substring(0, 50),
      platform,
      browser: this.detectBrowser(userAgent),
      os: this.detectOS(userAgent),
    };
  }

  private detectBrowser(userAgent: string): string {
    if (/chrome|chromium|crios/i.test(userAgent)) return 'Chrome';
    if (/firefox|fxios/i.test(userAgent)) return 'Firefox';
    if (/safari/i.test(userAgent)) return 'Safari';
    if (/opr\//i.test(userAgent)) return 'Opera';
    if (/edg/i.test(userAgent)) return 'Edge';
    return 'Unknown';
  }

  private detectOS(userAgent: string): string {
    if (/windows/i.test(userAgent)) return 'Windows';
    if (/mac/i.test(userAgent)) return 'MacOS';
    if (/linux/i.test(userAgent)) return 'Linux';
    if (/android/i.test(userAgent)) return 'Android';
    if (/ios|iphone|ipad/i.test(userAgent)) return 'iOS';
    return 'Unknown';
  }
}

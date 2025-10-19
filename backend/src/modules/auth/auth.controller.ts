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
import { ApiTags, ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
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
import { ApiDoc } from '../../common/decorators/api-doc.decorator';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiDoc({
    summary: 'Register a new user account',
    description: 'Creates a new user account with email and password',
    body: RegisterDto,
    responses: [
      {
        status: 201,
        description: 'User successfully registered',
        type: AuthResponseDto,
      },
      {
        status: 400,
        description: 'Invalid input data or email already exists',
      },
      {
        status: 429,
        description: 'Too many registration attempts',
      },
    ],
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Login with email and password',
    description:
      'Authenticates user and returns JWT access token, refresh token, and sets session cookie',
    body: LoginDto,
    responses: [
      {
        status: 200,
        description: 'Login successful',
        type: AuthResponseDto,
      },
      {
        status: 401,
        description: 'Invalid credentials',
      },
      {
        status: 429,
        description: 'Too many login attempts',
      },
    ],
  })
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
  @ApiDoc({
    summary: 'Refresh access token',
    description: 'Generates a new access token using a valid refresh token',
    body: RefreshTokenDto,
    responses: [
      {
        status: 200,
        description: 'Token refreshed successfully',
        type: AuthResponseDto,
      },
      {
        status: 401,
        description: 'Invalid or expired refresh token',
      },
    ],
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiDoc({
    summary: 'Logout user',
    description: 'Invalidates refresh token and clears session cookie',
    body: RefreshTokenDto,
    responses: [
      {
        status: 200,
        description: 'Logged out successfully',
      },
      {
        status: 401,
        description: 'Unauthorized - Invalid or missing token',
      },
    ],
  })
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
  @ApiBearerAuth('bearerAuth')
  @ApiDoc({
    summary: 'Get current user profile',
    description: 'Returns the profile of the authenticated user',
    responses: [
      {
        status: 200,
        description: 'User profile retrieved successfully',
      },
      {
        status: 401,
        description: 'Unauthorized - Invalid or missing token',
      },
    ],
  })
  async getCurrentUser(@Request() req: any) {
    return req.user.toJSON();
  }

  @Get('sessions')
  @UseGuards(SessionGuard)
  @ApiCookieAuth('cookieAuth')
  @ApiDoc({
    summary: 'Get user sessions',
    description: 'Returns list of all active sessions for the authenticated user',
    responses: [
      {
        status: 200,
        description: 'Sessions retrieved successfully',
      },
      {
        status: 401,
        description: 'Unauthorized - Invalid or missing session',
      },
    ],
  })
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
  @ApiCookieAuth('cookieAuth')
  @ApiDoc({
    summary: 'Revoke a session',
    description: 'Revokes a specific session by ID',
    pathParams: [{ name: 'sessionId', description: 'Session ID to revoke' }],
    responses: [
      {
        status: 200,
        description: 'Session revoked successfully',
      },
      {
        status: 401,
        description: 'Unauthorized - Session not found or does not belong to user',
      },
    ],
  })
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

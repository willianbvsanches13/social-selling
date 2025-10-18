# BE-006: Session Management (Redis)

**Priority:** P1 (High)
**Effort:** 3 hours
**Day:** 5
**Dependencies:** BE-004 (Authentication Module), INFRA-004 (Redis Cache Configuration)
**Domain:** Backend Core

---

## Overview

Implement Redis-backed session management for storing user sessions, OAuth state, and concurrent session limiting. This task provides a robust session layer for authentication, token management, and real-time user state tracking.

---

## Data Models

### Session Entity

```typescript
// File: /backend/src/domain/entities/session.entity.ts

export interface Session {
  id: string; // Session ID (UUID)
  userId: string; // User UUID
  email: string;
  deviceInfo: DeviceInfo;
  permissions: string[];
  oauthState?: OAuthState;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  ipAddress: string;
  userAgent: string;
}

export interface DeviceInfo {
  deviceId: string; // Unique device identifier
  deviceName: string; // e.g., "Chrome on MacOS"
  platform: string; // 'web' | 'mobile' | 'desktop'
  browser?: string;
  os?: string;
}

export interface OAuthState {
  state: string; // Random state string
  provider: 'instagram' | 'whatsapp';
  redirectUrl: string;
  createdAt: Date;
  expiresAt: Date;
}
```

### Session Configuration

```typescript
// File: /backend/src/modules/auth/config/session.config.ts

export interface SessionConfig {
  ttl: number; // Session TTL in seconds (default: 86400 = 24 hours)
  maxConcurrentSessions: number; // Max sessions per user (default: 5)
  renewalThreshold: number; // Renew session if < N seconds remaining (default: 3600)
  cookieName: string; // Session cookie name
  cookieSecure: boolean; // HTTPS only
  cookieHttpOnly: boolean; // Prevent XSS
  cookieSameSite: 'strict' | 'lax' | 'none';
}

export const SESSION_CONFIG: SessionConfig = {
  ttl: 86400, // 24 hours
  maxConcurrentSessions: 5,
  renewalThreshold: 3600, // 1 hour
  cookieName: 'ssell_session',
  cookieSecure: process.env.NODE_ENV === 'production',
  cookieHttpOnly: true,
  cookieSameSite: 'lax',
};
```

---

## Implementation Approach

### Phase 1: Redis Session Service (1.5 hours)

```typescript
// File: /backend/src/modules/auth/services/session.service.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { Session, DeviceInfo, OAuthState } from '../../../domain/entities/session.entity';
import { SESSION_CONFIG } from '../config/session.config';

@Injectable()
export class SessionService {
  private readonly redis: Redis;
  private readonly sessionPrefix = 'session:';
  private readonly userSessionsPrefix = 'user_sessions:';
  private readonly oauthStatePrefix = 'oauth_state:';

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: 0,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
  }

  /**
   * Create new session for user
   */
  async createSession(
    userId: string,
    email: string,
    deviceInfo: DeviceInfo,
    ipAddress: string,
    userAgent: string,
    permissions: string[] = [],
  ): Promise<{ sessionId: string; session: Session }> {
    // Check concurrent session limit
    await this.enforceConcurrentSessionLimit(userId);

    // Generate session ID
    const sessionId = uuidv4();

    // Create session object
    const session: Session = {
      id: sessionId,
      userId,
      email,
      deviceInfo,
      permissions,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + SESSION_CONFIG.ttl * 1000),
      lastActivityAt: new Date(),
      ipAddress,
      userAgent,
    };

    // Store session in Redis
    const sessionKey = this.getSessionKey(sessionId);
    await this.redis.setex(
      sessionKey,
      SESSION_CONFIG.ttl,
      JSON.stringify(session),
    );

    // Track session in user's session list
    const userSessionsKey = this.getUserSessionsKey(userId);
    await this.redis.sadd(userSessionsKey, sessionId);
    await this.redis.expire(userSessionsKey, SESSION_CONFIG.ttl);

    return { sessionId, session };
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const sessionKey = this.getSessionKey(sessionId);
    const sessionData = await this.redis.get(sessionKey);

    if (!sessionData) {
      return null;
    }

    const session: Session = JSON.parse(sessionData);

    // Check if session expired
    if (new Date(session.expiresAt) < new Date()) {
      await this.destroySession(sessionId);
      return null;
    }

    // Update last activity
    await this.updateSessionActivity(sessionId, session);

    return session;
  }

  /**
   * Update session activity timestamp and renew if needed
   */
  private async updateSessionActivity(sessionId: string, session: Session): Promise<void> {
    const now = new Date();
    session.lastActivityAt = now;

    const timeRemaining = Math.floor(
      (new Date(session.expiresAt).getTime() - now.getTime()) / 1000,
    );

    // Renew session if less than renewal threshold
    if (timeRemaining < SESSION_CONFIG.renewalThreshold) {
      session.expiresAt = new Date(Date.now() + SESSION_CONFIG.ttl * 1000);

      const sessionKey = this.getSessionKey(sessionId);
      await this.redis.setex(
        sessionKey,
        SESSION_CONFIG.ttl,
        JSON.stringify(session),
      );
    } else {
      // Just update activity timestamp
      const sessionKey = this.getSessionKey(sessionId);
      await this.redis.set(sessionKey, JSON.stringify(session), 'KEEPTTL');
    }
  }

  /**
   * Validate session and return session data
   */
  async validateSession(sessionId: string): Promise<Session> {
    const session = await this.getSession(sessionId);

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    return session;
  }

  /**
   * Destroy session
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);

    if (session) {
      // Remove from user's session list
      const userSessionsKey = this.getUserSessionsKey(session.userId);
      await this.redis.srem(userSessionsKey, sessionId);
    }

    // Delete session
    const sessionKey = this.getSessionKey(sessionId);
    await this.redis.del(sessionKey);
  }

  /**
   * Destroy all sessions for a user
   */
  async destroyAllUserSessions(userId: string): Promise<void> {
    const userSessionsKey = this.getUserSessionsKey(userId);
    const sessionIds = await this.redis.smembers(userSessionsKey);

    if (sessionIds.length > 0) {
      // Delete all sessions
      const sessionKeys = sessionIds.map((id) => this.getSessionKey(id));
      await this.redis.del(...sessionKeys);

      // Clear user sessions set
      await this.redis.del(userSessionsKey);
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    const userSessionsKey = this.getUserSessionsKey(userId);
    const sessionIds = await this.redis.smembers(userSessionsKey);

    const sessions: Session[] = [];

    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Enforce concurrent session limit
   */
  private async enforceConcurrentSessionLimit(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);

    if (sessions.length >= SESSION_CONFIG.maxConcurrentSessions) {
      // Sort by last activity (oldest first)
      sessions.sort(
        (a, b) =>
          new Date(a.lastActivityAt).getTime() - new Date(b.lastActivityAt).getTime(),
      );

      // Remove oldest session
      const oldestSession = sessions[0];
      await this.destroySession(oldestSession.id);
    }
  }

  /**
   * Store OAuth state in session
   */
  async storeOAuthState(
    sessionId: string,
    state: string,
    provider: 'instagram' | 'whatsapp',
    redirectUrl: string,
  ): Promise<void> {
    const session = await this.validateSession(sessionId);

    const oauthState: OAuthState = {
      state,
      provider,
      redirectUrl,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 600000), // 10 minutes
    };

    session.oauthState = oauthState;

    const sessionKey = this.getSessionKey(sessionId);
    await this.redis.set(sessionKey, JSON.stringify(session), 'KEEPTTL');

    // Also store OAuth state separately for quick lookup
    const oauthStateKey = this.getOAuthStateKey(state);
    await this.redis.setex(
      oauthStateKey,
      600, // 10 minutes
      JSON.stringify({ sessionId, provider, redirectUrl }),
    );
  }

  /**
   * Verify OAuth state
   */
  async verifyOAuthState(
    state: string,
  ): Promise<{ sessionId: string; provider: string; redirectUrl: string }> {
    const oauthStateKey = this.getOAuthStateKey(state);
    const stateData = await this.redis.get(oauthStateKey);

    if (!stateData) {
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }

    const { sessionId, provider, redirectUrl } = JSON.parse(stateData);

    // Delete OAuth state after verification (one-time use)
    await this.redis.del(oauthStateKey);

    return { sessionId, provider, redirectUrl };
  }

  /**
   * Update session permissions
   */
  async updateSessionPermissions(
    sessionId: string,
    permissions: string[],
  ): Promise<void> {
    const session = await this.validateSession(sessionId);
    session.permissions = permissions;

    const sessionKey = this.getSessionKey(sessionId);
    await this.redis.set(sessionKey, JSON.stringify(session), 'KEEPTTL');
  }

  /**
   * Helper: Get session Redis key
   */
  private getSessionKey(sessionId: string): string {
    return `${this.sessionPrefix}${sessionId}`;
  }

  /**
   * Helper: Get user sessions Redis key
   */
  private getUserSessionsKey(userId: string): string {
    return `${this.userSessionsPrefix}${userId}`;
  }

  /**
   * Helper: Get OAuth state Redis key
   */
  private getOAuthStateKey(state: string): string {
    return `${this.oauthStatePrefix}${state}`;
  }

  /**
   * Cleanup expired sessions (background job)
   */
  async cleanupExpiredSessions(): Promise<number> {
    let cleanedCount = 0;
    const cursor = '0';
    const pattern = `${this.sessionPrefix}*`;

    // Scan for all session keys
    const stream = this.redis.scanStream({
      match: pattern,
      count: 100,
    });

    stream.on('data', async (keys: string[]) => {
      for (const key of keys) {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session: Session = JSON.parse(sessionData);
          if (new Date(session.expiresAt) < new Date()) {
            await this.destroySession(session.id);
            cleanedCount++;
          }
        }
      }
    });

    return new Promise((resolve) => {
      stream.on('end', () => resolve(cleanedCount));
    });
  }
}
```

### Phase 2: Session Decorator (30 minutes)

```typescript
// File: /backend/src/common/decorators/session.decorator.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Session } from '../../domain/entities/session.entity';

export const GetSession = createParamDecorator(
  (data: keyof Session | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const session: Session = request.session;

    if (!session) {
      return null;
    }

    return data ? session[data] : session;
  },
);

export const GetUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const session: Session = request.session;
    return session?.userId;
  },
);
```

### Phase 3: Session Guard and Interceptor (1 hour)

```typescript
// File: /backend/src/common/guards/session.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionService } from '../../modules/auth/services/session.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extract session ID from cookie or header
    const sessionId =
      request.cookies?.ssell_session ||
      request.headers['x-session-id'];

    if (!sessionId) {
      throw new UnauthorizedException('No session found');
    }

    try {
      // Validate and retrieve session
      const session = await this.sessionService.validateSession(sessionId);

      // Attach session to request
      request.session = session;
      request.user = {
        id: session.userId,
        email: session.email,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
```

```typescript
// File: /backend/src/common/interceptors/session.interceptor.ts

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SessionService } from '../../modules/auth/services/session.service';

@Injectable()
export class SessionInterceptor implements NestInterceptor {
  constructor(private readonly sessionService: SessionService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      tap(() => {
        // Set session cookie if session created
        if (request.newSession) {
          response.cookie('ssell_session', request.newSession.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 86400000, // 24 hours
            path: '/',
          });
        }
      }),
    );
  }
}
```

### Phase 4: Update Auth Service to Use Sessions (30 minutes)

```typescript
// File: /backend/src/modules/auth/auth.service.ts (UPDATE)

import { SessionService } from './services/session.service';
import { DeviceInfo } from '../../domain/entities/session.entity';

@Injectable()
export class AuthService {
  // ... existing code ...

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService, // ADD THIS
  ) {}

  async login(
    loginDto: LoginDto,
    ip: string,
    userAgent: string,
    deviceInfo: DeviceInfo,
  ): Promise<JwtTokenPair & { user: Partial<User>; sessionId: string }> {
    // ... existing login logic ...

    // Create session
    const { sessionId, session } = await this.sessionService.createSession(
      user.id,
      user.email,
      deviceInfo,
      ip,
      userAgent,
      ['user'], // Basic permissions
    );

    // Generate tokens
    const tokens = await this.generateTokenPair(user);

    return {
      user: this.sanitizeUser(user),
      sessionId,
      ...tokens,
    };
  }

  async logout(sessionId: string, refreshToken: string): Promise<void> {
    // Destroy session
    await this.sessionService.destroySession(sessionId);

    // Revoke refresh token
    const tokenHash = this.hashToken(refreshToken);
    await this.userRepository.revokeRefreshToken(tokenHash);
  }
}
```

---

## API Integration Examples

### Login with Session

```typescript
// File: /backend/src/modules/auth/auth.controller.ts (UPDATE)

@Post('login')
@HttpCode(HttpStatus.OK)
async login(
  @Body() loginDto: LoginDto,
  @Ip() ip: string,
  @Headers('user-agent') userAgent: string,
  @Req() req,
  @Res({ passthrough: true }) res,
) {
  // Parse device info from user agent
  const deviceInfo: DeviceInfo = this.parseDeviceInfo(userAgent);

  const result = await this.authService.login(loginDto, ip, userAgent, deviceInfo);

  // Set session cookie
  res.cookie('ssell_session', result.sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400000, // 24 hours
    path: '/',
  });

  return result;
}

private parseDeviceInfo(userAgent: string): DeviceInfo {
  // Simple device info parsing (use user-agent library for production)
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
```

### Get Active Sessions

```typescript
@Get('sessions')
@UseGuards(SessionGuard)
@ApiBearerAuth()
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
```

### Revoke Session

```typescript
@Delete('sessions/:sessionId')
@UseGuards(SessionGuard)
@ApiBearerAuth()
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
```

---

## Files to Create

```
/backend/src/
├── modules/
│   └── auth/
│       ├── services/
│       │   └── session.service.ts
│       ├── config/
│       │   └── session.config.ts
│       └── auth.service.ts (UPDATE)
├── domain/
│   └── entities/
│       └── session.entity.ts
├── common/
│   ├── decorators/
│   │   └── session.decorator.ts
│   ├── guards/
│   │   └── session.guard.ts
│   └── interceptors/
│       └── session.interceptor.ts
```

---

## Dependencies

**Prerequisites:**
- BE-004 (Authentication Module working)
- INFRA-004 (Redis operational)

**Blocks:**
- IG-001 (Instagram OAuth - needs OAuth state storage)
- FE-002 (Frontend auth - needs session management)

---

## Acceptance Criteria

- [ ] Session created on login and stored in Redis
- [ ] Session ID returned to client and stored in HTTP-only cookie
- [ ] Session validated on protected routes via SessionGuard
- [ ] Session expires after 24 hours of inactivity
- [ ] Session automatically renewed if < 1 hour remaining
- [ ] Logout destroys session in Redis
- [ ] OAuth state stored and retrieved from session
- [ ] Concurrent session limit enforced (max 5 devices per user)
- [ ] Can list all active sessions for a user
- [ ] Can revoke individual session by ID
- [ ] Can revoke all sessions for a user
- [ ] Session includes device info (browser, OS, platform)
- [ ] Session tracks last activity timestamp
- [ ] Session stores user permissions
- [ ] All session operations use Redis (no database queries)
- [ ] Session TTL managed automatically by Redis
- [ ] Expired sessions cleaned up automatically
- [ ] All tests passing (unit tests for SessionService)

---

## Testing Procedure

```bash
# 1. Login and create session
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'

# Expected: 200 OK with session cookie set

# 2. Access protected route with session cookie
curl -X GET http://localhost:4000/auth/me \
  -b cookies.txt

# Expected: 200 OK with user data

# 3. List active sessions
curl -X GET http://localhost:4000/auth/sessions \
  -b cookies.txt

# Expected: List of active sessions

# 4. Create multiple sessions (simulate multiple devices)
for i in {1..6}; do
  curl -X POST http://localhost:4000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"SecurePass123!"}' &
done

# Expected: 6th session creation removes oldest session (max 5)

# 5. Verify OAuth state storage
curl -X GET "http://localhost:4000/instagram/oauth/authorize" \
  -b cookies.txt

# Expected: Redirect to Instagram with state parameter stored in session

# 6. Logout and destroy session
curl -X POST http://localhost:4000/auth/logout \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<REFRESH_TOKEN>"
  }'

# Expected: 200 OK, session cookie cleared

# 7. Verify session destroyed
curl -X GET http://localhost:4000/auth/me \
  -b cookies.txt

# Expected: 401 Unauthorized

# 8. Test session renewal
# Login, wait 23 hours, make request, verify session renewed

# 9. Test concurrent session limit
# Create 6 sessions, verify oldest removed

# 10. Check Redis session keys
redis-cli
> KEYS session:*
> GET session:<SESSION_ID>
> TTL session:<SESSION_ID>
```

---

## Security Considerations

1. **HTTP-Only Cookies:** Session cookies must have httpOnly flag to prevent XSS attacks
2. **Secure Flag:** Use secure flag in production (HTTPS only)
3. **SameSite:** Set to 'lax' to prevent CSRF attacks
4. **Session Expiration:** Automatic expiration after 24 hours
5. **Session Renewal:** Automatic renewal when < 1 hour remaining
6. **Concurrent Session Limit:** Max 5 sessions per user prevents abuse
7. **OAuth State:** One-time use state token prevents CSRF in OAuth flow
8. **Redis Security:** Password-protected Redis connection
9. **Session Invalidation:** Logout destroys session immediately
10. **Device Tracking:** Track device info for security monitoring

---

## Performance Considerations

1. **Redis Performance:** All session operations are O(1) lookups in Redis
2. **Session Renewal:** Automatic renewal reduces login friction
3. **TTL Management:** Redis handles TTL expiration automatically
4. **Connection Pooling:** Redis client uses connection pooling
5. **Scan Operations:** Use SCAN instead of KEYS for cleanup to avoid blocking

---

## Cost Estimate

- **Infrastructure:** Included in existing Redis setup
- **Time Investment:** 3 hours
- **Total Additional Cost:** $0

---

## Related Documents

- Architecture Design: `/tasks/social-selling/architecture-design.md`
- Implementation Plan: `/tasks/social-selling/implementation-plan.md`
- Previous Tasks: BE-004, INFRA-004
- Next Tasks: IG-001, FE-002

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer

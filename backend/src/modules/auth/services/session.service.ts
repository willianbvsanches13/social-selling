/**
 * Session Service
 * Manages user sessions in Redis with support for:
 * - Session creation and validation
 * - Automatic session renewal
 * - Concurrent session limiting
 * - OAuth state storage
 * - Device tracking
 */

import {
  Injectable,
  UnauthorizedException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import {
  Session,
  DeviceInfo,
  OAuthState,
} from '../../../domain/entities/session.entity';
import { SESSION_CONFIG } from '../config/session.config';

@Injectable()
export class SessionService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly sessionPrefix = 'session:';
  private readonly userSessionsPrefix = 'user_sessions:';
  private readonly oauthStatePrefix = 'oauth_state:';

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      db: 0,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
  }

  onModuleDestroy() {
    this.redis.disconnect();
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

    // Parse dates from JSON
    session.createdAt = new Date(session.createdAt);
    session.expiresAt = new Date(session.expiresAt);
    session.lastActivityAt = new Date(session.lastActivityAt);
    if (session.oauthState) {
      session.oauthState.createdAt = new Date(session.oauthState.createdAt);
      session.oauthState.expiresAt = new Date(session.oauthState.expiresAt);
    }

    // Check if session expired
    if (session.expiresAt < new Date()) {
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
  private async updateSessionActivity(
    sessionId: string,
    session: Session,
  ): Promise<void> {
    const now = new Date();
    session.lastActivityAt = now;

    const timeRemaining = Math.floor(
      (session.expiresAt.getTime() - now.getTime()) / 1000,
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
        (a, b) => a.lastActivityAt.getTime() - b.lastActivityAt.getTime(),
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
          const expiresAt = new Date(session.expiresAt);
          if (expiresAt < new Date()) {
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

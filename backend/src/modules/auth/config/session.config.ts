/**
 * Session Configuration
 * Defines session management settings and cookie configuration
 */

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

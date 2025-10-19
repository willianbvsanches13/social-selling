/**
 * Session Entity
 * Represents a user session stored in Redis
 */

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
  platform: string; // 'web' | 'mobile' | 'tablet' | 'desktop'
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

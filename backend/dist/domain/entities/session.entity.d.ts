export interface Session {
    id: string;
    userId: string;
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
    deviceId: string;
    deviceName: string;
    platform: string;
    browser?: string;
    os?: string;
}
export interface OAuthState {
    state: string;
    provider: 'instagram' | 'whatsapp';
    redirectUrl: string;
    createdAt: Date;
    expiresAt: Date;
}

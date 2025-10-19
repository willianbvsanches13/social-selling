export interface SessionConfig {
    ttl: number;
    maxConcurrentSessions: number;
    renewalThreshold: number;
    cookieName: string;
    cookieSecure: boolean;
    cookieHttpOnly: boolean;
    cookieSameSite: 'strict' | 'lax' | 'none';
}
export declare const SESSION_CONFIG: SessionConfig;

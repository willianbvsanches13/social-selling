"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_CONFIG = void 0;
exports.SESSION_CONFIG = {
    ttl: 86400,
    maxConcurrentSessions: 5,
    renewalThreshold: 3600,
    cookieName: 'ssell_session',
    cookieSecure: process.env.NODE_ENV === 'production',
    cookieHttpOnly: true,
    cookieSameSite: 'lax',
};
//# sourceMappingURL=session.config.js.map
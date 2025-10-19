"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
const uuid_1 = require("uuid");
const session_config_1 = require("../config/session.config");
let SessionService = class SessionService {
    constructor(configService) {
        this.configService = configService;
        this.sessionPrefix = 'session:';
        this.userSessionsPrefix = 'user_sessions:';
        this.oauthStatePrefix = 'oauth_state:';
        this.redis = new ioredis_1.default({
            host: this.configService.get('redis.host'),
            port: this.configService.get('redis.port'),
            password: this.configService.get('redis.password'),
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
    async createSession(userId, email, deviceInfo, ipAddress, userAgent, permissions = []) {
        await this.enforceConcurrentSessionLimit(userId);
        const sessionId = (0, uuid_1.v4)();
        const session = {
            id: sessionId,
            userId,
            email,
            deviceInfo,
            permissions,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + session_config_1.SESSION_CONFIG.ttl * 1000),
            lastActivityAt: new Date(),
            ipAddress,
            userAgent,
        };
        const sessionKey = this.getSessionKey(sessionId);
        await this.redis.setex(sessionKey, session_config_1.SESSION_CONFIG.ttl, JSON.stringify(session));
        const userSessionsKey = this.getUserSessionsKey(userId);
        await this.redis.sadd(userSessionsKey, sessionId);
        await this.redis.expire(userSessionsKey, session_config_1.SESSION_CONFIG.ttl);
        return { sessionId, session };
    }
    async getSession(sessionId) {
        const sessionKey = this.getSessionKey(sessionId);
        const sessionData = await this.redis.get(sessionKey);
        if (!sessionData) {
            return null;
        }
        const session = JSON.parse(sessionData);
        session.createdAt = new Date(session.createdAt);
        session.expiresAt = new Date(session.expiresAt);
        session.lastActivityAt = new Date(session.lastActivityAt);
        if (session.oauthState) {
            session.oauthState.createdAt = new Date(session.oauthState.createdAt);
            session.oauthState.expiresAt = new Date(session.oauthState.expiresAt);
        }
        if (session.expiresAt < new Date()) {
            await this.destroySession(sessionId);
            return null;
        }
        await this.updateSessionActivity(sessionId, session);
        return session;
    }
    async updateSessionActivity(sessionId, session) {
        const now = new Date();
        session.lastActivityAt = now;
        const timeRemaining = Math.floor((session.expiresAt.getTime() - now.getTime()) / 1000);
        if (timeRemaining < session_config_1.SESSION_CONFIG.renewalThreshold) {
            session.expiresAt = new Date(Date.now() + session_config_1.SESSION_CONFIG.ttl * 1000);
            const sessionKey = this.getSessionKey(sessionId);
            await this.redis.setex(sessionKey, session_config_1.SESSION_CONFIG.ttl, JSON.stringify(session));
        }
        else {
            const sessionKey = this.getSessionKey(sessionId);
            await this.redis.set(sessionKey, JSON.stringify(session), 'KEEPTTL');
        }
    }
    async validateSession(sessionId) {
        const session = await this.getSession(sessionId);
        if (!session) {
            throw new common_1.UnauthorizedException('Invalid or expired session');
        }
        return session;
    }
    async destroySession(sessionId) {
        const session = await this.getSession(sessionId);
        if (session) {
            const userSessionsKey = this.getUserSessionsKey(session.userId);
            await this.redis.srem(userSessionsKey, sessionId);
        }
        const sessionKey = this.getSessionKey(sessionId);
        await this.redis.del(sessionKey);
    }
    async destroyAllUserSessions(userId) {
        const userSessionsKey = this.getUserSessionsKey(userId);
        const sessionIds = await this.redis.smembers(userSessionsKey);
        if (sessionIds.length > 0) {
            const sessionKeys = sessionIds.map((id) => this.getSessionKey(id));
            await this.redis.del(...sessionKeys);
            await this.redis.del(userSessionsKey);
        }
    }
    async getUserSessions(userId) {
        const userSessionsKey = this.getUserSessionsKey(userId);
        const sessionIds = await this.redis.smembers(userSessionsKey);
        const sessions = [];
        for (const sessionId of sessionIds) {
            const session = await this.getSession(sessionId);
            if (session) {
                sessions.push(session);
            }
        }
        return sessions;
    }
    async enforceConcurrentSessionLimit(userId) {
        const sessions = await this.getUserSessions(userId);
        if (sessions.length >= session_config_1.SESSION_CONFIG.maxConcurrentSessions) {
            sessions.sort((a, b) => a.lastActivityAt.getTime() - b.lastActivityAt.getTime());
            const oldestSession = sessions[0];
            await this.destroySession(oldestSession.id);
        }
    }
    async storeOAuthState(sessionId, state, provider, redirectUrl) {
        const session = await this.validateSession(sessionId);
        const oauthState = {
            state,
            provider,
            redirectUrl,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 600000),
        };
        session.oauthState = oauthState;
        const sessionKey = this.getSessionKey(sessionId);
        await this.redis.set(sessionKey, JSON.stringify(session), 'KEEPTTL');
        const oauthStateKey = this.getOAuthStateKey(state);
        await this.redis.setex(oauthStateKey, 600, JSON.stringify({ sessionId, provider, redirectUrl }));
    }
    async verifyOAuthState(state) {
        const oauthStateKey = this.getOAuthStateKey(state);
        const stateData = await this.redis.get(oauthStateKey);
        if (!stateData) {
            throw new common_1.UnauthorizedException('Invalid or expired OAuth state');
        }
        const { sessionId, provider, redirectUrl } = JSON.parse(stateData);
        await this.redis.del(oauthStateKey);
        return { sessionId, provider, redirectUrl };
    }
    async updateSessionPermissions(sessionId, permissions) {
        const session = await this.validateSession(sessionId);
        session.permissions = permissions;
        const sessionKey = this.getSessionKey(sessionId);
        await this.redis.set(sessionKey, JSON.stringify(session), 'KEEPTTL');
    }
    getSessionKey(sessionId) {
        return `${this.sessionPrefix}${sessionId}`;
    }
    getUserSessionsKey(userId) {
        return `${this.userSessionsPrefix}${userId}`;
    }
    getOAuthStateKey(state) {
        return `${this.oauthStatePrefix}${state}`;
    }
    async cleanupExpiredSessions() {
        let cleanedCount = 0;
        const pattern = `${this.sessionPrefix}*`;
        const stream = this.redis.scanStream({
            match: pattern,
            count: 100,
        });
        stream.on('data', async (keys) => {
            for (const key of keys) {
                const sessionData = await this.redis.get(key);
                if (sessionData) {
                    const session = JSON.parse(sessionData);
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
};
exports.SessionService = SessionService;
exports.SessionService = SessionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SessionService);
//# sourceMappingURL=session.service.js.map
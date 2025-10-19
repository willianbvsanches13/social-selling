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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const auth_service_1 = require("./auth.service");
const register_dto_1 = require("./dto/register.dto");
const login_dto_1 = require("./dto/login.dto");
const refresh_token_dto_1 = require("./dto/refresh-token.dto");
const auth_response_dto_1 = require("./dto/auth-response.dto");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const session_service_1 = require("./services/session.service");
const session_guard_1 = require("../../common/guards/session.guard");
const session_decorator_1 = require("../../common/decorators/session.decorator");
const session_config_1 = require("./config/session.config");
const uuid_1 = require("uuid");
const api_doc_decorator_1 = require("../../common/decorators/api-doc.decorator");
let AuthController = class AuthController {
    constructor(authService, sessionService) {
        this.authService = authService;
        this.sessionService = sessionService;
    }
    async register(registerDto) {
        return this.authService.register(registerDto);
    }
    async login(loginDto, ip, userAgent, res) {
        const deviceInfo = this.parseDeviceInfo(userAgent);
        const result = await this.authService.login(loginDto, ip, userAgent, deviceInfo);
        res.cookie(session_config_1.SESSION_CONFIG.cookieName, result.sessionId, {
            httpOnly: session_config_1.SESSION_CONFIG.cookieHttpOnly,
            secure: session_config_1.SESSION_CONFIG.cookieSecure,
            sameSite: session_config_1.SESSION_CONFIG.cookieSameSite,
            maxAge: session_config_1.SESSION_CONFIG.ttl * 1000,
            path: '/',
        });
        return result;
    }
    async refreshToken(refreshTokenDto) {
        return this.authService.refreshAccessToken(refreshTokenDto.refreshToken);
    }
    async logout(refreshTokenDto, req, res) {
        const sessionId = req.cookies?.[session_config_1.SESSION_CONFIG.cookieName];
        await this.authService.logout(refreshTokenDto.refreshToken, sessionId);
        res.clearCookie(session_config_1.SESSION_CONFIG.cookieName, { path: '/' });
        return { message: 'Logged out successfully' };
    }
    async getCurrentUser(req) {
        return req.user.toJSON();
    }
    async getUserSessions(userId) {
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
            maxAllowed: session_config_1.SESSION_CONFIG.maxConcurrentSessions,
        };
    }
    async revokeSession(sessionId, userId) {
        const session = await this.sessionService.getSession(sessionId);
        if (!session || session.userId !== userId) {
            throw new common_1.UnauthorizedException('Session not found');
        }
        await this.sessionService.destroySession(sessionId);
        return { message: 'Session revoked successfully' };
    }
    parseDeviceInfo(userAgent) {
        const isMobile = /mobile/i.test(userAgent);
        const isTablet = /tablet|ipad/i.test(userAgent);
        let platform = 'web';
        if (isMobile)
            platform = 'mobile';
        if (isTablet)
            platform = 'tablet';
        return {
            deviceId: (0, uuid_1.v4)(),
            deviceName: userAgent.substring(0, 50),
            platform,
            browser: this.detectBrowser(userAgent),
            os: this.detectOS(userAgent),
        };
    }
    detectBrowser(userAgent) {
        if (/chrome|chromium|crios/i.test(userAgent))
            return 'Chrome';
        if (/firefox|fxios/i.test(userAgent))
            return 'Firefox';
        if (/safari/i.test(userAgent))
            return 'Safari';
        if (/opr\//i.test(userAgent))
            return 'Opera';
        if (/edg/i.test(userAgent))
            return 'Edge';
        return 'Unknown';
    }
    detectOS(userAgent) {
        if (/windows/i.test(userAgent))
            return 'Windows';
        if (/mac/i.test(userAgent))
            return 'MacOS';
        if (/linux/i.test(userAgent))
            return 'Linux';
        if (/android/i.test(userAgent))
            return 'Android';
        if (/ios|iphone|ipad/i.test(userAgent))
            return 'iOS';
        return 'Unknown';
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, api_doc_decorator_1.ApiDoc)({
        summary: 'Register a new user account',
        description: 'Creates a new user account with email and password',
        body: register_dto_1.RegisterDto,
        responses: [
            {
                status: 201,
                description: 'User successfully registered',
                type: auth_response_dto_1.AuthResponseDto,
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
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, api_doc_decorator_1.ApiDoc)({
        summary: 'Login with email and password',
        description: 'Authenticates user and returns JWT access token, refresh token, and sets session cookie',
        body: login_dto_1.LoginDto,
        responses: [
            {
                status: 200,
                description: 'Login successful',
                type: auth_response_dto_1.AuthResponseDto,
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
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Headers)('user-agent')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, api_doc_decorator_1.ApiDoc)({
        summary: 'Refresh access token',
        description: 'Generates a new access token using a valid refresh token',
        body: refresh_token_dto_1.RefreshTokenDto,
        responses: [
            {
                status: 200,
                description: 'Token refreshed successfully',
                type: auth_response_dto_1.AuthResponseDto,
            },
            {
                status: 401,
                description: 'Invalid or expired refresh token',
            },
        ],
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_token_dto_1.RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refreshToken", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('bearerAuth'),
    (0, api_doc_decorator_1.ApiDoc)({
        summary: 'Logout user',
        description: 'Invalidates refresh token and clears session cookie',
        body: refresh_token_dto_1.RefreshTokenDto,
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
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_token_dto_1.RefreshTokenDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('bearerAuth'),
    (0, api_doc_decorator_1.ApiDoc)({
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
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getCurrentUser", null);
__decorate([
    (0, common_1.Get)('sessions'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    (0, swagger_1.ApiCookieAuth)('cookieAuth'),
    (0, api_doc_decorator_1.ApiDoc)({
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
    }),
    __param(0, (0, session_decorator_1.GetUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getUserSessions", null);
__decorate([
    (0, common_1.Delete)('sessions/:sessionId'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    (0, swagger_1.ApiCookieAuth)('cookieAuth'),
    (0, api_doc_decorator_1.ApiDoc)({
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
    }),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, session_decorator_1.GetUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "revokeSession", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Authentication'),
    (0, common_1.Controller)('auth'),
    (0, common_1.UseGuards)(throttler_1.ThrottlerGuard),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        session_service_1.SessionService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map
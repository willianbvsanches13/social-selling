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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const user_repository_interface_1 = require("../../domain/repositories/user.repository.interface");
const user_entity_1 = require("../../domain/entities/user.entity");
const email_vo_1 = require("../../domain/value-objects/email.vo");
const session_service_1 = require("./services/session.service");
let AuthService = class AuthService {
    constructor(userRepository, jwtService, configService, sessionService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.configService = configService;
        this.sessionService = sessionService;
        this.bcryptRounds = 12;
    }
    async register(registerDto) {
        const existingUser = await this.userRepository.findByEmail(registerDto.email);
        if (existingUser) {
            throw new common_1.ConflictException('Email already registered');
        }
        const passwordHash = await bcrypt.hash(registerDto.password, this.bcryptRounds);
        const email = new email_vo_1.Email(registerDto.email);
        const user = user_entity_1.User.create({
            email,
            passwordHash,
            name: registerDto.name,
            timezone: 'America/Sao_Paulo',
            language: 'pt-BR',
            subscriptionTier: user_entity_1.SubscriptionTier.FREE,
            emailVerified: false,
        });
        const createdUser = await this.userRepository.create(user);
        const tokens = await this.generateTokenPair(createdUser);
        return {
            user: this.sanitizeUser(createdUser),
            ...tokens,
        };
    }
    async login(loginDto, ip, userAgent, deviceInfo) {
        const user = await this.userRepository.findByEmail(loginDto.email);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        await this.userRepository.updateLastLogin(user.id, ip);
        const { sessionId } = await this.sessionService.createSession(user.id, user.email.value, deviceInfo, ip, userAgent, ['user']);
        const tokens = await this.generateTokenPair(user);
        return {
            user: this.sanitizeUser(user),
            sessionId,
            ...tokens,
        };
    }
    async refreshAccessToken(refreshToken) {
        let payload;
        try {
            payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('jwt.refreshSecret'),
            });
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const tokenHash = this.hashToken(refreshToken);
        const storedToken = await this.userRepository.findRefreshToken(tokenHash);
        if (!storedToken) {
            throw new common_1.UnauthorizedException('Refresh token revoked or expired');
        }
        const user = await this.userRepository.findById(payload.sub);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        const accessToken = this.generateAccessToken(user);
        const expiresIn = this.getTokenExpirationSeconds(this.configService.get('jwt.expiresIn', '24h'));
        return { accessToken, expiresIn };
    }
    async logout(refreshToken, sessionId) {
        const tokenHash = this.hashToken(refreshToken);
        await this.userRepository.revokeRefreshToken(tokenHash);
        if (sessionId) {
            await this.sessionService.destroySession(sessionId);
        }
    }
    async validateUser(payload) {
        const user = await this.userRepository.findById(payload.sub);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return user;
    }
    async generateTokenPair(user) {
        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user);
        const tokenHash = this.hashToken(refreshToken);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await this.userRepository.storeRefreshToken(user.id, tokenHash, expiresAt);
        const expiresIn = this.getTokenExpirationSeconds(this.configService.get('jwt.expiresIn', '24h'));
        return {
            accessToken,
            refreshToken,
            expiresIn,
        };
    }
    generateAccessToken(user) {
        const expiresIn = this.configService.get('jwt.expiresIn', '24h');
        const expirationSeconds = this.getTokenExpirationSeconds(expiresIn);
        const payload = {
            sub: user.id,
            email: user.email.value,
            type: 'access',
        };
        return this.jwtService.sign(payload, {
            secret: this.configService.get('jwt.secret'),
            expiresIn: expirationSeconds,
        });
    }
    generateRefreshToken(user) {
        const expiresIn = this.configService.get('jwt.refreshExpiresIn', '7d');
        const expirationSeconds = this.getTokenExpirationSeconds(expiresIn);
        const payload = {
            sub: user.id,
            email: user.email.value,
            type: 'refresh',
        };
        return this.jwtService.sign(payload, {
            secret: this.configService.get('jwt.refreshSecret'),
            expiresIn: expirationSeconds,
        });
    }
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    getTokenExpirationSeconds(expiresIn) {
        const match = expiresIn.match(/^(\d+)([smhd])$/);
        if (!match)
            return 86400;
        const value = parseInt(match[1]);
        const unit = match[2];
        const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
        return value * (multipliers[unit] || 1);
    }
    sanitizeUser(user) {
        const json = user.toJSON();
        return {
            id: json.id,
            email: json.email,
            name: json.name,
            emailVerified: json.emailVerified,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(user_repository_interface_1.USER_REPOSITORY)),
    __metadata("design:paramtypes", [Object, jwt_1.JwtService,
        config_1.ConfigService,
        session_service_1.SessionService])
], AuthService);
//# sourceMappingURL=auth.service.js.map
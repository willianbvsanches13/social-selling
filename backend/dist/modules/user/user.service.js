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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const user_repository_interface_1 = require("../../domain/repositories/user.repository.interface");
const email_service_1 = require("../notification/email.service");
let UserService = class UserService {
    constructor(userRepository, emailService, configService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.configService = configService;
    }
    async getProfile(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return user;
    }
    async updateProfile(userId, updateDto) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        user.updateProfile(updateDto.name, updateDto.timezone, updateDto.language);
        const updatedUser = await this.userRepository.update(user);
        return updatedUser;
    }
    async changePassword(userId, changePasswordDto) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        const isValid = await bcrypt.compare(changePasswordDto.currentPassword, user.passwordHash);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
            throw new common_1.BadRequestException('Passwords do not match');
        }
        const newPasswordHash = await bcrypt.hash(changePasswordDto.newPassword, 12);
        user.changePassword(newPasswordHash);
        await this.userRepository.update(user);
        await this.userRepository.revokeAllUserRefreshTokens(userId);
    }
    async sendVerificationEmail(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        if (user.emailVerified) {
            throw new common_1.BadRequestException('Email already verified');
        }
        const token = crypto.randomBytes(32).toString('hex');
        user.setEmailVerificationToken(token);
        await this.userRepository.update(user);
        const appUrl = this.configService.get('APP_URL') || 'http://localhost:3000';
        const verificationUrl = `${appUrl}/verify-email/${token}`;
        await this.emailService.sendVerificationEmail(user.email.value, user.name, verificationUrl);
    }
    async verifyEmail(token) {
        const user = await this.userRepository.findByVerificationToken(token);
        if (!user) {
            throw new common_1.BadRequestException('Invalid or expired verification token');
        }
        user.verifyEmail();
        await this.userRepository.update(user);
    }
    async deleteAccount(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        user.softDelete();
        await this.userRepository.update(user);
        await this.userRepository.revokeAllUserRefreshTokens(userId);
    }
    async getUserStats(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return {
            connectedAccounts: 0,
            totalProducts: 0,
            totalConversations: 0,
            totalMessages: 0,
        };
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(user_repository_interface_1.USER_REPOSITORY)),
    __metadata("design:paramtypes", [Object, email_service_1.EmailService,
        config_1.ConfigService])
], UserService);
//# sourceMappingURL=user.service.js.map
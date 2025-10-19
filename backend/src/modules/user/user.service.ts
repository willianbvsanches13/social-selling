import { Injectable, UnauthorizedException, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { EmailService } from '../notification/email.service';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, updateDto: UpdateProfileDto): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    user.updateProfile(updateDto.name, updateDto.timezone, updateDto.language);

    const updatedUser = await this.userRepository.update(user);
    return updatedUser;
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(changePasswordDto.currentPassword, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Validate new password matches
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(changePasswordDto.newPassword, 12);

    // Update password
    user.changePassword(newPasswordHash);
    await this.userRepository.update(user);

    // Revoke all refresh tokens for security
    await this.userRepository.revokeAllUserRefreshTokens(userId);
  }

  async sendVerificationEmail(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');

    // Store token in user entity
    user.setEmailVerificationToken(token);
    await this.userRepository.update(user);

    // Send email
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const verificationUrl = `${appUrl}/verify-email/${token}`;
    await this.emailService.sendVerificationEmail(user.email.value, user.name, verificationUrl);
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.userRepository.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    user.verifyEmail();
    await this.userRepository.update(user);
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Soft delete
    user.softDelete();
    await this.userRepository.update(user);

    // Revoke all tokens
    await this.userRepository.revokeAllUserRefreshTokens(userId);

    // TODO: Schedule data anonymization job
    // TODO: Delete or anonymize user data in related tables
  }

  async getUserStats(userId: string): Promise<any> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // TODO: Get actual stats from repositories
    // This is a placeholder implementation
    return {
      connectedAccounts: 0,
      totalProducts: 0,
      totalConversations: 0,
      totalMessages: 0,
    };
  }
}

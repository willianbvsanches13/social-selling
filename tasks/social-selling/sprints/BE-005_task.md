# BE-005: User Management Module

**Priority:** P1
**Effort:** 4 hours
**Day:** 5
**Dependencies:** BE-004 (Authentication Module)
**Domain:** Backend Core

---

## Overview

Implement user management module with profile updates, settings management, password change functionality, email verification, and account deletion. Provide admin capabilities for user management and subscription tier updates.

---

## API Endpoints

### GET /users/me

**Description:** Get current user profile

**Response (200 OK):**
```typescript
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "João Silva",
  "timezone": "America/Sao_Paulo",
  "language": "pt-BR",
  "subscriptionTier": "free",
  "emailVerified": true,
  "lastLoginAt": "2025-10-18T10:30:00Z",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

---

### PATCH /users/me

**Description:** Update current user profile

**Request:**
```typescript
{
  "name": "João Silva Updated",
  "timezone": "America/New_York",
  "language": "en-US"
}
```

**Response (200 OK):**
```typescript
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "João Silva Updated",
  "timezone": "America/New_York",
  "language": "en-US",
  "subscriptionTier": "free",
  "emailVerified": true,
  "updatedAt": "2025-10-18T11:00:00Z"
}
```

---

### POST /users/me/change-password

**Description:** Change user password

**Request:**
```typescript
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!",
  "confirmPassword": "NewPass456!"
}
```

**Response (200 OK):**
```typescript
{
  "message": "Password changed successfully"
}
```

**Errors:**
- 401: Current password incorrect
- 400: New password doesn't meet requirements
- 400: Passwords don't match

---

### POST /users/verify-email

**Description:** Send email verification link

**Response (200 OK):**
```typescript
{
  "message": "Verification email sent",
  "email": "user@example.com"
}
```

---

### GET /users/verify-email/:token

**Description:** Verify email with token

**Response (200 OK):**
```typescript
{
  "message": "Email verified successfully",
  "emailVerified": true
}
```

**Errors:**
- 400: Invalid or expired token

---

### DELETE /users/me

**Description:** Soft delete user account

**Response (200 OK):**
```typescript
{
  "message": "Account deleted successfully",
  "deletedAt": "2025-10-18T12:00:00Z"
}
```

---

## Implementation

### User Service

```typescript
// File: /backend/src/modules/user/user.service.ts

import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class UserService {
  constructor(
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

    const updatedUser = await this.userRepository.update(userId, {
      name: updateDto.name,
      timezone: updateDto.timezone,
      language: updateDto.language,
    });

    return updatedUser;
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

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
    await this.userRepository.update(userId, {
      passwordHash: newPasswordHash,
    });

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

    // Store token in database
    await this.userRepository.update(userId, {
      emailVerificationToken: token,
    });

    // Send email
    const verificationUrl = `${this.configService.get('APP_URL')}/verify-email/${token}`;
    await this.emailService.sendVerificationEmail(user.email.value, user.name, verificationUrl);
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.userRepository.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.userRepository.update(user.id, {
      emailVerified: true,
      emailVerificationToken: null,
    });
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Soft delete
    await this.userRepository.delete(userId);

    // Revoke all tokens
    await this.userRepository.revokeAllUserRefreshTokens(userId);

    // TODO: Schedule data anonymization job
  }

  async getUserStats(userId: string): Promise<any> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // TODO: Get actual stats from repositories
    return {
      connectedAccounts: 0,
      totalProducts: 0,
      totalConversations: 0,
      totalMessages: 0,
    };
  }
}
```

### DTOs

```typescript
// File: /backend/src/modules/user/dto/update-profile.dto.ts

import { IsString, IsOptional, MinLength, MaxLength, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ example: 'João Silva' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 'America/Sao_Paulo' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ example: 'pt-BR' })
  @IsOptional()
  @IsString()
  @IsIn(['pt-BR', 'en-US', 'es-ES'])
  language?: string;
}

// File: /backend/src/modules/user/dto/change-password.dto.ts

import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPass123!' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NewPass456!' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
  newPassword: string;

  @ApiProperty({ example: 'NewPass456!' })
  @IsString()
  confirmPassword: string;
}
```

### Controller

```typescript
// File: /backend/src/modules/user/user.controller.ts

import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('User Management')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getProfile(@Request() req) {
    return this.userService.getProfile(req.user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(@Request() req, @Body() updateDto: UpdateProfileDto) {
    return this.userService.updateProfile(req.user.id, updateDto);
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiResponse({ status: 401, description: 'Invalid current password' })
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    await this.userService.changePassword(req.user.id, changePasswordDto);
    return { message: 'Password changed successfully' };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send email verification' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  async sendVerificationEmail(@Request() req) {
    await this.userService.sendVerificationEmail(req.user.id);
    return { message: 'Verification email sent', email: req.user.email };
  }

  @Get('verify-email/:token')
  @ApiOperation({ summary: 'Verify email with token' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 400, description: 'Invalid token' })
  async verifyEmail(@Param('token') token: string) {
    await this.userService.verifyEmail(token);
    return { message: 'Email verified successfully', emailVerified: true };
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete user account' })
  @ApiResponse({ status: 200, description: 'Account deleted' })
  async deleteAccount(@Request() req) {
    await this.userService.deleteAccount(req.user.id);
    return { message: 'Account deleted successfully', deletedAt: new Date() };
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'User stats' })
  async getUserStats(@Request() req) {
    return this.userService.getUserStats(req.user.id);
  }
}
```

---

## Acceptance Criteria

- [ ] Can get current user profile
- [ ] Can update profile (name, timezone, language)
- [ ] Can change password with validation
- [ ] Old password verified before change
- [ ] All refresh tokens revoked on password change
- [ ] Email verification email sent
- [ ] Email verified with valid token
- [ ] Account soft deleted (deletedAt set)
- [ ] User stats endpoint returns correct data
- [ ] All endpoints protected with JWT auth
- [ ] Proper error handling and status codes

---

## Testing Procedure

```bash
# 1. Get profile
curl -X GET http://localhost:4000/users/me \
  -H "Authorization: Bearer <TOKEN>"

# 2. Update profile
curl -X PATCH http://localhost:4000/users/me \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'

# 3. Change password
curl -X POST http://localhost:4000/users/me/change-password \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPass123!",
    "newPassword": "NewPass456!",
    "confirmPassword": "NewPass456!"
  }'

# 4. Send verification email
curl -X POST http://localhost:4000/users/verify-email \
  -H "Authorization: Bearer <TOKEN>"

# 5. Delete account
curl -X DELETE http://localhost:4000/users/me \
  -H "Authorization: Bearer <TOKEN>"
```

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer

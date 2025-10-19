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
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req: any) {
    const user = await this.userService.getProfile(req.user.id);
    return user.toJSON();
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(@Request() req: any, @Body() updateDto: UpdateProfileDto) {
    const user = await this.userService.updateProfile(req.user.id, updateDto);
    return user.toJSON();
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - passwords do not match or do not meet requirements' })
  @ApiResponse({ status: 401, description: 'Unauthorized or invalid current password' })
  async changePassword(@Request() req: any, @Body() changePasswordDto: ChangePasswordDto) {
    await this.userService.changePassword(req.user.id, changePasswordDto);
    return { message: 'Password changed successfully' };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send email verification link' })
  @ApiResponse({ status: 200, description: 'Verification email sent successfully' })
  @ApiResponse({ status: 400, description: 'Email already verified' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendVerificationEmail(@Request() req: any) {
    await this.userService.sendVerificationEmail(req.user.id);
    return { message: 'Verification email sent', email: req.user.email };
  }

  @Get('verify-email/:token')
  @ApiOperation({ summary: 'Verify email with token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Param('token') token: string) {
    await this.userService.verifyEmail(token);
    return { message: 'Email verified successfully', emailVerified: true };
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete user account (soft delete)' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAccount(@Request() req: any) {
    await this.userService.deleteAccount(req.user.id);
    return { message: 'Account deleted successfully', deletedAt: new Date() };
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserStats(@Request() req: any) {
    return this.userService.getUserStats(req.user.id);
  }
}

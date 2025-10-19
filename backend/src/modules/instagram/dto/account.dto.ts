import { IsString, IsOptional, IsEnum, IsArray, IsDate, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AccountStatus, InstagramAccountType } from '../../../domain/entities/client-account.entity';

export class CreateAccountDto {
  @ApiProperty({ description: 'Platform account ID from Instagram' })
  @IsString()
  platformAccountId!: string;

  @ApiProperty({ description: 'Instagram username' })
  @IsString()
  username!: string;

  @ApiProperty({ required: false, description: 'Display name' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({ required: false, description: 'Profile picture URL' })
  @IsString()
  @IsOptional()
  profilePictureUrl?: string;

  @ApiProperty({ enum: InstagramAccountType, required: false, default: 'personal' })
  @IsEnum(InstagramAccountType)
  @IsOptional()
  accountType?: InstagramAccountType;

  @ApiProperty({ type: [String], required: false, description: 'OAuth permissions/scopes' })
  @IsArray()
  @IsOptional()
  permissions?: string[];

  @ApiProperty({ required: false, description: 'Token expiration date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  tokenExpiresAt?: Date;
}

export class UpdateAccountDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  profilePictureUrl?: string;

  @ApiProperty({ enum: AccountStatus, required: false })
  @IsEnum(AccountStatus)
  @IsOptional()
  status?: AccountStatus;
}

export class AccountResponseDto {
  @ApiProperty({ description: 'Account UUID' })
  id!: string;

  @ApiProperty({ description: 'Platform name', example: 'instagram' })
  platform!: string;

  @ApiProperty({ description: 'Instagram username' })
  username!: string;

  @ApiProperty({ required: false, description: 'Display name' })
  displayName?: string;

  @ApiProperty({ required: false, description: 'Profile picture URL' })
  profilePictureUrl?: string;

  @ApiProperty({ required: false, description: 'Follower count' })
  followerCount?: number;

  @ApiProperty({ required: false, description: 'Following count' })
  followingCount?: number;

  @ApiProperty({ required: false, description: 'Media count' })
  mediaCount?: number;

  @ApiProperty({ required: false, description: 'Biography' })
  biography?: string;

  @ApiProperty({ required: false, description: 'Website URL' })
  website?: string;

  @ApiProperty({ enum: AccountStatus, description: 'Account status' })
  status!: AccountStatus;

  @ApiProperty({ enum: InstagramAccountType, description: 'Account type' })
  accountType!: InstagramAccountType;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ required: false, description: 'Last sync timestamp' })
  lastSyncAt?: Date;

  @ApiProperty({ required: false, description: 'Token expiration timestamp' })
  tokenExpiresAt?: Date;
}

export class AccountListResponseDto {
  @ApiProperty({ type: [AccountResponseDto], description: 'Array of connected accounts' })
  accounts!: AccountResponseDto[];

  @ApiProperty({ description: 'Total number of accounts' })
  total!: number;
}

export class AccountStatusResponseDto {
  @ApiProperty({ enum: AccountStatus, description: 'Account status' })
  status!: AccountStatus;
}

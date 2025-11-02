import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum AccountType {
  BUSINESS = 'BUSINESS',
  CREATOR = 'CREATOR',
  PERSONAL = 'PERSONAL',
}

export class InstagramProfileDto {
  @ApiProperty({ description: 'Instagram account ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Instagram username' })
  @IsString()
  username!: string;

  @ApiProperty({ required: false, description: 'Display name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false, description: 'Profile biography' })
  @IsString()
  @IsOptional()
  biography?: string;

  @ApiProperty({ required: false, description: 'Profile picture URL' })
  @IsUrl({}, { message: 'Profile picture URL must be a valid URL' })
  @IsOptional()
  profile_picture_url?: string;

  @ApiProperty({ required: false, description: 'Website URL' })
  @IsUrl({}, { message: 'Website must be a valid URL' })
  @IsOptional()
  website?: string;

  @ApiProperty({ required: false, description: 'Number of followers' })
  @IsNumber()
  @IsOptional()
  followers_count?: number;

  @ApiProperty({ required: false, description: 'Number of accounts following' })
  @IsNumber()
  @IsOptional()
  follows_count?: number;

  @ApiProperty({ required: false, description: 'Number of media posts' })
  @IsNumber()
  @IsOptional()
  media_count?: number;

  @ApiProperty({
    required: false,
    description: 'Instagram Business Account ID',
  })
  @IsNumber()
  @IsOptional()
  ig_id?: number;

  @ApiProperty({ required: false, description: 'Verified account status' })
  @IsBoolean()
  @IsOptional()
  is_verified?: boolean;

  @ApiProperty({
    enum: AccountType,
    required: false,
    description: 'Account type',
  })
  @IsEnum(AccountType)
  @IsOptional()
  account_type?: 'BUSINESS' | 'CREATOR' | 'PERSONAL';
}

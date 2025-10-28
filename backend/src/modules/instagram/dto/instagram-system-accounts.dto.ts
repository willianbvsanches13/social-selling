import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Instagram Business Account DTO
 */
export class InstagramBusinessAccountDto {
  @ApiProperty({
    description: 'Instagram Business Account ID',
    example: '17841405309211844',
  })
  id!: string;

  @ApiProperty({
    description: 'Instagram username',
    example: 'my_business_account',
  })
  username!: string;

  @ApiProperty({
    description: 'Account display name',
    example: 'My Business',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'Profile picture URL',
    required: false,
  })
  profile_picture_url?: string;

  @ApiProperty({
    description: 'Number of followers',
    example: 1500,
    required: false,
  })
  followers_count?: number;

  @ApiProperty({
    description: 'Number of accounts following',
    example: 300,
    required: false,
  })
  follows_count?: number;

  @ApiProperty({
    description: 'Number of media posts',
    example: 125,
    required: false,
  })
  media_count?: number;

  @ApiProperty({
    description: 'Account biography',
    required: false,
  })
  biography?: string;

  @ApiProperty({
    description: 'Website URL',
    required: false,
  })
  website?: string;

  @ApiProperty({
    description: 'Connected Facebook Page ID',
    example: '123456789012345',
  })
  facebookPageId!: string;

  @ApiProperty({
    description: 'Connected Facebook Page Name',
    example: 'My Business Page',
  })
  facebookPageName!: string;
}

/**
 * Response DTO for listing available Instagram Business Accounts
 */
export class AvailableAccountsResponseDto {
  @ApiProperty({
    description: 'List of available Instagram Business Accounts',
    type: [InstagramBusinessAccountDto],
  })
  accounts!: InstagramBusinessAccountDto[];

  @ApiProperty({
    description: 'Total number of accounts',
    example: 3,
  })
  total!: number;
}

/**
 * DTO for linking an Instagram Business Account to a client
 */
export class LinkInstagramAccountDto {
  @ApiProperty({
    description: 'Instagram Business Account ID to link',
    example: '17841405309211844',
  })
  @IsString()
  @IsNotEmpty()
  instagramBusinessAccountId!: string;

  @ApiProperty({
    description: 'Optional: Facebook Page ID (for verification)',
    example: '123456789012345',
    required: false,
  })
  @IsString()
  facebookPageId?: string;
}

/**
 * Response DTO for linking account operation
 */
export class LinkAccountResponseDto {
  @ApiProperty({
    description: 'Client account ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  accountId!: string;

  @ApiProperty({
    description: 'Instagram username',
    example: 'my_business_account',
  })
  username!: string;

  @ApiProperty({
    description: 'Instagram Business Account ID',
    example: '17841405309211844',
  })
  instagramBusinessAccountId!: string;

  @ApiProperty({
    description: 'Success message',
    example: 'Instagram Business Account linked successfully',
  })
  message!: string;
}

import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsUrl,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum QuickReplyMatchType {
  EXACT = 'exact',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  REGEX = 'regex',
}

export class CreateQuickReplyDto {
  @ApiProperty({ description: 'Instagram account ID' })
  @IsUUID()
  instagramAccountId!: string;

  @ApiProperty({ description: 'Trigger keyword' })
  @IsString()
  triggerKeyword!: string;

  @ApiProperty({ description: 'Response text' })
  @IsString()
  responseText!: string;

  @ApiPropertyOptional({ description: 'Response media URL' })
  @IsOptional()
  @IsUrl()
  responseMediaUrl?: string;

  @ApiPropertyOptional({
    description: 'Match type',
    enum: QuickReplyMatchType,
    default: QuickReplyMatchType.EXACT,
  })
  @IsOptional()
  @IsEnum(QuickReplyMatchType)
  matchType?: QuickReplyMatchType;

  @ApiPropertyOptional({
    description: 'Priority (higher = checked first)',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  priority?: number;
}

export class UpdateQuickReplyDto {
  @ApiPropertyOptional({ description: 'Trigger keyword' })
  @IsOptional()
  @IsString()
  triggerKeyword?: string;

  @ApiPropertyOptional({ description: 'Response text' })
  @IsOptional()
  @IsString()
  responseText?: string;

  @ApiPropertyOptional({ description: 'Response media URL' })
  @IsOptional()
  @IsUrl()
  responseMediaUrl?: string;

  @ApiPropertyOptional({ description: 'Match type', enum: QuickReplyMatchType })
  @IsOptional()
  @IsEnum(QuickReplyMatchType)
  matchType?: QuickReplyMatchType;

  @ApiPropertyOptional({ description: 'Priority' })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QuickReplyResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  instagramAccountId!: string;

  @ApiProperty()
  triggerKeyword!: string;

  @ApiProperty()
  responseText!: string;

  @ApiProperty()
  responseMediaUrl: string | null = null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ enum: QuickReplyMatchType })
  matchType!: QuickReplyMatchType;

  @ApiProperty()
  priority!: number;

  @ApiProperty()
  usageCount!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

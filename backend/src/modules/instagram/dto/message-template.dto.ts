import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsUrl, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TemplateCategory {
  GREETING = 'greeting',
  PRODUCT_INFO = 'product_info',
  PRICING = 'pricing',
  CLOSING = 'closing',
  FAQ = 'faq',
}

export class CreateMessageTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Template category', enum: TemplateCategory })
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @ApiProperty({ description: 'Template content with variables like {{name}}' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: 'Media URLs to attach', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  mediaUrls?: string[];

  @ApiPropertyOptional({ description: 'Instagram account ID (optional, for account-specific templates)' })
  @IsOptional()
  @IsUUID()
  instagramAccountId?: string;
}

export class UpdateMessageTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Template category', enum: TemplateCategory })
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @ApiPropertyOptional({ description: 'Template content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Media URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  mediaUrls?: string[];

  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class MessageTemplateResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  category: string | null = null;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  variables: string[] = [];

  @ApiProperty()
  mediaUrls: string[] = [];

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  usageCount!: number;

  @ApiProperty()
  lastUsedAt: Date | null = null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostMediaType } from './scheduled-post.dto';

export enum TemplateCategory {
  PRODUCT_LAUNCH = 'product_launch',
  PROMOTION = 'promotion',
  TIP = 'tip',
  TESTIMONIAL = 'testimonial',
  BEHIND_SCENES = 'behind_scenes',
  ANNOUNCEMENT = 'announcement',
}

export class CreatePostTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    description: 'Template category',
    enum: TemplateCategory,
  })
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @ApiProperty({
    description: 'Caption template with variables like {{productName}}',
  })
  @IsString()
  captionTemplate!: string;

  @ApiPropertyOptional({
    description: 'Suggested hashtags',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestedHashtags?: string[];

  @ApiPropertyOptional({
    description: 'Suggested mentions (usernames)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestedMentions?: string[];

  @ApiPropertyOptional({
    description: 'Default media type',
    enum: PostMediaType,
  })
  @IsOptional()
  @IsEnum(PostMediaType)
  defaultMediaType?: PostMediaType;

  @ApiPropertyOptional({ description: 'Client account ID (optional)' })
  @IsOptional()
  @IsUUID()
  clientAccountId?: string;
}

export class UpdatePostTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Template category',
    enum: TemplateCategory,
  })
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @ApiPropertyOptional({ description: 'Caption template' })
  @IsOptional()
  @IsString()
  captionTemplate?: string;

  @ApiPropertyOptional({
    description: 'Suggested hashtags',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestedHashtags?: string[];

  @ApiPropertyOptional({
    description: 'Suggested mentions',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestedMentions?: string[];

  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PostTemplateResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiPropertyOptional()
  clientAccountId?: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ enum: TemplateCategory })
  category?: TemplateCategory;

  @ApiProperty()
  captionTemplate!: string;

  @ApiProperty({ type: [String] })
  variables!: string[];

  @ApiPropertyOptional({ enum: PostMediaType })
  defaultMediaType?: PostMediaType;

  @ApiProperty({ type: [String] })
  suggestedHashtags!: string[];

  @ApiProperty({ type: [String] })
  suggestedMentions!: string[];

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  usageCount!: number;

  @ApiPropertyOptional()
  lastUsedAt?: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PostTemplateListResponseDto {
  @ApiProperty({ type: [PostTemplateResponseDto] })
  templates!: PostTemplateResponseDto[];

  @ApiProperty()
  total!: number;
}

export class DeletePostTemplateResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty()
  templateId!: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class MediaUploadResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  filename!: string;

  @ApiProperty()
  originalFilename!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  fileSize!: number;

  @ApiProperty()
  mediaType!: 'image' | 'video';

  @ApiProperty()
  s3Url!: string;

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  width?: number;

  @ApiPropertyOptional()
  height?: number;

  @ApiPropertyOptional()
  duration?: number;

  @ApiProperty()
  createdAt!: Date;
}

export class ListMediaAssetsDto {
  @ApiPropertyOptional({
    description: 'Page number',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    minimum: 1,
    default: 20,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by media type',
    enum: ['image', 'video'],
  })
  @IsOptional()
  @IsString()
  mediaType?: 'image' | 'video';
}

export class MediaAssetsListResponseDto {
  @ApiProperty({ type: [MediaUploadResponseDto] })
  assets!: MediaUploadResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class BulkMediaUploadResponseDto {
  @ApiProperty({ type: [MediaUploadResponseDto] })
  uploaded!: MediaUploadResponseDto[];

  @ApiProperty({ type: [String] })
  failed!: string[];

  @ApiProperty()
  totalUploaded!: number;

  @ApiProperty()
  totalFailed!: number;
}

export class DeleteMediaAssetResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty()
  mediaId!: string;
}

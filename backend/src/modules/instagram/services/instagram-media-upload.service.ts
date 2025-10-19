import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as sharp from 'sharp';
import { MediaUploadResponseDto } from '../dto/media-upload.dto';
import {
  InstagramMediaAsset,
  MediaAssetType,
} from '../../../domain/entities/instagram-media-asset.entity';
import { IInstagramMediaAssetRepository } from '../../../domain/repositories/instagram-media-asset.repository.interface';

export interface IStorageService {
  uploadFile(
    bucket: string,
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<void>;
  getFileUrl(bucket: string, key: string): Promise<string>;
  deleteFile(bucket: string, key: string): Promise<void>;
}

@Injectable()
export class InstagramMediaUploadService {
  private readonly logger = new Logger(InstagramMediaUploadService.name);
  private readonly bucket: string;
  private readonly maxFileSize: number;

  constructor(
    @Inject('IInstagramMediaAssetRepository')
    private readonly assetRepository: IInstagramMediaAssetRepository,
    @Inject('IStorageService')
    private readonly storageService: IStorageService,
    private configService: ConfigService,
  ) {
    this.bucket = this.configService.get<string>(
      'MINIO_BUCKET_INSTAGRAM',
      'instagram-media',
    );
    this.maxFileSize = this.configService.get<number>(
      'MAX_FILE_SIZE',
      10 * 1024 * 1024,
    ); // 10MB default
  }

  /**
   * Upload media file
   */
  async uploadMedia(
    userId: string,
    file: any,
    clientAccountId?: string,
  ): Promise<MediaUploadResponseDto> {
    this.logger.log(`Uploading media for user ${userId}`);

    // Validate file type
    const mediaType = this.getMediaType(file.mimetype);
    if (!mediaType) {
      throw new BadRequestException(
        'Invalid file type. Only images and videos are supported.',
      );
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum of ${this.maxFileSize / 1024 / 1024}MB. Received ${file.size / 1024 / 1024}MB.`,
      );
    }

    // Generate unique filename
    const fileExtension =
      file.originalname.split('.').pop()?.toLowerCase() || '';
    const filename = `${uuidv4()}.${fileExtension}`;
    const s3Key = `${userId}/${mediaType}/${filename}`;

    try {
      // Upload to storage
      await this.storageService.uploadFile(
        this.bucket,
        s3Key,
        file.buffer,
        file.mimetype,
      );

      // Get signed URL
      const s3Url = await this.storageService.getFileUrl(this.bucket, s3Key);

      // Process metadata
      let metadata: any = {
        width: undefined,
        height: undefined,
        duration: undefined,
        thumbnailUrl: undefined,
      };

      if (mediaType === 'image') {
        metadata = await this.processImageMetadata(file.buffer);
      } else if (mediaType === 'video') {
        metadata = await this.processVideoMetadata(file.buffer, filename);
      }

      // Create asset entity
      const asset = InstagramMediaAsset.create({
        userId,
        clientAccountId,
        filename,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        mediaType: mediaType as MediaAssetType,
        s3Bucket: this.bucket,
        s3Key,
        s3Url,
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration,
        thumbnailUrl: metadata.thumbnailUrl,
      });

      // Save to database
      const saved = await this.assetRepository.create(asset);

      this.logger.log(`Media uploaded: ${saved.id}`);

      return this.mapToDto(saved);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Failed to upload media: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * Get media type from MIME type
   */
  private getMediaType(mimeType: string): 'image' | 'video' | null {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return null;
  }

  /**
   * Process image metadata using Sharp
   */
  private async processImageMetadata(buffer: Buffer): Promise<any> {
    try {
      const metadata = await sharp(buffer).metadata();

      return {
        width: metadata.width,
        height: metadata.height,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process image metadata: ${errorMessage}`);
      return {
        width: undefined,
        height: undefined,
      };
    }
  }

  /**
   * Process video metadata
   * Note: Full implementation would use FFmpeg or similar tool
   */
  private async processVideoMetadata(
    buffer: Buffer,
    filename: string,
  ): Promise<any> {
    try {
      // Placeholder implementation
      // In production, would use FFmpeg to extract:
      // - Duration
      // - Width/Height
      // - Generate thumbnail

      return {
        duration: 0,
        width: undefined,
        height: undefined,
        thumbnailUrl: undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process video metadata: ${errorMessage}`);
      return {
        duration: undefined,
        width: undefined,
        height: undefined,
        thumbnailUrl: undefined,
      };
    }
  }

  /**
   * List media assets
   */
  async listAssets(
    userId: string,
    clientAccountId?: string,
  ): Promise<MediaUploadResponseDto[]> {
    let assets: InstagramMediaAsset[];

    if (clientAccountId) {
      assets = await this.assetRepository.findByClientAccount(clientAccountId);
    } else {
      assets = await this.assetRepository.findByUser(userId);
    }

    return assets.map((asset) => this.mapToDto(asset));
  }

  /**
   * Get single media asset
   */
  async getAsset(
    assetId: string,
    userId: string,
  ): Promise<MediaUploadResponseDto> {
    const asset = await this.assetRepository.findById(assetId);

    if (!asset || asset.userId !== userId) {
      throw new BadRequestException('Media asset not found');
    }

    return this.mapToDto(asset);
  }

  /**
   * Delete media asset
   */
  async deleteAsset(assetId: string, userId: string): Promise<void> {
    const asset = await this.assetRepository.findById(assetId);

    if (!asset || asset.userId !== userId) {
      throw new BadRequestException('Media asset not found');
    }

    if (asset.usedInPosts > 0) {
      throw new BadRequestException(
        'Cannot delete media that is used in posts',
      );
    }

    try {
      // Delete from storage
      await this.storageService.deleteFile(asset.s3Bucket, asset.s3Key);

      // Delete from database
      await this.assetRepository.delete(assetId);

      this.logger.log(`Media deleted: ${assetId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Failed to delete media: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * Record media usage
   */
  async recordMediaUsage(assetId: string): Promise<void> {
    const asset = await this.assetRepository.findById(assetId);

    if (!asset) {
      throw new BadRequestException('Media asset not found');
    }

    asset.recordUsage();
    await this.assetRepository.update(asset);
  }

  /**
   * Map entity to DTO
   */
  private mapToDto(asset: InstagramMediaAsset): MediaUploadResponseDto {
    return {
      id: asset.id,
      filename: asset.filename,
      originalFilename: asset.originalFilename,
      mimeType: asset.mimeType,
      fileSize: asset.fileSize,
      mediaType: asset.mediaType as any,
      s3Url: asset.s3Url,
      thumbnailUrl: asset.thumbnailUrl,
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
      createdAt: asset.createdAt,
    };
  }
}

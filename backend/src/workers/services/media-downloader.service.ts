import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as sharp from 'sharp';
import { MinioService } from '../../infrastructure/storage/minio.service';
import { ImageAdjusterService } from './image-adjuster.service';

/**
 * Downloaded media information
 */
export interface DownloadedMedia {
  localPath: string;
  fileName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number; // for videos
}

/**
 * Service for downloading and validating media from MinIO S3 storage
 */
@Injectable()
export class MediaDownloaderService {
  private readonly logger = new Logger(MediaDownloaderService.name);
  private readonly tempDir: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly minioService: MinioService,
    private readonly imageAdjusterService: ImageAdjusterService,
  ) {
    this.tempDir = path.join(process.cwd(), 'temp', 'media');
    fs.ensureDirSync(this.tempDir);
    this.logger.log(`Temporary media directory: ${this.tempDir}`);
  }

  /**
   * Download media file from S3
   * @param s3Url S3 URL of the media file
   * @returns Downloaded media information
   */
  async downloadMedia(s3Url: string): Promise<DownloadedMedia> {
    try {
      this.logger.log(`Downloading media from S3: ${s3Url}`);

      // Parse S3 URL to extract bucket and key
      const { bucket, key } = this.parseS3Url(s3Url);

      // Generate local file path
      const fileName = this.generateFileName(key);
      const localPath = path.join(this.tempDir, fileName);

      // Download from S3 using MinIO service
      const stream = await this.minioService.getFile(key);
      const writeStream = fs.createWriteStream(localPath);

      // Pipe the stream to file
      await new Promise<void>((resolve, reject) => {
        stream.pipe(writeStream);
        stream.on('error', reject);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // Get file metadata
      const stats = await fs.stat(localPath);
      const mimeType = this.getMimeTypeFromExtension(key);

      const result: DownloadedMedia = {
        localPath,
        fileName,
        mimeType,
        size: stats.size,
      };

      // Get image dimensions if it's an image
      if (mimeType.startsWith('image/')) {
        try {
          const metadata = await sharp(localPath).metadata();
          result.width = metadata.width;
          result.height = metadata.height;
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Failed to get image metadata: ${errorMessage}`);
        }
      }

      // Validate and auto-adjust media if needed
      const adjustedResult = await this.validateAndAdjustMedia(result);

      this.logger.log(`Media downloaded successfully: ${adjustedResult.fileName}`);
      return adjustedResult;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to download media from S3: ${errorMessage}`,
        errorStack,
      );
      throw new Error(`Media download failed: ${errorMessage}`);
    }
  }

  /**
   * Download multiple media files
   * @param s3Urls Array of S3 URLs
   * @returns Array of downloaded media information
   */
  async downloadMultipleMedia(s3Urls: string[]): Promise<DownloadedMedia[]> {
    this.logger.log(`Downloading ${s3Urls.length} media file(s) from S3`);
    const downloads = await Promise.all(
      s3Urls.map((url) => this.downloadMedia(url)),
    );
    return downloads;
  }

  /**
   * Parse S3 URL to extract bucket and key
   * @param s3Url Full S3 URL
   * @returns Bucket and key
   */
  private parseS3Url(s3Url: string): { bucket: string; key: string } {
    try {
      // Format: https://minio.example.com/bucket-name/path/to/file.jpg
      // or http://localhost:9000/bucket-name/path/to/file.jpg
      const url = new URL(s3Url);
      const pathParts = url.pathname.split('/').filter(Boolean);

      if (pathParts.length < 2) {
        throw new Error('Invalid S3 URL format');
      }

      return {
        bucket: pathParts[0],
        key: pathParts.slice(1).join('/'),
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to parse S3 URL: ${errorMessage}`);
    }
  }

  /**
   * Generate a unique file name
   * @param originalKey Original file key
   * @returns Unique file name
   */
  private generateFileName(originalKey: string): string {
    const ext = path.extname(originalKey);
    const hash = crypto.randomBytes(8).toString('hex');
    return `${Date.now()}-${hash}${ext}`;
  }

  /**
   * Get MIME type from file extension
   * @param fileName File name or path
   * @returns MIME type
   */
  private getMimeTypeFromExtension(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
    };

    return mimeMap[ext] || 'application/octet-stream';
  }

  /**
   * Validate media against Instagram requirements and auto-adjust if needed
   * @param media Media to validate
   * @returns Adjusted media if modifications were needed, original otherwise
   * @throws Error if validation fails and cannot be fixed
   */
  private async validateAndAdjustMedia(
    media: DownloadedMedia,
  ): Promise<DownloadedMedia> {
    // Instagram image requirements
    if (media.mimeType.startsWith('image/')) {
      if (!media.width || !media.height) {
        throw new Error('Unable to determine image dimensions');
      }

      // Resolution check
      if (media.width < 320 || media.height < 320) {
        throw new Error(
          `Image resolution too low: ${media.width}x${media.height}. Minimum is 320px`,
        );
      }

      // Aspect ratio check (between 4:5 and 1.91:1)
      const aspectRatio = media.width / media.height;
      if (aspectRatio < 0.8 || aspectRatio > 1.91) {
        this.logger.warn(
          `Image aspect ratio ${aspectRatio.toFixed(2)} is outside Instagram limits. Auto-adjusting...`,
        );

        // Auto-adjust the image
        const adjustmentResult = await this.imageAdjusterService.adjustImage(
          media.localPath,
        );

        // Update stats for adjusted image
        const adjustedStats = await fs.stat(adjustmentResult.adjustedPath);

        // Clean up original file if it's different from adjusted
        if (adjustmentResult.adjustedPath !== media.localPath) {
          await fs.remove(media.localPath);
        }

        // Return adjusted media info
        return {
          localPath: adjustmentResult.adjustedPath,
          fileName: path.basename(adjustmentResult.adjustedPath),
          mimeType: media.mimeType,
          size: adjustedStats.size,
          width: adjustmentResult.newDimensions.width,
          height: adjustmentResult.newDimensions.height,
        };
      }

      // File size check (8MB for images)
      const maxSize = 8 * 1024 * 1024;
      if (media.size > maxSize) {
        throw new Error(
          `Image file too large: ${(media.size / 1024 / 1024).toFixed(2)}MB. Maximum is 8MB`,
        );
      }
    }

    // Instagram video requirements
    if (media.mimeType.startsWith('video/')) {
      // File size check (100MB for videos)
      const maxSize = 100 * 1024 * 1024;
      if (media.size > maxSize) {
        throw new Error(
          `Video file too large: ${(media.size / 1024 / 1024).toFixed(2)}MB. Maximum is 100MB`,
        );
      }

      // Duration check would require ffprobe
      // Can be implemented later if needed
    }

    this.logger.log('Media validation passed');
    return media;
  }

  /**
   * Clean up a temporary media file
   * @param filePath Path to the file
   */
  async cleanupMedia(filePath: string): Promise<void> {
    try {
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        this.logger.log(`Cleaned up temporary file: ${filePath}`);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to cleanup file ${filePath}: ${errorMessage}`);
    }
  }

  /**
   * Clean up multiple temporary media files
   * @param filePaths Array of file paths
   */
  async cleanupMultipleMedia(filePaths: string[]): Promise<void> {
    await Promise.all(filePaths.map((path) => this.cleanupMedia(path)));
  }
}

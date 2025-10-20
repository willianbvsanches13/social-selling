import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client!: Minio.Client;
  private bucketName!: string;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const minioHost = this.configService.get<string>('minio.host', 'minio');
    const minioPort = this.configService.get<number>('minio.port', 9000);
    const accessKey = this.configService.get<string>(
      'minio.accessKey',
      'minioadmin',
    );
    const secretKey = this.configService.get<string>(
      'minio.secretKey',
      'changeme',
    );

    this.logger.log(
      `Initializing MinIO client: ${minioHost}:${minioPort} (user: ${accessKey})`,
    );

    this.client = new Minio.Client({
      endPoint: minioHost,
      port: minioPort,
      useSSL: false,
      accessKey,
      secretKey,
    });

    this.bucketName = this.configService.get<string>(
      'minio.bucket',
      'social-selling-media',
    );

    // Create bucket if not exists (non-blocking)
    this.createBucketIfNotExists().catch((error) => {
      this.logger.warn(
        `MinIO initialization failed. File storage will be unavailable: ${error?.message || 'Unknown error'}`,
      );
    });
  }

  private async createBucketIfNotExists(): Promise<void> {
    try {
      const bucketExists = await this.client.bucketExists(this.bucketName);

      if (!bucketExists) {
        await this.client.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Bucket ${this.bucketName} created successfully`);

        // Set bucket lifecycle policy (90-day expiration)
        const lifecycleConfig = {
          Rule: [
            {
              ID: 'ExpireOldObjects',
              Status: 'Enabled',
              Expiration: {
                Days: 90,
              },
            },
          ],
        };

        await this.client.setBucketLifecycle(
          this.bucketName,
          lifecycleConfig as any,
        );
        this.logger.log('Bucket lifecycle policy set: 90-day expiration');
      } else {
        this.logger.log(`Bucket ${this.bucketName} already exists`);
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to create or verify bucket: ${error?.message || 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Upload a file to MinIO
   * @param objectName - Path and filename in bucket (e.g., 'posts/user123/image.jpg')
   * @param file - File buffer or stream
   * @param size - File size in bytes
   * @param metadata - Optional metadata (e.g., contentType)
   * @returns Object name (key) in bucket
   */
  async uploadFile(
    objectName: string,
    file: Buffer | NodeJS.ReadableStream | string,
    size: number,
    metadata?: Record<string, string>,
  ): Promise<string> {
    try {
      const metaData = {
        'Content-Type': metadata?.contentType || 'application/octet-stream',
        ...metadata,
      };

      await this.client.putObject(
        this.bucketName,
        objectName,
        file as any, // MinIO SDK accepts multiple stream types
        size,
        metaData,
      );

      this.logger.log(`File uploaded successfully: ${objectName}`);
      return objectName;
    } catch (error: any) {
      this.logger.error(
        `Failed to upload file ${objectName}: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      throw error;
    }
  }

  /**
   * Get a file from MinIO
   * @param objectName - Object key in bucket
   * @returns Readable stream
   */
  async getFile(objectName: string): Promise<NodeJS.ReadableStream> {
    try {
      return await this.client.getObject(this.bucketName, objectName);
    } catch (error: any) {
      this.logger.error(
        `Failed to get file ${objectName}: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      throw error;
    }
  }

  /**
   * Delete a file from MinIO
   * @param objectName - Object key in bucket
   */
  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucketName, objectName);
      this.logger.log(`File deleted successfully: ${objectName}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to delete file ${objectName}: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      throw error;
    }
  }

  /**
   * Delete multiple files from MinIO
   * @param objectNames - Array of object keys
   */
  async deleteFiles(objectNames: string[]): Promise<void> {
    try {
      await this.client.removeObjects(this.bucketName, objectNames);
      this.logger.log(
        `Files deleted successfully: ${objectNames.length} files`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to delete files: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      throw error;
    }
  }

  /**
   * Generate a pre-signed URL for secure temporary access (GET)
   * @param objectName - Object key in bucket
   * @param expirySeconds - URL expiration time (default: 1 hour)
   * @returns Pre-signed URL
   */
  async getPresignedUrl(
    objectName: string,
    expirySeconds = 3600,
  ): Promise<string> {
    try {
      return await this.client.presignedGetObject(
        this.bucketName,
        objectName,
        expirySeconds,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to generate presigned URL for ${objectName}: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      throw error;
    }
  }

  /**
   * Generate a pre-signed PUT URL for direct upload from client
   * @param objectName - Object key in bucket
   * @param expirySeconds - URL expiration time (default: 1 hour)
   * @returns Pre-signed PUT URL
   */
  async getPresignedPutUrl(
    objectName: string,
    expirySeconds = 3600,
  ): Promise<string> {
    try {
      return await this.client.presignedPutObject(
        this.bucketName,
        objectName,
        expirySeconds,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to generate presigned PUT URL for ${objectName}: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      throw error;
    }
  }

  /**
   * List files in a directory (prefix)
   * @param prefix - Directory path (e.g., 'posts/user123/')
   * @returns Array of object names
   */
  async listFiles(prefix: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const files: string[] = [];
      const stream = this.client.listObjectsV2(this.bucketName, prefix, true);

      stream.on('data', (obj) => {
        if (obj.name) {
          files.push(obj.name);
        }
      });

      stream.on('end', () => {
        this.logger.log(`Listed ${files.length} files with prefix: ${prefix}`);
        resolve(files);
      });

      stream.on('error', (err) => {
        this.logger.error(
          `Failed to list files with prefix ${prefix}: ${err.message}`,
          err.stack,
        );
        reject(err);
      });
    });
  }

  /**
   * Get file metadata/stats
   * @param objectName - Object key in bucket
   * @returns File stats (size, etag, lastModified, etc.)
   */
  async getFileStats(objectName: string): Promise<Minio.BucketItemStat> {
    try {
      return await this.client.statObject(this.bucketName, objectName);
    } catch (error: any) {
      this.logger.error(
        `Failed to get file stats for ${objectName}: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      throw error;
    }
  }

  /**
   * Check if a file exists
   * @param objectName - Object key in bucket
   * @returns True if file exists
   */
  async fileExists(objectName: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucketName, objectName);
      return true;
    } catch (error: any) {
      if (error?.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Health check for MinIO service
   * @returns True if MinIO is accessible
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.client.bucketExists(this.bucketName);
      return true;
    } catch (error: any) {
      this.logger.error(
        `MinIO health check failed: ${error?.message || 'Unknown error'}`,
      );
      return false;
    }
  }

  /**
   * Get the MinIO client instance (for advanced operations)
   * @returns MinIO client
   */
  getClient(): Minio.Client {
    return this.client;
  }

  /**
   * Get the configured bucket name
   * @returns Bucket name
   */
  getBucketName(): string {
    return this.bucketName;
  }
}

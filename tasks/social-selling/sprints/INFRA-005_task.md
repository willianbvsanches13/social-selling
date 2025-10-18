# INFRA-005: MinIO S3-Compatible Storage Setup

**Priority:** P0 (Critical Path)
**Effort:** 3 hours
**Day:** 2
**Dependencies:** INFRA-002
**Domain:** Infrastructure & DevOps

---

## Overview

Set up MinIO as S3-compatible object storage for media files (images, videos) uploaded for Instagram posts. Configure buckets, lifecycle policies, and integrate S3 SDK for seamless file operations.

---

## Data Models

### MinIO Configuration

```yaml
# MinIO Server Configuration
minio:
  endpoint: minio
  port: 9000
  console_port: 9001
  access_key: <from_env>
  secret_key: <from_env>
  use_ssl: false  # true in production with Nginx proxy
  region: us-east-1

# Bucket Configuration
buckets:
  - name: social-selling-media
    policy: private
    versioning: false
    lifecycle:
      - expiration_days: 90  # Delete objects after 90 days
      - transition_days: 30  # Transition to cheaper storage (future)
```

### Storage Structure

```
social-selling-media/
├── posts/
│   ├── {userId}/
│   │   ├── {postId}/
│   │   │   ├── image.jpg
│   │   │   ├── video.mp4
│   │   │   └── thumbnail.jpg
├── profile-pictures/
│   ├── {userId}/
│   │   └── avatar.jpg
└── temp/
    └── {uploadId}/
        └── file.tmp
```

---

## Implementation Approach

### Phase 1: MinIO Client Service (1.5 hours)

```typescript
// File: /backend/src/infrastructure/storage/minio.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private client: Minio.Client;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.client = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_HOST'),
      port: this.configService.get<number>('MINIO_PORT'),
      useSSL: this.configService.get<boolean>('MINIO_USE_SSL', false),
      accessKey: this.configService.get<string>('MINIO_ROOT_USER'),
      secretKey: this.configService.get<string>('MINIO_ROOT_PASSWORD'),
    });

    this.bucketName = this.configService.get<string>('MINIO_BUCKET_NAME');

    // Create bucket if not exists
    await this.createBucketIfNotExists();
  }

  private async createBucketIfNotExists(): Promise<void> {
    const bucketExists = await this.client.bucketExists(this.bucketName);
    if (!bucketExists) {
      await this.client.makeBucket(this.bucketName, 'us-east-1');
      console.log(`Bucket ${this.bucketName} created successfully`);

      // Set bucket policy to private
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucketName}/*`],
          },
        ],
      };

      await this.client.setBucketPolicy(
        this.bucketName,
        JSON.stringify(policy),
      );
    }
  }

  // Upload file
  async uploadFile(
    objectName: string,
    file: Buffer | NodeJS.ReadableStream,
    size: number,
    metadata?: Record<string, string>,
  ): Promise<string> {
    await this.client.putObject(this.bucketName, objectName, file, size, {
      'Content-Type': metadata?.contentType || 'application/octet-stream',
      ...metadata,
    });

    return objectName;
  }

  // Get file
  async getFile(objectName: string): Promise<NodeJS.ReadableStream> {
    return this.client.getObject(this.bucketName, objectName);
  }

  // Delete file
  async deleteFile(objectName: string): Promise<void> {
    await this.client.removeObject(this.bucketName, objectName);
  }

  // Get pre-signed URL (for secure temporary access)
  async getPresignedUrl(objectName: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(
      this.bucketName,
      objectName,
      expirySeconds,
    );
  }

  // Get pre-signed PUT URL (for direct upload from client)
  async getPresignedPutUrl(objectName: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedPutObject(
      this.bucketName,
      objectName,
      expirySeconds,
    );
  }

  // List files in directory
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
        resolve(files);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  }

  // Get file stats
  async getFileStats(objectName: string): Promise<Minio.BucketItemStat> {
    return this.client.statObject(this.bucketName, objectName);
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      await this.client.bucketExists(this.bucketName);
      return true;
    } catch (error) {
      return false;
    }
  }
}
```

### Phase 2: Storage Module (30 minutes)

```typescript
// File: /backend/src/infrastructure/storage/storage.module.ts

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MinioService } from './minio.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [MinioService],
  exports: [MinioService],
})
export class StorageModule {}
```

```typescript
// File: /backend/src/infrastructure/storage/file-upload.interceptor.ts

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const file = request.file;

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException('File size exceeds maximum allowed (10MB)');
    }

    // Validate mime type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('File type not allowed');
    }

    // Generate unique filename
    const extension = file.originalname.split('.').pop();
    const filename = `${uuidv4()}.${extension}`;
    request.file.generatedFilename = filename;

    return next.handle();
  }
}
```

### Phase 3: Lifecycle Policies (30 minutes)

```bash
#!/bin/bash
# File: /infrastructure/minio/init-buckets.sh

set -e

# Wait for MinIO to be ready
until mc alias set myminio http://minio:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD; do
  echo "Waiting for MinIO to be ready..."
  sleep 2
done

# Create bucket
mc mb myminio/social-selling-media --ignore-existing

# Set lifecycle policy (delete after 90 days)
mc ilm add myminio/social-selling-media --expiry-days 90

# Set versioning (optional)
# mc version enable myminio/social-selling-media

# Set encryption (optional for production)
# mc encrypt set sse-s3 myminio/social-selling-media

echo "MinIO buckets initialized successfully"
```

### Phase 4: Testing (30 minutes)

```typescript
// File: /backend/src/infrastructure/storage/minio.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MinioService } from './minio.service';
import { Readable } from 'stream';

describe('MinioService', () => {
  let service: MinioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinioService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                MINIO_HOST: 'localhost',
                MINIO_PORT: 9000,
                MINIO_ROOT_USER: 'minioadmin',
                MINIO_ROOT_PASSWORD: 'minioadmin',
                MINIO_BUCKET_NAME: 'test-bucket',
                MINIO_USE_SSL: false,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MinioService>(MinioService);
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should upload file', async () => {
    const buffer = Buffer.from('test content');
    const objectName = 'test/file.txt';

    const result = await service.uploadFile(objectName, buffer, buffer.length);
    expect(result).toBe(objectName);
  });

  it('should get presigned URL', async () => {
    const objectName = 'test/file.txt';
    const url = await service.getPresignedUrl(objectName);

    expect(url).toContain(objectName);
    expect(url).toContain('X-Amz-Signature');
  });

  it('should list files', async () => {
    const files = await service.listFiles('test/');
    expect(Array.isArray(files)).toBe(true);
  });

  it('should be healthy', async () => {
    const healthy = await service.isHealthy();
    expect(healthy).toBe(true);
  });
});
```

---

## Files to Create

```
/backend/src/infrastructure/storage/
├── storage.module.ts
├── minio.service.ts
├── file-upload.interceptor.ts
└── minio.service.spec.ts
/infrastructure/minio/
└── init-buckets.sh
```

---

## Dependencies

**Prerequisites:**
- INFRA-002 (Docker Compose with MinIO container)
- MinIO container running on ports 9000, 9001

**Blocks:**
- IG-006 (Post Scheduling - needs media storage)
- All media upload functionality

---

## Acceptance Criteria

- [ ] MinIO container running and accessible
- [ ] Console accessible at http://localhost:9001
- [ ] Bucket `social-selling-media` created
- [ ] Can upload files via MinioService
- [ ] Can get pre-signed URLs
- [ ] Can delete files
- [ ] Can list files in directory
- [ ] Lifecycle policy set (90-day expiration)
- [ ] File upload interceptor validates file size and type
- [ ] Health check returns true
- [ ] All unit tests passing

---

## Testing Procedure

```bash
# 1. Access MinIO console
open http://localhost:9001
# Login with MINIO_ROOT_USER and MINIO_ROOT_PASSWORD

# 2. Verify bucket exists
docker compose exec minio mc ls myminio/

# Expected: social-selling-media bucket listed

# 3. Upload test file via CLI
echo "test content" > test.txt
docker compose exec minio mc cp test.txt myminio/social-selling-media/test/

# Expected: File uploaded successfully

# 4. List files
docker compose exec minio mc ls myminio/social-selling-media/test/

# Expected: test.txt listed

# 5. Test from backend
cd backend && npm run start:dev

# Upload file via API
curl -X POST http://localhost:4000/api/media/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.jpg"

# Expected: {"url": "https://...", "key": "posts/..."}

# 6. Get pre-signed URL
curl http://localhost:4000/api/media/presigned/posts/123.jpg \
  -H "Authorization: Bearer <token>"

# Expected: {"url": "http://minio:9000/...?X-Amz-Signature=..."}

# 7. Check lifecycle policy
docker compose exec minio mc ilm ls myminio/social-selling-media

# Expected: Expiry rule with 90 days
```

---

## Security Considerations

1. **Access Keys:** Use strong, random access/secret keys
2. **Pre-signed URLs:** Set expiration (1 hour default)
3. **Private Bucket:** Don't allow public access by default
4. **File Validation:** Validate file types and sizes
5. **Virus Scanning:** Consider ClamAV integration for production
6. **Encryption at Rest:** Enable for production

---

## Cost Estimate

- **MinIO (Docker Image):** Free
- **Storage:** ~5-10GB included in VPS disk
- **Time Investment:** 3 hours
- **Total Additional Cost:** $0

---

## Related Documents

- Architecture Design: `/tasks/social-selling/architecture-design.md`
- Previous Task: INFRA-002
- Next Task: IG-006 (Post Scheduling)

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer

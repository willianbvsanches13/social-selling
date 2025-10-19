import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MinioService } from './minio.service';
import * as Minio from 'minio';

// Mock MinIO client
jest.mock('minio');

describe('MinioService', () => {
  let service: MinioService;
  let mockMinioClient: jest.Mocked<Minio.Client>;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        MINIO_HOST: 'localhost',
        MINIO_PORT: 9000,
        MINIO_ROOT_USER: 'minioadmin',
        MINIO_ROOT_PASSWORD: 'minioadmin123',
        MINIO_BUCKET_NAME: 'test-bucket',
        MINIO_USE_SSL: false,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock MinIO client methods
    mockMinioClient = {
      bucketExists: jest.fn().mockResolvedValue(true),
      makeBucket: jest.fn().mockResolvedValue(undefined),
      setBucketLifecycle: jest.fn().mockResolvedValue(undefined),
      putObject: jest.fn().mockResolvedValue({ etag: 'mock-etag' }),
      getObject: jest.fn().mockResolvedValue({} as any),
      removeObject: jest.fn().mockResolvedValue(undefined),
      removeObjects: jest.fn().mockResolvedValue(undefined),
      presignedGetObject: jest
        .fn()
        .mockResolvedValue('http://localhost:9000/test-bucket/file.jpg'),
      presignedPutObject: jest
        .fn()
        .mockResolvedValue('http://localhost:9000/test-bucket/file.jpg'),
      listObjectsV2: jest.fn(),
      statObject: jest.fn().mockResolvedValue({
        size: 1024,
        etag: 'mock-etag',
        lastModified: new Date(),
      }),
    } as any;

    // Mock the MinIO Client constructor
    (Minio.Client as jest.MockedClass<typeof Minio.Client>).mockImplementation(
      () => mockMinioClient,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinioService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MinioService>(MinioService);
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create MinIO client with correct configuration', () => {
    expect(Minio.Client).toHaveBeenCalledWith({
      endPoint: 'localhost',
      port: 9000,
      useSSL: false,
      accessKey: 'minioadmin',
      secretKey: 'minioadmin123',
    });
  });

  describe('onModuleInit', () => {
    it('should create bucket if it does not exist', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(false);

      await service.onModuleInit();

      expect(mockMinioClient.makeBucket).toHaveBeenCalledWith(
        'test-bucket',
        'us-east-1',
      );
      expect(mockMinioClient.setBucketLifecycle).toHaveBeenCalled();
    });

    it('should not create bucket if it already exists', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);

      await service.onModuleInit();

      expect(mockMinioClient.makeBucket).not.toHaveBeenCalled();
    });

    it('should handle errors during bucket creation', async () => {
      mockMinioClient.bucketExists.mockRejectedValue(
        new Error('Connection failed'),
      );

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const buffer = Buffer.from('test content');
      const objectName = 'test/file.txt';
      const metadata = { contentType: 'text/plain' };

      const result = await service.uploadFile(
        objectName,
        buffer,
        buffer.length,
        metadata,
      );

      expect(result).toBe(objectName);
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'test-bucket',
        objectName,
        buffer,
        buffer.length,
        expect.objectContaining({
          'Content-Type': 'text/plain',
        }),
      );
    });

    it('should use default content type if not provided', async () => {
      const buffer = Buffer.from('test content');
      const objectName = 'test/file.txt';

      await service.uploadFile(objectName, buffer, buffer.length);

      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'test-bucket',
        objectName,
        buffer,
        buffer.length,
        expect.objectContaining({
          'Content-Type': 'application/octet-stream',
        }),
      );
    });

    it('should handle upload errors', async () => {
      mockMinioClient.putObject.mockRejectedValue(new Error('Upload failed'));
      const buffer = Buffer.from('test content');

      await expect(
        service.uploadFile('test/file.txt', buffer, buffer.length),
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('getFile', () => {
    it('should retrieve file successfully', async () => {
      const objectName = 'test/file.txt';

      const result = await service.getFile(objectName);

      expect(result).toBeDefined();
      expect(mockMinioClient.getObject).toHaveBeenCalledWith(
        'test-bucket',
        objectName,
      );
    });

    it('should handle retrieval errors', async () => {
      mockMinioClient.getObject.mockRejectedValue(new Error('File not found'));

      await expect(service.getFile('test/file.txt')).rejects.toThrow(
        'File not found',
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const objectName = 'test/file.txt';

      await service.deleteFile(objectName);

      expect(mockMinioClient.removeObject).toHaveBeenCalledWith(
        'test-bucket',
        objectName,
      );
    });

    it('should handle deletion errors', async () => {
      mockMinioClient.removeObject.mockRejectedValue(
        new Error('Deletion failed'),
      );

      await expect(service.deleteFile('test/file.txt')).rejects.toThrow(
        'Deletion failed',
      );
    });
  });

  describe('deleteFiles', () => {
    it('should delete multiple files successfully', async () => {
      const objectNames = ['test/file1.txt', 'test/file2.txt'];

      await service.deleteFiles(objectNames);

      expect(mockMinioClient.removeObjects).toHaveBeenCalledWith(
        'test-bucket',
        objectNames,
      );
    });
  });

  describe('getPresignedUrl', () => {
    it('should generate presigned URL with default expiry', async () => {
      const objectName = 'test/file.txt';

      const url = await service.getPresignedUrl(objectName);

      expect(url).toContain('test-bucket');
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
        'test-bucket',
        objectName,
        3600,
      );
    });

    it('should generate presigned URL with custom expiry', async () => {
      const objectName = 'test/file.txt';
      const expiry = 7200;

      await service.getPresignedUrl(objectName, expiry);

      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
        'test-bucket',
        objectName,
        expiry,
      );
    });
  });

  describe('getPresignedPutUrl', () => {
    it('should generate presigned PUT URL', async () => {
      const objectName = 'test/file.txt';

      const url = await service.getPresignedPutUrl(objectName);

      expect(url).toContain('test-bucket');
      expect(mockMinioClient.presignedPutObject).toHaveBeenCalledWith(
        'test-bucket',
        objectName,
        3600,
      );
    });
  });

  describe('listFiles', () => {
    it('should list files successfully', async () => {
      const mockStream: any = {
        on: jest.fn((event: string, handler: any): any => {
          if (event === 'data') {
            handler({ name: 'test/file1.txt' });
            handler({ name: 'test/file2.txt' });
          } else if (event === 'end') {
            handler();
          }
          return mockStream;
        }),
      };

      mockMinioClient.listObjectsV2.mockReturnValue(mockStream as any);

      const files = await service.listFiles('test/');

      expect(files).toEqual(['test/file1.txt', 'test/file2.txt']);
      expect(mockMinioClient.listObjectsV2).toHaveBeenCalledWith(
        'test-bucket',
        'test/',
        true,
      );
    });

    it('should handle listing errors', async () => {
      const mockStream: any = {
        on: jest.fn((event: string, handler: any): any => {
          if (event === 'error') {
            handler(new Error('List failed'));
          }
          return mockStream;
        }),
      };

      mockMinioClient.listObjectsV2.mockReturnValue(mockStream as any);

      await expect(service.listFiles('test/')).rejects.toThrow('List failed');
    });
  });

  describe('getFileStats', () => {
    it('should get file stats successfully', async () => {
      const objectName = 'test/file.txt';

      const stats = await service.getFileStats(objectName);

      expect(stats).toBeDefined();
      expect(stats.size).toBe(1024);
      expect(mockMinioClient.statObject).toHaveBeenCalledWith(
        'test-bucket',
        objectName,
      );
    });
  });

  describe('fileExists', () => {
    it('should return true if file exists', async () => {
      const objectName = 'test/file.txt';

      const exists = await service.fileExists(objectName);

      expect(exists).toBe(true);
      expect(mockMinioClient.statObject).toHaveBeenCalledWith(
        'test-bucket',
        objectName,
      );
    });

    it('should return false if file does not exist', async () => {
      mockMinioClient.statObject.mockRejectedValue({ code: 'NotFound' });

      const exists = await service.fileExists('test/file.txt');

      expect(exists).toBe(false);
    });

    it('should throw error for non-NotFound errors', async () => {
      mockMinioClient.statObject.mockRejectedValue(
        new Error('Permission denied'),
      );

      await expect(service.fileExists('test/file.txt')).rejects.toThrow(
        'Permission denied',
      );
    });
  });

  describe('isHealthy', () => {
    it('should return true when MinIO is healthy', async () => {
      const healthy = await service.isHealthy();

      expect(healthy).toBe(true);
      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('test-bucket');
    });

    it('should return false when MinIO is unhealthy', async () => {
      mockMinioClient.bucketExists.mockRejectedValue(
        new Error('Connection failed'),
      );

      const healthy = await service.isHealthy();

      expect(healthy).toBe(false);
    });
  });

  describe('getClient', () => {
    it('should return MinIO client instance', () => {
      const client = service.getClient();

      expect(client).toBe(mockMinioClient);
    });
  });

  describe('getBucketName', () => {
    it('should return configured bucket name', () => {
      const bucketName = service.getBucketName();

      expect(bucketName).toBe('test-bucket');
    });
  });
});

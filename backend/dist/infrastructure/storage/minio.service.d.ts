import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
export declare class MinioService implements OnModuleInit {
    private readonly configService;
    private readonly logger;
    private client;
    private bucketName;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    private createBucketIfNotExists;
    uploadFile(objectName: string, file: Buffer | NodeJS.ReadableStream | string, size: number, metadata?: Record<string, string>): Promise<string>;
    getFile(objectName: string): Promise<NodeJS.ReadableStream>;
    deleteFile(objectName: string): Promise<void>;
    deleteFiles(objectNames: string[]): Promise<void>;
    getPresignedUrl(objectName: string, expirySeconds?: number): Promise<string>;
    getPresignedPutUrl(objectName: string, expirySeconds?: number): Promise<string>;
    listFiles(prefix: string): Promise<string[]>;
    getFileStats(objectName: string): Promise<Minio.BucketItemStat>;
    fileExists(objectName: string): Promise<boolean>;
    isHealthy(): Promise<boolean>;
    getClient(): Minio.Client;
    getBucketName(): string;
}

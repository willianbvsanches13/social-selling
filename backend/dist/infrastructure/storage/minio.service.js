"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MinioService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinioService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const Minio = require("minio");
let MinioService = MinioService_1 = class MinioService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(MinioService_1.name);
    }
    async onModuleInit() {
        this.client = new Minio.Client({
            endPoint: this.configService.get('minio.host', 'localhost'),
            port: this.configService.get('minio.port', 9000),
            useSSL: false,
            accessKey: this.configService.get('minio.accessKey', 'minioadmin'),
            secretKey: this.configService.get('minio.secretKey', 'minioadmin123'),
        });
        this.bucketName = this.configService.get('minio.bucket', 'social-selling-media');
        this.createBucketIfNotExists().catch((error) => {
            this.logger.warn(`MinIO initialization failed. File storage will be unavailable: ${error?.message || 'Unknown error'}`);
        });
    }
    async createBucketIfNotExists() {
        try {
            const bucketExists = await this.client.bucketExists(this.bucketName);
            if (!bucketExists) {
                await this.client.makeBucket(this.bucketName, 'us-east-1');
                this.logger.log(`Bucket ${this.bucketName} created successfully`);
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
                await this.client.setBucketLifecycle(this.bucketName, lifecycleConfig);
                this.logger.log('Bucket lifecycle policy set: 90-day expiration');
            }
            else {
                this.logger.log(`Bucket ${this.bucketName} already exists`);
            }
        }
        catch (error) {
            this.logger.error(`Failed to create or verify bucket: ${error?.message || 'Unknown error'}`);
            throw error;
        }
    }
    async uploadFile(objectName, file, size, metadata) {
        try {
            const metaData = {
                'Content-Type': metadata?.contentType || 'application/octet-stream',
                ...metadata,
            };
            await this.client.putObject(this.bucketName, objectName, file, size, metaData);
            this.logger.log(`File uploaded successfully: ${objectName}`);
            return objectName;
        }
        catch (error) {
            this.logger.error(`Failed to upload file ${objectName}: ${error?.message || 'Unknown error'}`, error?.stack);
            throw error;
        }
    }
    async getFile(objectName) {
        try {
            return await this.client.getObject(this.bucketName, objectName);
        }
        catch (error) {
            this.logger.error(`Failed to get file ${objectName}: ${error?.message || 'Unknown error'}`, error?.stack);
            throw error;
        }
    }
    async deleteFile(objectName) {
        try {
            await this.client.removeObject(this.bucketName, objectName);
            this.logger.log(`File deleted successfully: ${objectName}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete file ${objectName}: ${error?.message || 'Unknown error'}`, error?.stack);
            throw error;
        }
    }
    async deleteFiles(objectNames) {
        try {
            await this.client.removeObjects(this.bucketName, objectNames);
            this.logger.log(`Files deleted successfully: ${objectNames.length} files`);
        }
        catch (error) {
            this.logger.error(`Failed to delete files: ${error?.message || 'Unknown error'}`, error?.stack);
            throw error;
        }
    }
    async getPresignedUrl(objectName, expirySeconds = 3600) {
        try {
            return await this.client.presignedGetObject(this.bucketName, objectName, expirySeconds);
        }
        catch (error) {
            this.logger.error(`Failed to generate presigned URL for ${objectName}: ${error?.message || 'Unknown error'}`, error?.stack);
            throw error;
        }
    }
    async getPresignedPutUrl(objectName, expirySeconds = 3600) {
        try {
            return await this.client.presignedPutObject(this.bucketName, objectName, expirySeconds);
        }
        catch (error) {
            this.logger.error(`Failed to generate presigned PUT URL for ${objectName}: ${error?.message || 'Unknown error'}`, error?.stack);
            throw error;
        }
    }
    async listFiles(prefix) {
        return new Promise((resolve, reject) => {
            const files = [];
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
                this.logger.error(`Failed to list files with prefix ${prefix}: ${err.message}`, err.stack);
                reject(err);
            });
        });
    }
    async getFileStats(objectName) {
        try {
            return await this.client.statObject(this.bucketName, objectName);
        }
        catch (error) {
            this.logger.error(`Failed to get file stats for ${objectName}: ${error?.message || 'Unknown error'}`, error?.stack);
            throw error;
        }
    }
    async fileExists(objectName) {
        try {
            await this.client.statObject(this.bucketName, objectName);
            return true;
        }
        catch (error) {
            if (error?.code === 'NotFound') {
                return false;
            }
            throw error;
        }
    }
    async isHealthy() {
        try {
            await this.client.bucketExists(this.bucketName);
            return true;
        }
        catch (error) {
            this.logger.error(`MinIO health check failed: ${error?.message || 'Unknown error'}`);
            return false;
        }
    }
    getClient() {
        return this.client;
    }
    getBucketName() {
        return this.bucketName;
    }
};
exports.MinioService = MinioService;
exports.MinioService = MinioService = MinioService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MinioService);
//# sourceMappingURL=minio.service.js.map
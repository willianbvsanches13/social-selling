"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileUploadInterceptor = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
let FileUploadInterceptor = class FileUploadInterceptor {
    constructor() {
        this.maxFileSize = 10 * 1024 * 1024;
        this.allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'video/mp4',
            'video/quicktime',
            'video/x-msvideo',
            'video/x-matroska',
        ];
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const file = request.file;
        if (!file) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        if (file.size > this.maxFileSize) {
            throw new common_1.BadRequestException(`File size exceeds maximum allowed (${this.maxFileSize / 1024 / 1024}MB)`);
        }
        if (!this.allowedMimeTypes.includes(file.mimetype)) {
            throw new common_1.BadRequestException(`File type not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`);
        }
        const extension = file.originalname.split('.').pop();
        const filename = `${(0, uuid_1.v4)()}.${extension}`;
        request.file.generatedFilename = filename;
        return next.handle();
    }
};
exports.FileUploadInterceptor = FileUploadInterceptor;
exports.FileUploadInterceptor = FileUploadInterceptor = __decorate([
    (0, common_1.Injectable)()
], FileUploadInterceptor);
//# sourceMappingURL=file-upload.interceptor.js.map
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
  private readonly maxFileSize = 100 * 1024 * 1024; // 100MB (Instagram limit for videos)
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo', // AVI
    'video/x-matroska', // MKV
  ];

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const file = request.file;

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed (${this.maxFileSize / 1024 / 1024}MB)`,
      );
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    const extension = file.originalname.split('.').pop();
    const filename = `${uuidv4()}.${extension}`;
    request.file.generatedFilename = filename;

    return next.handle();
  }
}

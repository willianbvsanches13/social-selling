import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
export declare class FileUploadInterceptor implements NestInterceptor {
    private readonly maxFileSize;
    private readonly allowedMimeTypes;
    intercept(context: ExecutionContext, next: CallHandler): import("rxjs").Observable<any>;
}

import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
export declare class FileUploadInterceptor implements NestInterceptor {
    private readonly maxFileSize;
    private readonly allowedMimeTypes;
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> | Promise<Observable<any>>;
}

import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
export declare class SessionInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): import("rxjs").Observable<any>;
}

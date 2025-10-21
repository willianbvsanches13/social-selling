import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../../infrastructure/metrics/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const duration = Date.now() - startTime;

        // Skip /metrics endpoint to avoid recursive metrics
        if (request.path === '/metrics') {
          return;
        }

        // Normalize path to avoid high cardinality
        // Replace UUIDs and IDs with placeholders
        const normalizedPath = this.normalizePath(request.path);

        this.metricsService.recordRequest(
          request.method,
          normalizedPath,
          response.statusCode,
          duration,
        );
      }),
    );
  }

  /**
   * Normalize path to avoid high cardinality in metrics
   * Replace UUIDs, IDs, and other dynamic segments with placeholders
   */
  private normalizePath(path: string): string {
    return (
      path
        // Replace UUIDs
        .replace(
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
          ':id',
        )
        // Replace numeric IDs
        .replace(/\/\d+/g, '/:id')
        // Replace MongoDB-like ObjectIds
        .replace(/\/[0-9a-f]{24}/g, '/:id')
    );
  }
}

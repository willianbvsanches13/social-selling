import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Database } from '../../infrastructure/database/database';
import { CreateHttpRequestLogDto } from '../../domain/entities/http-request-log.entity';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpLoggingInterceptor.name);

  // Sensitive headers that should not be logged
  private readonly SENSITIVE_HEADERS = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'set-cookie',
  ];

  // Paths that should be excluded from logging (e.g., health checks, metrics)
  private readonly EXCLUDED_PATHS = [
    '/health',
    '/health/ready',
    '/health/live',
    '/metrics',
    '/api/metrics',
  ];

  constructor(private database: Database) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Skip excluded paths
    if (this.EXCLUDED_PATHS.includes(request.path)) {
      return next.handle();
    }

    const startTime = Date.now();

    // Extract request data
    const logData: Partial<CreateHttpRequestLogDto> = {
      method: request.method,
      url: request.url,
      path: request.path,
      query_params:
        request.query && Object.keys(request.query).length > 0
          ? request.query
          : undefined,
      request_headers: this.filterSensitiveHeaders(request.headers),
      request_body: this.sanitizeBody(request.body),
      ip_address: this.getClientIp(request),
      user_agent: request.headers['user-agent'],
      user_id: request.user?.id,
    };

    return next.handle().pipe(
      tap((data) => {
        const responseTime = Date.now() - startTime;

        // Log successful response (fire and forget - don't wait)
        this.logRequest({
          ...(logData as CreateHttpRequestLogDto),
          status_code: response.statusCode,
          response_time_ms: responseTime,
          response_headers: this.filterSensitiveHeaders(response.getHeaders()),
          response_body: this.sanitizeBody(data),
        }).catch((err) => {
          this.logger.error(`Failed to log successful request: ${err.message}`);
        });
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;

        // Log error response (fire and forget - don't wait)
        this.logRequest({
          ...(logData as CreateHttpRequestLogDto),
          status_code: error.status || 500,
          response_time_ms: responseTime,
          error_message: error.message,
          error_stack: error.stack,
          response_body: error.response,
        }).catch((err) => {
          this.logger.error(`Failed to log error request: ${err.message}`);
        });

        return throwError(() => error);
      }),
    );
  }

  private async logRequest(logData: CreateHttpRequestLogDto): Promise<void> {
    try {
      await this.database.query(
        `INSERT INTO http_request_logs (
          method, url, path, query_params, request_headers, response_headers,
          request_body, response_body, status_code, response_time_ms,
          error_message, error_stack, user_id, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          logData.method,
          logData.url,
          logData.path,
          logData.query_params ? JSON.stringify(logData.query_params) : null,
          logData.request_headers
            ? JSON.stringify(logData.request_headers)
            : null,
          logData.response_headers
            ? JSON.stringify(logData.response_headers)
            : null,
          logData.request_body ? JSON.stringify(logData.request_body) : null,
          logData.response_body ? JSON.stringify(logData.response_body) : null,
          logData.status_code,
          logData.response_time_ms,
          logData.error_message,
          logData.error_stack,
          logData.user_id,
          logData.ip_address,
          logData.user_agent,
        ],
      );
    } catch (error) {
      // Don't throw errors from logging - just log them
      this.logger.error(
        `Failed to log HTTP request: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private filterSensitiveHeaders(
    headers: Record<string, any>,
  ): Record<string, any> {
    const filtered: Record<string, any> = {};

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();

      if (this.SENSITIVE_HEADERS.includes(lowerKey)) {
        filtered[key] = '[REDACTED]';
      } else {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  private sanitizeBody(body: any): any {
    if (!body) {
      return undefined;
    }

    // Limit body size to prevent database bloat
    const stringified = JSON.stringify(body);
    const MAX_BODY_SIZE = 50000; // 50KB

    if (stringified.length > MAX_BODY_SIZE) {
      return {
        _truncated: true,
        _size: stringified.length,
        _preview: stringified.substring(0, 1000) + '...',
      };
    }

    // Redact sensitive fields
    if (typeof body === 'object') {
      return this.redactSensitiveFields(body);
    }

    return body;
  }

  private redactSensitiveFields(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactSensitiveFields(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const redacted: any = {};
      const sensitiveFields = [
        'password',
        'token',
        'secret',
        'apiKey',
        'api_key',
      ];

      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();

        if (sensitiveFields.some((field) => lowerKey.includes(field))) {
          redacted[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          redacted[key] = this.redactSensitiveFields(value);
        } else {
          redacted[key] = value;
        }
      }

      return redacted;
    }

    return obj;
  }

  private getClientIp(request: any): string {
    // Try to get IP from various headers (for proxies/load balancers)
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return realIp;
    }

    return request.ip || request.connection?.remoteAddress || 'unknown';
  }
}

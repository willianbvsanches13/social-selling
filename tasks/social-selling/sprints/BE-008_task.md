# BE-008: Error Handling and Logging

**Priority:** P1 (High)
**Effort:** 4 hours
**Day:** 6
**Dependencies:** BE-001, INFRA-003 (Centralized Logging)
**Domain:** Backend Core

---

## Overview

Implement comprehensive error handling and logging infrastructure for the entire backend application. This task provides centralized error management, structured logging, error tracking, and monitoring capabilities essential for debugging, auditing, and maintaining system health.

The system will include:
- Global exception filters for consistent error responses
- Structured logging with Winston and Pino
- Request/response logging middleware
- Error tracking integration (Sentry)
- Log aggregation and search capabilities
- Performance monitoring and tracing
- Audit log generation

---

## Technical Architecture

### Error Handling & Logging Stack

```
Error Handling & Logging Architecture
├── Exception Layer
│   ├── Global Exception Filter
│   ├── HTTP Exception Filter
│   ├── Database Exception Filter
│   ├── Validation Exception Filter
│   └── Custom Business Exceptions
├── Logging Layer
│   ├── Winston Logger (Development)
│   ├── Pino Logger (Production)
│   ├── Request Logger Middleware
│   ├── Error Logger
│   └── Audit Logger
├── Monitoring Layer
│   ├── Sentry Error Tracking
│   ├── Performance Metrics
│   ├── Custom Metrics (Prometheus)
│   └── Health Checks
└── Storage Layer
    ├── File-based Logs (Development)
    ├── CloudWatch Logs (AWS)
    ├── Log Rotation (daily)
    └── Log Retention (30 days)
```

---

## Data Models

### Error Response Schema

```typescript
// File: /backend/src/common/interfaces/error-response.interface.ts

export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  requestId: string;
  details?: Record<string, any>;
  stack?: string; // Only in development
}

export interface ValidationErrorResponse extends ErrorResponse {
  validationErrors: ValidationError[];
}

export interface ValidationError {
  field: string;
  constraints: Record<string, string>;
  value?: any;
}
```

### Log Entry Schema

```typescript
// File: /backend/src/common/interfaces/log-entry.interface.ts

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  error?: ErrorMetadata;
  performance?: PerformanceMetadata;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug' | 'verbose';

export interface ErrorMetadata {
  name: string;
  message: string;
  stack?: string;
  code?: string;
}

export interface PerformanceMetadata {
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
}

export interface AuditLogEntry {
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  result: 'success' | 'failure';
  requestId: string;
}
```

---

## Implementation Approach

### Phase 1: Custom Exception Classes (0.5 hours)

#### Step 1.1: Base Custom Exception

```typescript
// File: /backend/src/common/exceptions/base.exception.ts

import { HttpException, HttpStatus } from '@nestjs/common';

export class BaseException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly code?: string,
    public readonly details?: Record<string, any>,
  ) {
    super(
      {
        statusCode,
        message,
        error: HttpStatus[statusCode],
        code,
        details,
      },
      statusCode,
    );
  }
}
```

#### Step 1.2: Business Logic Exceptions

```typescript
// File: /backend/src/common/exceptions/business.exceptions.ts

import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class ResourceNotFoundException extends BaseException {
  constructor(resource: string, id: string) {
    super(
      `${resource} with ID ${id} not found`,
      HttpStatus.NOT_FOUND,
      'RESOURCE_NOT_FOUND',
      { resource, id },
    );
  }
}

export class ResourceAlreadyExistsException extends BaseException {
  constructor(resource: string, field: string, value: string) {
    super(
      `${resource} with ${field} '${value}' already exists`,
      HttpStatus.CONFLICT,
      'RESOURCE_ALREADY_EXISTS',
      { resource, field, value },
    );
  }
}

export class UnauthorizedException extends BaseException {
  constructor(message: string = 'Unauthorized') {
    super(message, HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
  }
}

export class ForbiddenException extends BaseException {
  constructor(message: string = 'Forbidden') {
    super(message, HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }
}

export class InvalidInputException extends BaseException {
  constructor(message: string, details?: Record<string, any>) {
    super(message, HttpStatus.BAD_REQUEST, 'INVALID_INPUT', details);
  }
}

export class ExternalServiceException extends BaseException {
  constructor(service: string, message: string) {
    super(
      `External service error from ${service}: ${message}`,
      HttpStatus.BAD_GATEWAY,
      'EXTERNAL_SERVICE_ERROR',
      { service, originalMessage: message },
    );
  }
}

export class RateLimitExceededException extends BaseException {
  constructor(limit: number, windowSeconds: number) {
    super(
      `Rate limit exceeded: ${limit} requests per ${windowSeconds} seconds`,
      HttpStatus.TOO_MANY_REQUESTS,
      'RATE_LIMIT_EXCEEDED',
      { limit, windowSeconds },
    );
  }
}

export class DatabaseException extends BaseException {
  constructor(operation: string, details?: Record<string, any>) {
    super(
      `Database operation failed: ${operation}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'DATABASE_ERROR',
      details,
    );
  }
}
```

---

### Phase 2: Global Exception Filter (1 hour)

#### Step 2.1: All Exceptions Filter

```typescript
// File: /backend/src/common/filters/all-exceptions.filter.ts

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse } from '../interfaces/error-response.interface';
import * as Sentry from '@sentry/node';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];
    let error: string;
    let details: Record<string, any> | undefined;
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = HttpStatus[status];
      } else {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        error = responseObj.error || HttpStatus[status];
        details = responseObj.details;
        code = responseObj.code;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message;
      error = 'Internal Server Error';
      code = 'INTERNAL_ERROR';
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      error = 'Internal Server Error';
      code = 'UNKNOWN_ERROR';
    }

    const requestId = request.headers['x-request-id'] as string || 'unknown';

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
      ...(code && { code }),
      ...(details && { details }),
    };

    // Include stack trace only in development
    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    // Log the error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      {
        exception,
        requestId,
        userId: (request as any).user?.id,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
    );

    // Send to Sentry in production
    if (process.env.NODE_ENV === 'production' && status >= 500) {
      Sentry.captureException(exception, {
        extra: {
          requestId,
          url: request.url,
          method: request.method,
          userId: (request as any).user?.id,
        },
      });
    }

    response.status(status).json(errorResponse);
  }
}
```

#### Step 2.2: Validation Exception Filter

```typescript
// File: /backend/src/common/filters/validation-exception.filter.ts

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ValidationErrorResponse } from '../interfaces/error-response.interface';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse() as any;
    const validationErrors = this.formatValidationErrors(
      exceptionResponse.message,
    );

    const errorResponse: ValidationErrorResponse = {
      statusCode: status,
      message: 'Validation failed',
      error: 'Bad Request',
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: (request.headers['x-request-id'] as string) || 'unknown',
      validationErrors,
    };

    response.status(status).json(errorResponse);
  }

  private formatValidationErrors(messages: any): any[] {
    if (Array.isArray(messages)) {
      return messages.map((msg) => {
        if (typeof msg === 'object') {
          return msg;
        }
        return { message: msg };
      });
    }
    return [{ message: messages }];
  }
}
```

---

### Phase 3: Winston Logger Configuration (1 hour)

#### Step 3.1: Logger Configuration

```typescript
// File: /backend/src/common/logging/logger.config.ts

import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

const logDir = process.env.LOG_DIR || 'logs';
const isDevelopment = process.env.NODE_ENV === 'development';

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'label'],
  }),
  winston.format.json(),
);

// Development console format
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.ms(),
  nestWinstonModuleUtilities.format.nestLike('SocialSelling', {
    colors: true,
    prettyPrint: true,
  }),
);

// Transports configuration
const transports: winston.transport[] = [];

// Console transport (always enabled in development)
if (isDevelopment) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug',
    }),
  );
}

// File transports for different log levels
transports.push(
  // Error logs
  new winston.transports.DailyRotateFile({
    filename: `${logDir}/error-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '30d',
    zippedArchive: true,
  }),

  // Combined logs
  new winston.transports.DailyRotateFile({
    filename: `${logDir}/combined-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '30d',
    zippedArchive: true,
  }),

  // HTTP access logs
  new winston.transports.DailyRotateFile({
    filename: `${logDir}/access-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    level: 'http',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
  }),
);

export const winstonConfig = {
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: `${logDir}/exceptions.log`,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: `${logDir}/rejections.log`,
    }),
  ],
};
```

#### Step 3.2: Custom Logger Service

```typescript
// File: /backend/src/common/logging/logger.service.ts

import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { createLogger, Logger as WinstonLogger } from 'winston';
import { winstonConfig } from './logger.config';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: WinstonLogger;
  private context?: string;

  constructor(context?: string) {
    this.logger = createLogger(winstonConfig);
    this.context = context;
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: string, metadata?: Record<string, any>) {
    this.logger.info(message, {
      context: context || this.context,
      ...metadata,
    });
  }

  error(
    message: string,
    trace?: string | Error,
    context?: string,
    metadata?: Record<string, any>,
  ) {
    const errorMetadata: Record<string, any> = {
      context: context || this.context,
      ...metadata,
    };

    if (trace instanceof Error) {
      errorMetadata.stack = trace.stack;
      errorMetadata.name = trace.name;
    } else if (trace) {
      errorMetadata.trace = trace;
    }

    this.logger.error(message, errorMetadata);
  }

  warn(message: string, context?: string, metadata?: Record<string, any>) {
    this.logger.warn(message, {
      context: context || this.context,
      ...metadata,
    });
  }

  debug(message: string, context?: string, metadata?: Record<string, any>) {
    this.logger.debug(message, {
      context: context || this.context,
      ...metadata,
    });
  }

  verbose(message: string, context?: string, metadata?: Record<string, any>) {
    this.logger.verbose(message, {
      context: context || this.context,
      ...metadata,
    });
  }

  // Custom methods
  http(message: string, metadata?: Record<string, any>) {
    this.logger.log('http', message, {
      context: this.context,
      ...metadata,
    });
  }

  audit(action: string, metadata: Record<string, any>) {
    this.logger.info(`AUDIT: ${action}`, {
      context: 'AuditLog',
      action,
      ...metadata,
    });
  }
}
```

---

### Phase 4: Request Logging Middleware (0.5 hours)

#### Step 4.1: HTTP Logger Middleware

```typescript
// File: /backend/src/common/middleware/http-logger.middleware.ts

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../logging/logger.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new LoggerService('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const requestId = req.headers['x-request-id'] || uuidv4();
    req.headers['x-request-id'] = requestId as string;

    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    // Log request
    this.logger.http(`Incoming ${method} ${originalUrl}`, {
      requestId,
      method,
      url: originalUrl,
      ip,
      userAgent,
      userId: (req as any).user?.id,
    });

    // Capture response
    const originalSend = res.send;
    res.send = function (data: any): Response {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      // Log response
      const logger = new LoggerService('HTTP');
      logger.http(`Response ${method} ${originalUrl} ${statusCode}`, {
        requestId,
        method,
        url: originalUrl,
        statusCode,
        duration,
        contentLength: res.get('content-length'),
      });

      // Call original send
      res.send = originalSend;
      return res.send(data);
    };

    next();
  }
}
```

---

### Phase 5: Sentry Integration (0.5 hours)

#### Step 5.1: Sentry Configuration

```typescript
// File: /backend/src/common/monitoring/sentry.config.ts

import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

export function initializeSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn('Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || '1.0.0',

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      new ProfilingIntegration(),
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Postgres(),
      new Sentry.Integrations.Redis(),
    ],

    // Error filtering
    beforeSend(event, hint) {
      // Filter out specific errors
      const error = hint.originalException;

      if (error instanceof Error) {
        // Don't send validation errors
        if (error.message.includes('Validation failed')) {
          return null;
        }

        // Don't send 404 errors
        if (error.message.includes('Not Found')) {
          return null;
        }
      }

      return event;
    },

    // Add custom tags
    initialScope: {
      tags: {
        service: 'backend-api',
      },
    },
  });

  console.log('✅ Sentry initialized');
}
```

#### Step 5.2: Sentry Interceptor

```typescript
// File: /backend/src/common/interceptors/sentry.interceptor.ts

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      catchError((error) => {
        Sentry.withScope((scope) => {
          scope.setUser({
            id: request.user?.id,
            email: request.user?.email,
          });

          scope.setContext('request', {
            method: request.method,
            url: request.url,
            headers: request.headers,
            body: request.body,
            query: request.query,
            params: request.params,
          });

          Sentry.captureException(error);
        });

        return throwError(() => error);
      }),
    );
  }
}
```

---

### Phase 6: Health Checks & Metrics (0.5 hours)

#### Step 6.1: Health Check Controller

```typescript
// File: /backend/src/modules/health/health.controller.ts

import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './indicators/redis-health.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.isHealthy('redis'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
      () => this.disk.checkStorage('storage', {
        path: '/',
        thresholdPercent: 0.9,
      }),
    ]);
  }

  @Get('ready')
  readiness() {
    return { status: 'ready' };
  }

  @Get('live')
  liveness() {
    return { status: 'alive' };
  }
}
```

#### Step 6.2: Custom Redis Health Indicator

```typescript
// File: /backend/src/modules/health/indicators/redis-health.indicator.ts

import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private redis: Redis;

  constructor(private configService: ConfigService) {
    super();
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST'),
      port: this.configService.get('REDIS_PORT'),
    });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.redis.ping();
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Redis health check failed',
        this.getStatus(key, false),
      );
    }
  }
}
```

---

## Testing Procedures

### Unit Tests

```typescript
// File: /backend/src/common/filters/__tests__/all-exceptions.filter.spec.ts

import { Test } from '@nestjs/testing';
import { AllExceptionsFilter } from '../all-exceptions.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(async () => {
    filter = new AllExceptionsFilter();

    mockRequest = {
      url: '/api/test',
      method: 'GET',
      headers: {},
      ip: '127.0.0.1',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockArgumentsHost = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ArgumentsHost;
  });

  it('should handle HttpException', () => {
    const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Test error',
        error: 'Bad Request',
      }),
    );
  });

  it('should handle generic Error', () => {
    const exception = new Error('Unexpected error');

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Unexpected error',
        error: 'Internal Server Error',
      }),
    );
  });

  it('should include stack trace in development', () => {
    process.env.NODE_ENV = 'development';
    const exception = new Error('Test error');

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        stack: expect.any(String),
      }),
    );
  });
});
```

### Integration Tests

```typescript
// File: /backend/src/common/logging/__tests__/logger.integration.spec.ts

import { LoggerService } from '../logger.service';
import * as fs from 'fs';
import * as path from 'path';

describe('LoggerService Integration', () => {
  let logger: LoggerService;
  const testLogDir = path.join(__dirname, 'test-logs');

  beforeAll(() => {
    process.env.LOG_DIR = testLogDir;
    logger = new LoggerService('TestContext');
  });

  afterAll(() => {
    // Cleanup test logs
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true });
    }
  });

  it('should log info message', () => {
    logger.log('Test info message', 'TestContext', { userId: '123' });
    // Verify log file created (actual file check would go here)
  });

  it('should log error with stack trace', () => {
    const error = new Error('Test error');
    logger.error('Error occurred', error, 'TestContext');
    // Verify error log created
  });

  it('should create audit log', () => {
    logger.audit('USER_LOGIN', {
      userId: '123',
      ip: '127.0.0.1',
      timestamp: new Date().toISOString(),
    });
    // Verify audit log entry
  });
});
```

---

## Acceptance Criteria

- [ ] Global exception filter catches all exceptions
- [ ] HTTP exception filter provides consistent error responses
- [ ] Validation exception filter formats validation errors properly
- [ ] Custom business exceptions defined for common scenarios
- [ ] Winston logger configured with file rotation
- [ ] Console logging enabled in development with pretty formatting
- [ ] File-based logging for error, combined, and access logs
- [ ] Log rotation configured (daily, 30-day retention)
- [ ] HTTP request/response logging middleware implemented
- [ ] Request ID generation and propagation
- [ ] Sentry integration for error tracking in production
- [ ] Sentry filters out non-critical errors (validation, 404s)
- [ ] Performance monitoring with Sentry tracing
- [ ] Health check endpoints (/health, /health/ready, /health/live)
- [ ] Database health indicator implemented
- [ ] Redis health indicator implemented
- [ ] Memory and disk health indicators configured
- [ ] Audit logging for sensitive operations
- [ ] Error responses include request ID for tracing
- [ ] Stack traces only exposed in development environment
- [ ] Structured logging with JSON format
- [ ] Log metadata includes context, user ID, timestamps
- [ ] Custom logger service injectable in modules
- [ ] Exception handling doesn't leak sensitive information
- [ ] All exceptions properly logged before being sent to client
- [ ] Integration tests for exception filters
- [ ] Unit tests for logger service

---

## Environment Variables

```bash
# Logging Configuration
LOG_DIR=logs
LOG_LEVEL=info # error, warn, info, http, debug, verbose
NODE_ENV=production # development, staging, production

# Sentry Configuration
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
APP_VERSION=1.0.0

# Health Checks
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_DATABASE=true
HEALTH_CHECK_REDIS=true
```

---

## File Structure

```
backend/
├── src/
│   ├── common/
│   │   ├── exceptions/
│   │   │   ├── base.exception.ts
│   │   │   ├── business.exceptions.ts
│   │   │   └── index.ts
│   │   ├── filters/
│   │   │   ├── all-exceptions.filter.ts
│   │   │   ├── validation-exception.filter.ts
│   │   │   └── __tests__/
│   │   ├── logging/
│   │   │   ├── logger.config.ts
│   │   │   ├── logger.service.ts
│   │   │   └── __tests__/
│   │   ├── middleware/
│   │   │   └── http-logger.middleware.ts
│   │   ├── interceptors/
│   │   │   └── sentry.interceptor.ts
│   │   ├── monitoring/
│   │   │   └── sentry.config.ts
│   │   └── interfaces/
│   │       ├── error-response.interface.ts
│   │       └── log-entry.interface.ts
│   ├── modules/
│   │   └── health/
│   │       ├── health.controller.ts
│   │       ├── health.module.ts
│   │       └── indicators/
│   │           └── redis-health.indicator.ts
│   └── main.ts
└── logs/
    ├── error-2025-10-18.log
    ├── combined-2025-10-18.log
    ├── access-2025-10-18.log
    ├── exceptions.log
    └── rejections.log
```

---

## Performance Considerations

1. **Asynchronous Logging**: Use async transports to avoid blocking
2. **Log Sampling**: Sample high-frequency logs in production
3. **Buffer Size**: Configure appropriate buffer sizes for file transports
4. **Log Rotation**: Automatic rotation prevents disk space issues
5. **Compression**: Compress archived logs to save space

---

## Security Considerations

1. **No Sensitive Data**: Never log passwords, tokens, or PII
2. **Stack Traces**: Only expose in development
3. **Request Body Logging**: Sanitize before logging
4. **Error Details**: Limit information in production responses
5. **Log Access**: Restrict access to log files

---

## Future Enhancements

- [ ] Integrate with CloudWatch Logs
- [ ] Add Prometheus metrics export
- [ ] Implement distributed tracing with OpenTelemetry
- [ ] Add log analytics dashboard
- [ ] Real-time log streaming
- [ ] Alert rules based on error patterns

---

**Task Status:** Ready for Implementation
**Estimated Completion Time:** 4 hours
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer

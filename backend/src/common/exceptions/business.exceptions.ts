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

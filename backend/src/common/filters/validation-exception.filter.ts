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

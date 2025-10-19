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

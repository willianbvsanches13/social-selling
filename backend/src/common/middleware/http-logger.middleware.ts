import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../logging/logger.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new LoggerService('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    // Skip health check and metrics endpoints
    const excludedPaths = ['/health', '/health/ready', '/health/live', '/metrics', '/api/metrics'];
    if (excludedPaths.includes(req.path)) {
      next();
      return;
    }

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

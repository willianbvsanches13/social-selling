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

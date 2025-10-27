import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as path from 'path';

const isDevelopment = process.env.NODE_ENV === 'development';
// Use absolute path for logs in production, relative in development
const logDir =
  process.env.LOG_DIR ||
  (isDevelopment ? 'logs' : path.join(process.cwd(), 'logs'));

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

// Console transport (always enabled)
const consoleTransport = new winston.transports.Console({
  format: isDevelopment ? consoleFormat : logFormat,
  level: isDevelopment ? 'debug' : 'info',
});
// Set unlimited listeners to prevent warnings (0 = unlimited)
// Multiple NestJS modules use the logger simultaneously
consoleTransport.setMaxListeners(0);
transports.push(consoleTransport);

// File transports only in development
if (isDevelopment) {
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
}

// Exception and rejection handlers
const exceptionConsole = new winston.transports.Console({
  format: logFormat,
});
exceptionConsole.setMaxListeners(0); // Unlimited

const rejectionConsole = new winston.transports.Console({
  format: logFormat,
});
rejectionConsole.setMaxListeners(0); // Unlimited

const exceptionHandlers: winston.transport[] = [exceptionConsole];
const rejectionHandlers: winston.transport[] = [rejectionConsole];

// Only add file handlers in development
if (isDevelopment) {
  exceptionHandlers.push(
    new winston.transports.File({
      filename: `${logDir}/exceptions.log`,
    }),
  );
  rejectionHandlers.push(
    new winston.transports.File({
      filename: `${logDir}/rejections.log`,
    }),
  );
}

export const winstonConfig = {
  transports,
  exceptionHandlers,
  rejectionHandlers,
};

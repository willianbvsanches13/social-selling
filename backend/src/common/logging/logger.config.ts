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

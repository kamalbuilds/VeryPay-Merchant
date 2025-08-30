import winston from 'winston';
import { config } from './config';
import { LogEntry } from '../types';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'verypay-merchant-api' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Add console transport in development
if (config.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export class Logger {
  static info(message: string, metadata?: Record<string, any>): void {
    logger.info(message, metadata);
  }

  static warn(message: string, metadata?: Record<string, any>): void {
    logger.warn(message, metadata);
  }

  static error(message: string, error?: Error | any, metadata?: Record<string, any>): void {
    const logData = {
      ...metadata,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    };
    logger.error(message, logData);
  }

  static debug(message: string, metadata?: Record<string, any>): void {
    logger.debug(message, metadata);
  }

  static logTransaction(
    level: 'info' | 'warn' | 'error',
    message: string,
    transactionId: string,
    userId?: string,
    merchantId?: string,
    metadata?: Record<string, any>
  ): void {
    const logData = {
      transactionId,
      userId,
      merchantId,
      ...metadata
    };

    logger.log(level, message, logData);
  }

  static logAPI(
    method: string,
    endpoint: string,
    statusCode: number,
    responseTime: number,
    userId?: string,
    error?: Error
  ): void {
    const logData = {
      method,
      endpoint,
      statusCode,
      responseTime,
      userId,
      error: error ? {
        name: error.name,
        message: error.message
      } : undefined
    };

    if (statusCode >= 400) {
      logger.error(`API Request Failed: ${method} ${endpoint}`, logData);
    } else {
      logger.info(`API Request: ${method} ${endpoint}`, logData);
    }
  }

  static createLogEntry(
    level: LogEntry['level'],
    message: string,
    userId?: string,
    merchantId?: string,
    transactionId?: string,
    metadata?: Record<string, any>
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      userId,
      merchantId,
      transactionId,
      metadata
    };
  }
}

export default logger;
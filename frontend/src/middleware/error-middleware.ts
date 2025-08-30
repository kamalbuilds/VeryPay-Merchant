import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';
import { ApiResponse, APIError, ValidationError } from '../types';
import { config } from '../utils/config';

/**
 * Global error handler middleware
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  Logger.error('Unhandled error', error, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    requestId: req.get('X-Request-ID')
  });

  // Default error response
  let statusCode = 500;
  let errorMessage = 'Internal server error';
  let errorCode = 'INTERNAL_ERROR';
  let details: any = undefined;

  // Handle different error types
  if (error instanceof APIError) {
    statusCode = error.statusCode;
    errorMessage = error.message;
    errorCode = error.code;
    details = error.details;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = 'Validation failed';
    errorCode = 'VALIDATION_ERROR';
    details = error.details || error.message;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    errorMessage = 'Invalid data format';
    errorCode = 'INVALID_FORMAT';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorMessage = 'Invalid token';
    errorCode = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    errorMessage = 'Token expired';
    errorCode = 'TOKEN_EXPIRED';
  } else if (error.name === 'MongoError' || error.name === 'MongooseError') {
    statusCode = 500;
    errorMessage = 'Database error';
    errorCode = 'DATABASE_ERROR';
  } else if (error.code === 'ECONNREFUSED') {
    statusCode = 503;
    errorMessage = 'Service temporarily unavailable';
    errorCode = 'SERVICE_UNAVAILABLE';
  } else if (error.code === 'ENOTFOUND') {
    statusCode = 503;
    errorMessage = 'External service unreachable';
    errorCode = 'SERVICE_UNREACHABLE';
  } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
    statusCode = 400;
    errorMessage = 'Invalid JSON format';
    errorCode = 'INVALID_JSON';
  } else if (error.message) {
    errorMessage = error.message;
  }

  // Create error response
  const errorResponse: ApiResponse = {
    success: false,
    error: errorMessage,
    timestamp: new Date().toISOString()
  };

  // Add additional fields in development mode
  if (config.nodeEnv === 'development') {
    (errorResponse as any).code = errorCode;
    if (details) {
      (errorResponse as any).details = details;
    }
    if (error.stack) {
      (errorResponse as any).stack = error.stack;
    }
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const errorResponse: ApiResponse = {
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  };

  res.status(404).json(errorResponse);
};

/**
 * Async error wrapper - wraps async route handlers to catch errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation error formatter
 */
export const formatValidationErrors = (errors: ValidationError[]): any => {
  return {
    message: 'Validation failed',
    errors: errors.map(error => ({
      field: error.field,
      message: error.message,
      value: error.value
    }))
  };
};

/**
 * Custom API Error class
 */
export class CustomAPIError extends Error implements APIError {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'API_ERROR', details?: any) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CustomAPIError);
    }
  }
}

/**
 * Specific error classes
 */
export class BadRequestError extends CustomAPIError {
  constructor(message: string = 'Bad request', details?: any) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends CustomAPIError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends CustomAPIError {
  constructor(message: string = 'Forbidden', details?: any) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class NotFoundError extends CustomAPIError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class ConflictError extends CustomAPIError {
  constructor(message: string = 'Conflict', details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class ValidationErrorCustom extends CustomAPIError {
  constructor(message: string = 'Validation failed', details?: ValidationError[]) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export class InternalServerError extends CustomAPIError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(message, 500, 'INTERNAL_ERROR', details);
  }
}

export class ServiceUnavailableError extends CustomAPIError {
  constructor(message: string = 'Service unavailable', details?: any) {
    super(message, 503, 'SERVICE_UNAVAILABLE', details);
  }
}

/**
 * Error response helpers
 */
export const createErrorResponse = (
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): ApiResponse => {
  const response: ApiResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };

  if (config.nodeEnv === 'development') {
    if (code) (response as any).code = code;
    if (details) (response as any).details = details;
  }

  return response;
};

export const sendErrorResponse = (
  res: Response,
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
) => {
  const errorResponse = createErrorResponse(message, statusCode, code, details);
  res.status(statusCode).json(errorResponse);
};

export default errorHandler;
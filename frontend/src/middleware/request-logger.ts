import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';

interface RequestWithId extends Request {
  requestId: string;
  startTime: number;
}

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestWithId = req as RequestWithId;
  
  // Generate unique request ID
  requestWithId.requestId = uuidv4();
  requestWithId.startTime = Date.now();

  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestWithId.requestId);

  // Log request start
  Logger.info('Request started', {
    requestId: requestWithId.requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id,
    contentLength: req.get('Content-Length'),
    contentType: req.get('Content-Type')
  });

  // Override res.end to capture response details
  const originalEnd = res.end;
  const originalJson = res.json;

  // Capture response body for logging (be careful with large responses)
  let responseBody: any;
  res.json = function(body: any) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  res.end = function(chunk: any, encoding?: any) {
    const responseTime = Date.now() - requestWithId.startTime;
    
    // Log request completion
    Logger.logAPI(
      req.method,
      req.originalUrl,
      res.statusCode,
      responseTime,
      (req as any).user?.id
    );

    // Detailed logging for different status codes
    if (res.statusCode >= 400) {
      Logger.error('Request failed', undefined, {
        requestId: requestWithId.requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime,
        userId: (req as any).user?.id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        responseBody: responseBody && typeof responseBody === 'object' ? 
          JSON.stringify(responseBody).substring(0, 500) + '...' : 
          responseBody
      });
    } else if (responseTime > 2000) { // Log slow requests (> 2 seconds)
      Logger.warn('Slow request detected', {
        requestId: requestWithId.requestId,
        method: req.method,
        url: req.originalUrl,
        responseTime,
        userId: (req as any).user?.id
      });
    }

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');

  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // HSTS header for HTTPS
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
};

/**
 * Request validation middleware
 */
export const requestValidation = (req: Request, res: Response, next: NextFunction) => {
  // Check for required headers
  const requiredHeaders = ['content-type'];
  
  for (const header of requiredHeaders) {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (!req.get(header)) {
        return res.status(400).json({
          success: false,
          error: `Missing required header: ${header}`,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  // Validate Content-Type for POST/PUT requests
  if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
    const contentType = req.get('Content-Type');
    if (contentType && !contentType.includes('application/json')) {
      return res.status(415).json({
        success: false,
        error: 'Unsupported Media Type. Expected application/json',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Check request size limits
  const contentLength = parseInt(req.get('Content-Length') || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      error: 'Request entity too large',
      timestamp: new Date().toISOString()
    });
  }

  next();
};

/**
 * Response time tracker
 */
export const responseTimeTracker = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const responseTimeMs = Number(end - start) / 1000000; // Convert to milliseconds

    res.setHeader('X-Response-Time', `${responseTimeMs.toFixed(2)}ms`);
  });

  next();
};

/**
 * Request timeout middleware
 */
export const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set timeout for the request
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        Logger.warn('Request timeout', {
          method: req.method,
          url: req.originalUrl,
          timeout: timeoutMs,
          userId: (req as any).user?.id
        });

        res.status(408).json({
          success: false,
          error: 'Request timeout',
          timeout: timeoutMs,
          timestamp: new Date().toISOString()
        });
      }
    }, timeoutMs);

    // Clear timeout when response finishes
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    // Clear timeout when response closes
    res.on('close', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

export default requestLogger;
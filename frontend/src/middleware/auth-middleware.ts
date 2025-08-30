import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config';
import { Logger } from '../utils/logger';
import { User, JWTPayload } from '../types';

export interface AuthenticatedRequest extends Request {
  user: User;
}

export class AuthMiddleware {
  /**
   * Verify JWT token
   */
  static async verifyToken(token: string): Promise<User> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
      
      // In a real application, you would fetch user from database
      // For now, we'll construct user from JWT payload
      const user: User = {
        id: decoded.userId,
        email: decoded.email,
        walletAddress: '', // Would be fetched from DB
        merchantId: decoded.merchantId,
        role: decoded.role as any,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return user;
    } catch (error) {
      Logger.error('Token verification failed', error, { 
        token: token.substring(0, 10) + '...' 
      });
      throw new Error('Invalid token');
    }
  }

  /**
   * Generate JWT token
   */
  static generateToken(user: User): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role,
      merchantId: user.merchantId
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, config.jwt.refreshSecret, {
      expiresIn: '30d'
    });
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, config.jwt.refreshSecret) as { userId: string };
      return decoded;
    } catch (error) {
      Logger.error('Refresh token verification failed', error);
      throw new Error('Invalid refresh token');
    }
  }
}

/**
 * Express middleware to authenticate requests
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required',
        timestamp: new Date().toISOString()
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const user = await AuthMiddleware.verifyToken(token);
    (req as AuthenticatedRequest).user = user;

    next();

  } catch (error) {
    Logger.error('Authentication middleware failed', error, {
      path: req.path,
      method: req.method,
      ip: req.ip
    });

    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Middleware to check if user is a merchant
 */
export const requireMerchant = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user.merchantId) {
    return res.status(403).json({
      success: false,
      error: 'Merchant access required',
      timestamp: new Date().toISOString()
    });
  }

  next();
};

/**
 * Middleware to check if user is an admin
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as AuthenticatedRequest).user;

  if (user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      timestamp: new Date().toISOString()
    });
  }

  next();
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await AuthMiddleware.verifyToken(token);
      (req as AuthenticatedRequest).user = user;
    }

    next();

  } catch (error) {
    // Log but don't fail the request
    Logger.warn('Optional authentication failed', { 
      path: req.path,
      error: error.message 
    });
    next();
  }
};

export default authMiddleware;
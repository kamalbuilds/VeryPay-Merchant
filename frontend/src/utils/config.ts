import dotenv from 'dotenv';
import { AppConfig } from '../types';

dotenv.config();

const requiredEnvVars = [
  'JWT_SECRET',
  'VERY_NETWORK_RPC',
  'REDIS_URL'
];

// Validate required environment variables
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '4000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiVersion: process.env.API_VERSION || 'v1',
  
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET!
  },
  
  blockchain: {
    rpcUrl: process.env.VERY_NETWORK_RPC!,
    chainId: parseInt(process.env.VERY_NETWORK_CHAIN_ID || '8848'),
    networkName: 'Very Network',
    blockTime: 3, // 3 seconds
    confirmationsRequired: parseInt(process.env.CONFIRMATIONS_REQUIRED || '12')
  },
  
  redis: {
    url: process.env.REDIS_URL!,
    db: parseInt(process.env.REDIS_DB || '0')
  },
  
  email: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.FROM_EMAIL || 'noreply@verypay.tech'
  },
  
  push: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || ''
  }
};

export const isProduction = config.nodeEnv === 'production';
export const isDevelopment = config.nodeEnv === 'development';
export const isTest = config.nodeEnv === 'test';
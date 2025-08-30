import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { readFileSync } from 'fs';
import { join } from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { config } from '../utils/config';
import { Logger } from '../utils/logger';
import resolvers, { Context } from './resolvers';
import { authMiddleware } from '../middleware/auth-middleware';
import { errorHandler } from '../middleware/error-middleware';
import { requestLogger } from '../middleware/request-logger';

// Import REST routes
import transactionRoutes from './routes/transactions';
import webhookRoutes from './routes/webhooks';
import healthRoutes from './routes/health';

// Import services
import { RedisService } from '../services/redis-service';
import { NotificationService } from '../services/notification-service';
import { TransactionService } from '../services/transaction-service';

class VeryPayServer {
  private app: express.Application;
  private apolloServer?: ApolloServer;
  private httpServer?: any;
  private wsServer?: WebSocketServer;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      message: {
        error: 'Too many requests from this IP, please try again later',
        retryAfter: config.rateLimit.windowMs / 1000
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/api/health';
      }
    });

    this.app.use('/api', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use(requestLogger);

    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.use('/api/health', healthRoutes);
    this.app.use('/health', healthRoutes);

    // REST API routes
    this.app.use('/api/v1/transactions', authMiddleware, transactionRoutes);
    this.app.use('/api/v1/webhooks', webhookRoutes);

    // Error handling middleware
    this.app.use(errorHandler);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        message: `${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });
  }

  private async setupGraphQL(): Promise<void> {
    try {
      // Load GraphQL schema
      const typeDefs = readFileSync(join(__dirname, 'schema.graphql'), 'utf-8');
      
      // Create executable schema
      const schema = makeExecutableSchema({
        typeDefs,
        resolvers
      });

      // Create Apollo Server
      this.apolloServer = new ApolloServer({
        schema,
        context: async ({ req, connection }) => {
          // WebSocket connection context
          if (connection) {
            return connection.context;
          }

          // HTTP request context
          const context: Context = {
            isAuthenticated: false
          };

          // Extract and verify JWT token
          const authHeader = req.headers.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
              const user = await authMiddleware.verifyToken(token);
              context.user = user;
              context.isAuthenticated = true;
            } catch (error) {
              Logger.warn('Invalid JWT token in GraphQL context', { token: token.substring(0, 10) + '...' });
            }
          }

          return context;
        },
        plugins: [
          {
            requestDidStart() {
              return {
                didResolveOperation(requestContext) {
                  Logger.info('GraphQL Operation', {
                    operationName: requestContext.request.operationName,
                    query: requestContext.request.query?.substring(0, 100) + '...'
                  });
                },
                didEncounterErrors(requestContext) {
                  requestContext.errors?.forEach(error => {
                    Logger.error('GraphQL Error', error, {
                      operationName: requestContext.request.operationName
                    });
                  });
                }
              };
            }
          }
        ],
        introspection: config.nodeEnv !== 'production',
        debug: config.nodeEnv === 'development'
      });

      await this.apolloServer.start();
      this.apolloServer.applyMiddleware({ 
        app: this.app, 
        path: '/graphql',
        cors: false // Already configured above
      });

      Logger.info('GraphQL server configured', {
        path: '/graphql',
        introspection: config.nodeEnv !== 'production'
      });

    } catch (error) {
      Logger.error('Failed to setup GraphQL server', error);
      throw error;
    }
  }

  private setupWebSocket(): void {
    try {
      if (!this.httpServer) {
        throw new Error('HTTP server not initialized');
      }

      // Create WebSocket server
      this.wsServer = new WebSocketServer({
        server: this.httpServer,
        path: '/graphql'
      });

      // Load GraphQL schema for WebSocket
      const typeDefs = readFileSync(join(__dirname, 'schema.graphql'), 'utf-8');
      const schema = makeExecutableSchema({
        typeDefs,
        resolvers
      });

      // Setup GraphQL WebSocket server
      const serverCleanup = useServer({
        schema,
        context: async (ctx, msg, args) => {
          // WebSocket authentication context
          const token = ctx.connectionParams?.authorization?.replace('Bearer ', '');
          const context: Context = {
            isAuthenticated: false
          };

          if (token) {
            try {
              const user = await authMiddleware.verifyToken(token);
              context.user = user;
              context.isAuthenticated = true;
            } catch (error) {
              Logger.warn('Invalid JWT token in WebSocket context');
            }
          }

          return context;
        },
        onConnect: async (ctx) => {
          Logger.info('WebSocket connection established', {
            connectionParams: Object.keys(ctx.connectionParams || {})
          });
        },
        onDisconnect: () => {
          Logger.info('WebSocket connection closed');
        },
        onError: (ctx, msg, errors) => {
          Logger.error('WebSocket error', errors[0], {
            message: msg
          });
        }
      }, this.wsServer);

      // Cleanup function for graceful shutdown
      process.on('SIGTERM', serverCleanup);

      Logger.info('WebSocket server configured', {
        path: '/graphql'
      });

    } catch (error) {
      Logger.error('Failed to setup WebSocket server', error);
      throw error;
    }
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize Redis connection
      await RedisService.initialize();
      Logger.info('Redis service initialized');

      // Initialize notification service
      await NotificationService.initialize();
      Logger.info('Notification service initialized');

      // Initialize transaction monitoring
      await TransactionService.initialize();
      Logger.info('Transaction service initialized');

      Logger.info('All services initialized successfully');

    } catch (error) {
      Logger.error('Failed to initialize services', error);
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      // Initialize services first
      await this.initializeServices();

      // Create HTTP server
      this.httpServer = createServer(this.app);

      // Setup GraphQL
      await this.setupGraphQL();

      // Setup WebSocket
      this.setupWebSocket();

      // Start server
      this.httpServer.listen(config.port, () => {
        Logger.info('VeryPay Merchant API Server started', {
          port: config.port,
          nodeEnv: config.nodeEnv,
          graphqlPath: '/graphql',
          websocketPath: '/graphql'
        });

        console.log(`
🚀 VeryPay Merchant API Server ready at:
   HTTP:      http://localhost:${config.port}
   GraphQL:   http://localhost:${config.port}/graphql
   WebSocket: ws://localhost:${config.port}/graphql
   
Environment: ${config.nodeEnv}
        `);
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown();

    } catch (error) {
      Logger.error('Failed to start server', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      Logger.info(`Received ${signal}. Starting graceful shutdown...`);

      try {
        // Close HTTP server
        if (this.httpServer) {
          this.httpServer.close(() => {
            Logger.info('HTTP server closed');
          });
        }

        // Close WebSocket server
        if (this.wsServer) {
          this.wsServer.close(() => {
            Logger.info('WebSocket server closed');
          });
        }

        // Stop Apollo server
        if (this.apolloServer) {
          await this.apolloServer.stop();
          Logger.info('Apollo server stopped');
        }

        // Close database connections and cleanup
        await RedisService.disconnect();
        await TransactionService.cleanup();
        await NotificationService.cleanup();

        Logger.info('Graceful shutdown completed');
        process.exit(0);

      } catch (error) {
        Logger.error('Error during graceful shutdown', error);
        process.exit(1);
      }
    };

    // Handle different termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      Logger.error('Uncaught exception', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      Logger.error('Unhandled rejection', reason as Error, { promise });
      process.exit(1);
    });
  }

  public getApp(): express.Application {
    return this.app;
  }

  public getHttpServer() {
    return this.httpServer;
  }
}

// Start server if this file is executed directly
if (require.main === module) {
  const server = new VeryPayServer();
  server.start().catch((error) => {
    Logger.error('Failed to start server', error);
    process.exit(1);
  });
}

export default VeryPayServer;
# VeryPay API Architecture

## 1. API Architecture Overview

VeryPay API follows a microservices architecture with GraphQL for client-facing APIs and REST for internal service communication. The system emphasizes security, performance, and developer experience with comprehensive documentation and testing.

## 2. Architecture Principles

### 2.1 Design Principles
- **API-First Development**: Contracts defined before implementation
- **GraphQL for Clients**: Flexible querying and strong typing
- **REST for Services**: Simple, stateless internal communication
- **Event-Driven**: Asynchronous processing with message queues
- **Rate Limited**: Protection against abuse and DoS
- **Versioned**: Backward compatibility and smooth migrations
- **Documented**: OpenAPI/GraphQL schema documentation

### 2.2 Quality Attributes
- **Performance**: < 100ms response times for 95th percentile
- **Scalability**: Horizontal scaling with load balancing
- **Security**: JWT authentication, API key management, RBAC
- **Reliability**: Circuit breakers, retries, health checks
- **Observability**: Comprehensive logging, metrics, and tracing

## 3. API Gateway Architecture

### 3.1 Gateway Configuration
```typescript
// API Gateway setup with Express.js
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

const app = express();

// Security middleware
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Service proxies
app.use('/api/merchants', createProxyMiddleware({
  target: 'http://merchant-service:3001',
  changeOrigin: true,
  pathRewrite: { '^/api/merchants': '/' },
}));

app.use('/api/payments', createProxyMiddleware({
  target: 'http://payment-service:3002',
  changeOrigin: true,
  pathRewrite: { '^/api/payments': '/' },
}));
```

### 3.2 Authentication Middleware
```typescript
import jwt from 'jsonwebtoken';
import { Redis } from 'ioredis';

interface AuthRequest extends Request {
  user?: {
    id: string;
    merchantId?: string;
    role: string;
    permissions: string[];
  };
}

const redis = new Redis(process.env.REDIS_URL!);

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const apiKey = req.headers['x-api-key'] as string;
    
    if (apiKey) {
      // API Key authentication
      const keyData = await redis.hgetall(`api_key:${apiKey}`);
      if (!keyData.merchant_id) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      
      // Check rate limiting
      const key = `rate_limit:${apiKey}:${Math.floor(Date.now() / 60000)}`;
      const requests = await redis.incr(key);
      await redis.expire(key, 60);
      
      if (requests > parseInt(keyData.rate_limit || '1000')) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
      
      req.user = {
        id: keyData.merchant_id,
        merchantId: keyData.merchant_id,
        role: 'merchant',
        permissions: JSON.parse(keyData.permissions || '[]'),
      };
      
      // Update last used
      await redis.hset(`api_key:${apiKey}`, 'last_used', Date.now());
      
    } else if (authHeader) {
      // JWT authentication
      const token = authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Access token required' });
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // Check if token is blacklisted
      const isBlacklisted = await redis.get(`blacklist:${token}`);
      if (isBlacklisted) {
        return res.status(401).json({ error: 'Token has been revoked' });
      }
      
      req.user = decoded;
    } else {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user?.permissions.includes(permission)) {
      return res.status(403).json({ error: `Permission required: ${permission}` });
    }
    next();
  };
};
```

## 4. GraphQL API Design

### 4.1 Schema Definition
```graphql
# Core types
scalar DateTime
scalar Decimal
scalar JSON
scalar Upload

enum TransactionStatus {
  PENDING
  CONFIRMED
  FAILED
  REFUNDED
  DISPUTED
}

enum MerchantStatus {
  PENDING
  APPROVED
  REJECTED
  SUSPENDED
}

# User types
type User {
  id: ID!
  walletAddress: String!
  email: String
  displayName: String
  profileImage: String
  reputationScore: Int!
  isActive: Boolean!
  createdAt: DateTime!
}

# Merchant types
type Merchant {
  id: ID!
  user: User!
  businessName: String!
  businessDescription: String
  businessCategory: String!
  businessType: String!
  website: String
  logoUrl: String
  contactInfo: JSON
  paymentSettings: JSON
  complianceStatus: MerchantStatus!
  riskScore: Int!
  monthlyVolumeLimit: Decimal!
  totalTransactions: Int!
  totalVolume: Decimal!
  isActive: Boolean!
  createdAt: DateTime!
  
  # Computed fields
  analytics(timeframe: TimeframeInput): MerchantAnalytics
  recentTransactions(limit: Int = 10): [Transaction!]!
  paymentIntents(status: String, limit: Int = 20): [PaymentIntent!]!
  rewards(status: String, limit: Int = 20): [Reward!]!
}

type MerchantAnalytics {
  transactionCount: Int!
  successfulTransactions: Int!
  failedTransactions: Int!
  totalVolume: Decimal!
  totalFees: Decimal!
  totalRewards: Decimal!
  uniqueCustomers: Int!
  averageTransactionValue: Decimal!
  conversionRate: Float!
  topPaymentTokens: [TokenStats!]!
  dailyStats: [DailyStats!]!
}

# Transaction types
type Transaction {
  id: ID!
  blockchainTxHash: String!
  merchant: Merchant!
  customerWalletAddress: String!
  paymentIntent: PaymentIntent
  orderId: String
  token: Token!
  amountRequested: Decimal!
  amountPaid: Decimal!
  amountRefunded: Decimal
  platformFee: Decimal!
  status: TransactionStatus!
  confirmationCount: Int!
  requiredConfirmations: Int!
  metadata: JSON
  confirmedAt: DateTime
  createdAt: DateTime!
}

type PaymentIntent {
  id: ID!
  merchant: Merchant!
  orderId: String
  description: String
  amount: Decimal!
  token: Token!
  status: String!
  paymentLink: String
  qrCodeData: String
  metadata: JSON
  successUrl: String
  cancelUrl: String
  expiresAt: DateTime!
  createdAt: DateTime!
}

type Token {
  address: String!
  symbol: String!
  name: String!
  decimals: Int!
  chainId: Int!
  logoUrl: String
  isStablecoin: Boolean!
  minPaymentAmount: Decimal
  maxPaymentAmount: Decimal
  platformFeeRate: Decimal!
}

type Reward {
  id: ID!
  merchant: Merchant!
  transaction: Transaction
  rewardType: String!
  token: Token!
  amount: Decimal!
  multiplier: Decimal!
  status: String!
  expiresAt: DateTime
  distributedAt: DateTime
  claimedAt: DateTime
  createdAt: DateTime!
}

# Input types
input MerchantRegistrationInput {
  businessName: String!
  businessDescription: String
  businessCategory: String!
  businessType: String!
  website: String
  contactInfo: JSON
  acceptedTokens: [String!]!
}

input PaymentIntentInput {
  orderId: String
  description: String
  amount: Decimal!
  tokenAddress: String!
  metadata: JSON
  successUrl: String
  cancelUrl: String
  expiresIn: Int = 3600 # seconds
}

input ProcessPaymentInput {
  paymentIntentId: ID!
  transactionHash: String!
  signature: String!
}

input TimeframeInput {
  startDate: DateTime!
  endDate: DateTime!
  granularity: String = "day" # day, week, month
}

# Root types
type Query {
  # User queries
  me: User
  user(id: ID!): User
  
  # Merchant queries
  merchant(id: ID!): Merchant
  merchants(
    category: String
    status: MerchantStatus
    limit: Int = 20
    offset: Int = 0
    orderBy: String = "createdAt"
    orderDirection: String = "DESC"
  ): MerchantConnection!
  
  # Transaction queries
  transaction(id: ID!): Transaction
  transactions(
    merchantId: ID
    status: TransactionStatus
    tokenAddress: String
    limit: Int = 20
    offset: Int = 0
  ): TransactionConnection!
  
  # Payment intent queries
  paymentIntent(id: ID!): PaymentIntent
  paymentIntentByLink(link: String!): PaymentIntent
  
  # Token queries
  supportedTokens(chainId: Int): [Token!]!
  
  # Analytics queries
  platformAnalytics(timeframe: TimeframeInput!): PlatformAnalytics
  
  # System queries
  systemHealth: HealthStatus!
  systemSettings: JSON
}

type Mutation {
  # Authentication
  login(walletAddress: String!, signature: String!): AuthPayload!
  logout: Boolean!
  refreshToken: AuthPayload!
  
  # Merchant operations
  registerMerchant(input: MerchantRegistrationInput!): Merchant!
  updateMerchantProfile(id: ID!, input: UpdateMerchantInput!): Merchant!
  uploadMerchantDocument(merchantId: ID!, file: Upload!, type: String!): Document!
  
  # Payment operations
  createPaymentIntent(input: PaymentIntentInput!): PaymentIntent!
  updatePaymentIntent(id: ID!, input: UpdatePaymentIntentInput!): PaymentIntent!
  cancelPaymentIntent(id: ID!): PaymentIntent!
  processPayment(input: ProcessPaymentInput!): Transaction!
  refundTransaction(id: ID!, reason: String): Transaction!
  
  # API key management
  createApiKey(merchantId: ID!, input: CreateApiKeyInput!): ApiKey!
  updateApiKey(id: ID!, input: UpdateApiKeyInput!): ApiKey!
  deactivateApiKey(id: ID!): Boolean!
  
  # Reward operations
  claimRewards(merchantId: ID!, tokenAddress: String!): ClaimResult!
  
  # Admin operations (admin role required)
  verifyMerchant(id: ID!): Merchant!
  suspendMerchant(id: ID!, reason: String!): Merchant!
  updateSystemSettings(settings: JSON!): Boolean!
}

type Subscription {
  # Real-time transaction updates
  transactionUpdates(merchantId: ID): Transaction!
  
  # Payment intent status changes
  paymentIntentUpdates(id: ID!): PaymentIntent!
  
  # Reward notifications
  rewardUpdates(merchantId: ID!): Reward!
  
  # System notifications
  notifications(userId: ID!): Notification!
}

# Connection types for pagination
type MerchantConnection {
  edges: [MerchantEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type MerchantEdge {
  node: Merchant!
  cursor: String!
}

type TransactionConnection {
  edges: [TransactionEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type TransactionEdge {
  node: Transaction!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type AuthPayload {
  token: String!
  refreshToken: String!
  expiresAt: DateTime!
  user: User!
}
```

### 4.2 GraphQL Resolvers
```typescript
import { GraphQLResolvers } from 'generated/graphql';
import { AuthenticationError, ForbiddenError, UserInputError } from 'apollo-server-express';
import { withFilter } from 'graphql-subscriptions';

export const resolvers: GraphQLResolvers = {
  Query: {
    me: async (_, __, { user, dataSources }) => {
      if (!user) throw new AuthenticationError('Authentication required');
      return dataSources.userAPI.findById(user.id);
    },
    
    merchant: async (_, { id }, { user, dataSources }) => {
      const merchant = await dataSources.merchantAPI.findById(id);
      if (!merchant) throw new UserInputError('Merchant not found');
      
      // Check permissions
      if (user.role !== 'admin' && user.merchantId !== id) {
        throw new ForbiddenError('Access denied');
      }
      
      return merchant;
    },
    
    merchants: async (_, args, { dataSources }) => {
      const { category, status, limit, offset, orderBy, orderDirection } = args;
      
      return dataSources.merchantAPI.findMany({
        where: { category, status, isActive: true },
        limit,
        offset,
        orderBy: { [orderBy]: orderDirection.toLowerCase() }
      });
    },
    
    transaction: async (_, { id }, { user, dataSources }) => {
      const transaction = await dataSources.transactionAPI.findById(id);
      if (!transaction) throw new UserInputError('Transaction not found');
      
      // Check permissions
      if (user.role !== 'admin' && user.merchantId !== transaction.merchantId) {
        throw new ForbiddenError('Access denied');
      }
      
      return transaction;
    },
    
    supportedTokens: async (_, { chainId }, { dataSources }) => {
      return dataSources.tokenAPI.findSupported({ chainId, isActive: true });
    },
    
    systemHealth: async (_, __, { dataSources }) => {
      return dataSources.systemAPI.getHealthStatus();
    },
  },
  
  Mutation: {
    registerMerchant: async (_, { input }, { user, dataSources, pubsub }) => {
      if (!user) throw new AuthenticationError('Authentication required');
      
      // Validate input
      const validation = await dataSources.merchantAPI.validateRegistration(input);
      if (!validation.valid) {
        throw new UserInputError('Validation failed', { errors: validation.errors });
      }
      
      const merchant = await dataSources.merchantAPI.create({
        ...input,
        userId: user.id,
      });
      
      // Publish event for real-time updates
      pubsub.publish('MERCHANT_REGISTERED', { merchantRegistered: merchant });
      
      return merchant;
    },
    
    createPaymentIntent: async (_, { input }, { user, dataSources }) => {
      const merchant = await dataSources.merchantAPI.findByUserId(user.id);
      if (!merchant) throw new UserInputError('Merchant profile required');
      
      const paymentIntent = await dataSources.paymentAPI.createIntent({
        ...input,
        merchantId: merchant.id,
      });
      
      return paymentIntent;
    },
    
    processPayment: async (_, { input }, { user, dataSources, pubsub }) => {
      const { paymentIntentId, transactionHash, signature } = input;
      
      // Validate payment intent
      const paymentIntent = await dataSources.paymentAPI.findIntentById(paymentIntentId);
      if (!paymentIntent || paymentIntent.status !== 'CREATED') {
        throw new UserInputError('Invalid payment intent');
      }
      
      // Verify blockchain transaction
      const txVerification = await dataSources.web3API.verifyTransaction({
        hash: transactionHash,
        expectedAmount: paymentIntent.amount,
        expectedToken: paymentIntent.token.address,
        expectedRecipient: paymentIntent.merchant.walletAddress,
      });
      
      if (!txVerification.valid) {
        throw new UserInputError('Transaction verification failed');
      }
      
      const transaction = await dataSources.transactionAPI.create({
        paymentIntentId,
        blockchainTxHash: transactionHash,
        customerWalletAddress: user.walletAddress,
        merchantId: paymentIntent.merchantId,
        tokenAddress: paymentIntent.token.address,
        amountRequested: paymentIntent.amount,
        amountPaid: txVerification.amount,
        platformFee: dataSources.feeCalculator.calculate(txVerification.amount),
        status: 'PENDING',
        confirmationCount: txVerification.confirmations,
      });
      
      // Publish real-time update
      pubsub.publish('TRANSACTION_CREATED', {
        transactionUpdates: transaction,
        merchantId: paymentIntent.merchantId,
      });
      
      return transaction;
    },
    
    claimRewards: async (_, { merchantId, tokenAddress }, { user, dataSources }) => {
      // Verify ownership
      if (user.merchantId !== merchantId && user.role !== 'admin') {
        throw new ForbiddenError('Access denied');
      }
      
      return dataSources.rewardAPI.claimRewards(merchantId, tokenAddress);
    },
  },
  
  Subscription: {
    transactionUpdates: {
      subscribe: withFilter(
        (_, __, { pubsub }) => pubsub.asyncIterator(['TRANSACTION_CREATED', 'TRANSACTION_UPDATED']),
        (payload, variables) => {
          if (!variables.merchantId) return true;
          return payload.merchantId === variables.merchantId;
        }
      ),
    },
    
    paymentIntentUpdates: {
      subscribe: withFilter(
        (_, __, { pubsub }) => pubsub.asyncIterator(['PAYMENT_INTENT_UPDATED']),
        (payload, variables) => payload.paymentIntentUpdates.id === variables.id
      ),
    },
    
    rewardUpdates: {
      subscribe: withFilter(
        (_, __, { pubsub }) => pubsub.asyncIterator(['REWARD_DISTRIBUTED', 'REWARD_CLAIMED']),
        (payload, variables) => payload.rewardUpdates.merchantId === variables.merchantId
      ),
    },
  },
  
  // Field resolvers
  Merchant: {
    analytics: async (parent, { timeframe }, { dataSources }) => {
      return dataSources.analyticsAPI.getMerchantAnalytics(parent.id, timeframe);
    },
    
    recentTransactions: async (parent, { limit }, { dataSources }) => {
      return dataSources.transactionAPI.findByMerchant(parent.id, { limit, orderBy: 'createdAt DESC' });
    },
    
    rewards: async (parent, { status, limit }, { dataSources }) => {
      return dataSources.rewardAPI.findByMerchant(parent.id, { status, limit });
    },
  },
  
  Transaction: {
    merchant: async (parent, _, { dataSources }) => {
      return dataSources.merchantAPI.findById(parent.merchantId);
    },
    
    token: async (parent, _, { dataSources }) => {
      return dataSources.tokenAPI.findByAddress(parent.tokenAddress);
    },
    
    paymentIntent: async (parent, _, { dataSources }) => {
      if (!parent.paymentIntentId) return null;
      return dataSources.paymentAPI.findIntentById(parent.paymentIntentId);
    },
  },
};
```

## 5. REST API Endpoints

### 5.1 Core REST Endpoints

#### Health and Status
```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    services: {
      database: await checkDatabaseHealth(),
      redis: await checkRedisHealth(),
      blockchain: await checkBlockchainHealth(),
    },
    uptime: process.uptime(),
  };
  
  const isHealthy = Object.values(health.services).every(service => service.status === 'ok');
  res.status(isHealthy ? 200 : 503).json(health);
});

// Metrics endpoint (Prometheus format)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(await promClient.register.metrics());
});
```

#### Webhook Endpoints
```typescript
// Payment confirmation webhook
app.post('/webhooks/payment-confirmation', 
  authenticateWebhook,
  validateWebhookPayload,
  async (req: Request, res: Response) => {
    try {
      const { transactionHash, confirmations, blockNumber } = req.body;
      
      // Update transaction status
      const transaction = await transactionService.updateConfirmations({
        hash: transactionHash,
        confirmations,
        blockNumber,
      });
      
      // Trigger downstream events if confirmed
      if (confirmations >= transaction.requiredConfirmations) {
        await eventBus.publish('transaction.confirmed', {
          transactionId: transaction.id,
          merchantId: transaction.merchantId,
        });
      }
      
      res.json({ status: 'processed' });
    } catch (error) {
      logger.error('Webhook processing failed', error);
      res.status(500).json({ error: 'Processing failed' });
    }
  }
);

// Merchant webhook delivery
app.post('/api/merchants/:id/webhook-test',
  authenticateToken,
  requirePermission('webhook.test'),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const merchant = await merchantService.findById(id);
    
    if (!merchant.webhookUrl) {
      return res.status(400).json({ error: 'No webhook URL configured' });
    }
    
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: { message: 'Test webhook delivery' },
    };
    
    const result = await webhookService.deliver(merchant.webhookUrl, testPayload);
    res.json(result);
  }
);
```

#### File Upload Endpoints
```typescript
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

app.post('/api/merchants/:id/documents',
  authenticateToken,
  upload.single('document'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'File required' });
      }
      
      const { id } = req.params;
      const { type, description } = req.body;
      
      // Verify merchant ownership
      if (req.user.merchantId !== id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Upload to storage service
      const fileUrl = await storageService.upload({
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        filename: `${uuidv4()}-${req.file.originalname}`,
        path: `merchants/${id}/documents/`,
      });
      
      // Save document record
      const document = await documentService.create({
        merchantId: id,
        type,
        description,
        filename: req.file.originalname,
        url: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
      
      res.status(201).json(document);
    } catch (error) {
      logger.error('Document upload failed', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);
```

### 5.2 Admin API Endpoints
```typescript
// Admin routes with proper authorization
const adminRouter = express.Router();
adminRouter.use(authenticateToken);
adminRouter.use(requireRole(['admin', 'super_admin']));

// Merchant management
adminRouter.get('/merchants', async (req: Request, res: Response) => {
  const { status, category, limit = 20, offset = 0 } = req.query;
  
  const merchants = await merchantService.findAll({
    where: { status, category },
    limit: parseInt(limit as string),
    offset: parseInt(offset as string),
    include: ['user', 'analytics'],
  });
  
  res.json(merchants);
});

adminRouter.post('/merchants/:id/verify', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { notes } = req.body;
  
  const merchant = await merchantService.verify(id, {
    verifiedBy: req.user.id,
    notes,
  });
  
  // Send notification
  await notificationService.send(merchant.userId, {
    type: 'merchant.verified',
    title: 'Merchant Account Verified',
    message: 'Your merchant account has been verified and is now active.',
  });
  
  res.json(merchant);
});

// System analytics
adminRouter.get('/analytics/platform', async (req: Request, res: Response) => {
  const { timeframe } = req.query;
  const analytics = await analyticsService.getPlatformAnalytics(timeframe);
  res.json(analytics);
});

// Fraud detection
adminRouter.get('/fraud/alerts', async (req: Request, res: Response) => {
  const alerts = await fraudService.getActiveAlerts();
  res.json(alerts);
});

adminRouter.post('/fraud/:id/resolve', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { resolution, notes } = req.body;
  
  const result = await fraudService.resolveAlert(id, {
    resolution,
    notes,
    resolvedBy: req.user.id,
  });
  
  res.json(result);
});

app.use('/api/admin', adminRouter);
```

## 6. API Documentation

### 6.1 OpenAPI Specification
```yaml
openapi: 3.0.3
info:
  title: VeryPay API
  description: Cryptocurrency payment processing for merchants
  version: 1.0.0
  contact:
    name: API Support
    url: https://support.verypay.com
    email: api-support@verypay.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.verypay.com/v1
    description: Production server
  - url: https://api-staging.verypay.com/v1
    description: Staging server

security:
  - BearerAuth: []
  - ApiKeyAuth: []

paths:
  /health:
    get:
      summary: Health check
      tags: [System]
      security: []
      responses:
        '200':
          description: System is healthy
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthStatus'
        '503':
          description: System is unhealthy

  /merchants:
    get:
      summary: List merchants
      tags: [Merchants]
      parameters:
        - name: category
          in: query
          schema:
            type: string
        - name: status
          in: query
          schema:
            type: string
            enum: [pending, approved, rejected, suspended]
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: offset
          in: query
          schema:
            type: integer
            minimum: 0
            default: 0
      responses:
        '200':
          description: List of merchants
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MerchantList'

    post:
      summary: Register new merchant
      tags: [Merchants]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MerchantRegistration'
      responses:
        '201':
          description: Merchant registered successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Merchant'
        '400':
          description: Validation error
        '409':
          description: Merchant already exists

  /merchants/{id}:
    get:
      summary: Get merchant details
      tags: [Merchants]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Merchant details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Merchant'
        '404':
          description: Merchant not found

    put:
      summary: Update merchant profile
      tags: [Merchants]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MerchantUpdate'
      responses:
        '200':
          description: Merchant updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Merchant'

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key

  schemas:
    HealthStatus:
      type: object
      properties:
        status:
          type: string
          enum: [ok, error]
        timestamp:
          type: string
          format: date-time
        version:
          type: string
        services:
          type: object
          properties:
            database:
              $ref: '#/components/schemas/ServiceHealth'
            redis:
              $ref: '#/components/schemas/ServiceHealth'
            blockchain:
              $ref: '#/components/schemas/ServiceHealth'
        uptime:
          type: number

    ServiceHealth:
      type: object
      properties:
        status:
          type: string
          enum: [ok, error]
        responseTime:
          type: number
        message:
          type: string

    Merchant:
      type: object
      properties:
        id:
          type: string
          format: uuid
        businessName:
          type: string
        businessCategory:
          type: string
        businessType:
          type: string
          enum: [individual, sole_proprietorship, partnership, corporation, llc]
        website:
          type: string
          format: uri
        complianceStatus:
          type: string
          enum: [pending, approved, rejected, suspended]
        totalTransactions:
          type: integer
        totalVolume:
          type: string
        isActive:
          type: boolean
        createdAt:
          type: string
          format: date-time

    MerchantRegistration:
      type: object
      required:
        - businessName
        - businessCategory
        - businessType
        - acceptedTokens
      properties:
        businessName:
          type: string
          minLength: 2
          maxLength: 200
        businessDescription:
          type: string
          maxLength: 1000
        businessCategory:
          type: string
        businessType:
          type: string
          enum: [individual, sole_proprietorship, partnership, corporation, llc]
        website:
          type: string
          format: uri
        contactInfo:
          type: object
        acceptedTokens:
          type: array
          items:
            type: string

    Error:
      type: object
      properties:
        error:
          type: string
        message:
          type: string
        details:
          type: object
        timestamp:
          type: string
          format: date-time
```

### 6.2 GraphQL Documentation
```typescript
// Auto-generated documentation using GraphQL tools
import { buildSchema, printSchema } from 'graphql';

// Schema introspection endpoint
app.get('/api/graphql/schema', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(printSchema(schema));
});

// GraphQL Playground (development only)
if (process.env.NODE_ENV === 'development') {
  app.get('/api/graphql/playground', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>GraphQL Playground</title>
          <link rel="stylesheet" href="//cdn.jsdelivr.net/npm/graphql-playground-react/build/static/css/index.css" />
          <link rel="shortcut icon" href="//cdn.jsdelivr.net/npm/graphql-playground-react/build/favicon.png" />
          <script src="//cdn.jsdelivr.net/npm/graphql-playground-react/build/static/js/middleware.js"></script>
        </head>
        <body>
          <div id="root">
            <style>
              body { margin: 0; font-family: Open Sans, sans-serif; overflow: hidden; }
              #root { height: 100vh; }
            </style>
          </div>
          <script>
            window.addEventListener('load', function (event) {
              GraphQLPlayground.init(document.getElementById('root'), {
                endpoint: '/api/graphql'
              })
            })
          </script>
        </body>
      </html>
    `);
  });
}
```

## 7. Testing Strategy

### 7.1 API Testing Framework
```typescript
import request from 'supertest';
import { app } from '../src/app';
import { createTestContext } from './helpers';

describe('Merchant API', () => {
  let testContext;
  
  beforeAll(async () => {
    testContext = await createTestContext();
  });
  
  afterAll(async () => {
    await testContext.cleanup();
  });
  
  describe('POST /api/merchants', () => {
    it('should register a new merchant', async () => {
      const merchantData = {
        businessName: 'Test Business',
        businessCategory: 'ecommerce',
        businessType: 'llc',
        acceptedTokens: ['0x123...', '0x456...'],
      };
      
      const response = await request(app)
        .post('/api/merchants')
        .set('Authorization', `Bearer ${testContext.userToken}`)
        .send(merchantData)
        .expect(201);
      
      expect(response.body).toMatchObject({
        businessName: merchantData.businessName,
        businessCategory: merchantData.businessCategory,
        complianceStatus: 'pending',
        isActive: true,
      });
      
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });
    
    it('should validate required fields', async () => {
      const invalidData = {
        businessName: '', // Invalid: empty string
        businessCategory: 'ecommerce',
        businessType: 'llc',
      };
      
      const response = await request(app)
        .post('/api/merchants')
        .set('Authorization', `Bearer ${testContext.userToken}`)
        .send(invalidData)
        .expect(400);
      
      expect(response.body.error).toContain('Validation failed');
      expect(response.body.details).toHaveProperty('businessName');
    });
    
    it('should require authentication', async () => {
      await request(app)
        .post('/api/merchants')
        .send({})
        .expect(401);
    });
  });
});
```

### 7.2 GraphQL Testing
```typescript
import { graphql } from 'graphql';
import { schema } from '../src/graphql/schema';
import { createMockContext } from './helpers';

describe('GraphQL Mutations', () => {
  describe('registerMerchant', () => {
    it('should register a new merchant', async () => {
      const mutation = `
        mutation RegisterMerchant($input: MerchantRegistrationInput!) {
          registerMerchant(input: $input) {
            id
            businessName
            businessCategory
            complianceStatus
            isActive
            createdAt
          }
        }
      `;
      
      const variables = {
        input: {
          businessName: 'Test GraphQL Business',
          businessCategory: 'retail',
          businessType: 'corporation',
          acceptedTokens: ['0x123...'],
        },
      };
      
      const context = createMockContext({ user: { id: '123', role: 'user' } });
      const result = await graphql(schema, mutation, null, context, variables);
      
      expect(result.errors).toBeUndefined();
      expect(result.data?.registerMerchant).toMatchObject({
        businessName: 'Test GraphQL Business',
        businessCategory: 'retail',
        complianceStatus: 'PENDING',
        isActive: true,
      });
    });
  });
});
```

## 8. Rate Limiting and Security

### 8.1 Advanced Rate Limiting
```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

// Different rate limits for different endpoints
const rateLimiters = {
  general: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl_general',
    points: 1000, // requests
    duration: 3600, // 1 hour
  }),
  
  payment: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl_payment',
    points: 100, // more restrictive for payments
    duration: 3600,
  }),
  
  auth: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl_auth',
    points: 5, // very restrictive for auth attempts
    duration: 900, // 15 minutes
    blockDuration: 900,
  }),
};

export const createRateLimitMiddleware = (type: keyof typeof rateLimiters) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.ip || 'unknown';
      await rateLimiters[type].consume(key);
      next();
    } catch (rateLimiterRes) {
      const secs = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;
      res.set('Retry-After', String(secs));
      res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: secs,
      });
    }
  };
};
```

### 8.2 Request Validation
```typescript
import Joi from 'joi';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      stripUnknown: true,
      abortEarly: false,
    });
    
    if (error) {
      const details = error.details.reduce((acc, curr) => {
        acc[curr.path.join('.')] = curr.message;
        return acc;
      }, {});
      
      return res.status(400).json({
        error: 'Validation failed',
        details,
      });
    }
    
    req.body = value;
    next();
  };
};

// Validation schemas
export const schemas = {
  merchantRegistration: Joi.object({
    businessName: Joi.string().min(2).max(200).required(),
    businessDescription: Joi.string().max(1000).optional(),
    businessCategory: Joi.string().required(),
    businessType: Joi.string().valid('individual', 'sole_proprietorship', 'partnership', 'corporation', 'llc').required(),
    website: Joi.string().uri().optional(),
    contactInfo: Joi.object().optional(),
    acceptedTokens: Joi.array().items(Joi.string()).min(1).required(),
  }),
  
  paymentIntent: Joi.object({
    orderId: Joi.string().max(100).optional(),
    description: Joi.string().max(500).optional(),
    amount: Joi.string().pattern(/^\d+(\.\d{1,18})?$/).required(),
    tokenAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    metadata: Joi.object().optional(),
    successUrl: Joi.string().uri().optional(),
    cancelUrl: Joi.string().uri().optional(),
    expiresIn: Joi.number().min(300).max(86400).default(3600),
  }),
};
```

This API architecture provides a comprehensive, secure, and scalable foundation for the VeryPay system with proper authentication, validation, rate limiting, and documentation.
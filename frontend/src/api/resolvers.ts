import { AuthenticationError, ForbiddenError, UserInputError } from 'apollo-server-express';
import { 
  User, 
  Merchant, 
  Transaction, 
  TransactionStatus,
  CreateTransactionRequest,
  QRCodeRequest,
  AnalyticsRequest 
} from '../types';
import { TransactionService } from '../services/transaction-service';
import { MerchantService } from '../services/merchant-service';
import { AuthService } from '../services/auth-service';
import { AnalyticsService } from '../services/analytics-service';
import { NotificationService } from '../services/notification-service';
import { web3Helper } from '../utils/web3';
import { QRGenerator } from '../utils/qr-generator';
import { Logger } from '../utils/logger';

export interface Context {
  user?: User;
  isAuthenticated: boolean;
}

export const resolvers = {
  Query: {
    // User & Auth
    me: async (_: any, __: any, context: Context) => {
      if (!context.isAuthenticated || !context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      return context.user;
    },

    // Merchant
    merchant: async (_: any, { id }: { id?: string }, context: Context) => {
      if (!context.isAuthenticated || !context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const merchantId = id || context.user.merchantId;
      if (!merchantId) {
        throw new UserInputError('Merchant ID required');
      }

      return await MerchantService.getMerchantById(merchantId);
    },

    merchants: async (_: any, { limit = 10, offset = 0 }: { limit?: number; offset?: number }, context: Context) => {
      if (!context.isAuthenticated || !context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      if (context.user.role !== 'admin') {
        throw new ForbiddenError('Admin access required');
      }

      return await MerchantService.getMerchants(limit, offset);
    },

    // Transactions
    transaction: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.isAuthenticated || !context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const transaction = await TransactionService.getTransactionById(id);
      
      // Check if user has access to this transaction
      if (context.user.role !== 'admin' && transaction.merchantId !== context.user.merchantId) {
        throw new ForbiddenError('Access denied');
      }

      return transaction;
    },

    transactions: async (
      _: any, 
      { merchantId, status, limit = 10, offset = 0 }: {
        merchantId?: string;
        status?: TransactionStatus;
        limit?: number;
        offset?: number;
      },
      context: Context
    ) => {
      if (!context.isAuthenticated || !context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const targetMerchantId = merchantId || context.user.merchantId;
      
      // Check access permissions
      if (context.user.role !== 'admin' && targetMerchantId !== context.user.merchantId) {
        throw new ForbiddenError('Access denied');
      }

      const result = await TransactionService.getTransactions({
        merchantId: targetMerchantId,
        status,
        limit,
        offset
      });

      return {
        transactions: result.data,
        pagination: result.pagination
      };
    },

    transactionByHash: async (_: any, { hash }: { hash: string }, context: Context) => {
      if (!context.isAuthenticated || !context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const transaction = await TransactionService.getTransactionByHash(hash);
      
      // Check if user has access to this transaction
      if (context.user.role !== 'admin' && transaction.merchantId !== context.user.merchantId) {
        throw new ForbiddenError('Access denied');
      }

      return transaction;
    },

    // Analytics
    analytics: async (_: any, { input }: { input: AnalyticsRequest }, context: Context) => {
      if (!context.isAuthenticated || !context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      if (!context.user.merchantId) {
        throw new UserInputError('Merchant ID required');
      }

      return await AnalyticsService.getMerchantAnalytics(context.user.merchantId, input);
    },

    // Tokens
    tokenInfo: async (_: any, { address }: { address: string }) => {
      try {
        return await web3Helper.getTokenInfo(address);
      } catch (error) {
        Logger.error('Failed to get token info', error, { address });
        throw new UserInputError('Invalid token address');
      }
    },

    supportedTokens: async () => {
      return await MerchantService.getSupportedTokens();
    },

    // Notifications
    notifications: async (
      _: any,
      { userId, type, limit = 10, offset = 0 }: {
        userId: string;
        type?: string;
        limit?: number;
        offset?: number;
      },
      context: Context
    ) => {
      if (!context.isAuthenticated || !context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      // Check access permissions
      if (context.user.role !== 'admin' && userId !== context.user.id) {
        throw new ForbiddenError('Access denied');
      }

      const result = await NotificationService.getNotifications({
        userId,
        type: type as any,
        limit,
        offset
      });

      return {
        notifications: result.data,
        pagination: result.pagination
      };
    },

    unreadNotificationCount: async (_: any, { userId }: { userId: string }, context: Context) => {
      if (!context.isAuthenticated || !context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      // Check access permissions
      if (context.user.role !== 'admin' && userId !== context.user.id) {
        throw new ForbiddenError('Access denied');
      }

      return await NotificationService.getUnreadCount(userId);
    },

    // Blockchain
    gasEstimate: async (_: any, { to, value, data }: { to: string; value: string; data?: string }) => {
      try {
        return await web3Helper.estimateGas(to, value, data);
      } catch (error) {
        Logger.error('Failed to estimate gas', error, { to, value });
        throw new UserInputError('Failed to estimate gas');
      }
    },

    blockNumber: async () => {
      try {
        return await web3Helper.getCurrentBlock();
      } catch (error) {
        Logger.error('Failed to get block number', error);
        throw new Error('Failed to get current block number');
      }
    }
  },

  Mutation: {
    // Auth
    login: async (_: any, { email, password }: { email: string; password: string }) => {
      try {
        return await AuthService.login(email, password);
      } catch (error) {
        Logger.error('Login failed', error, { email });
        throw new AuthenticationError('Invalid credentials');
      }
    },

    register: async (_: any, { email, password, walletAddress }: { 
      email: string; 
      password: string; 
      walletAddress: string; 
    }) => {
      try {
        return await AuthService.register(email, password, walletAddress);
      } catch (error) {
        Logger.error('Registration failed', error, { email, walletAddress });
        throw new UserInputError('Registration failed');
      }
    },

    refreshToken: async (_: any, { refreshToken }: { refreshToken: string }) => {
      try {
        return await AuthService.refreshToken(refreshToken);
      } catch (error) {
        Logger.error('Token refresh failed', error);
        throw new AuthenticationError('Invalid refresh token');
      }
    },

    logout: async (_: any, __: any, context: Context) => {
      if (!context.isAuthenticated || !context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      await AuthService.logout(context.user.id);
      
      return {
        success: true,
        message: 'Logged out successfully',
        timestamp: new Date().toISOString()
      };
    },

    // Merchant
    createMerchant: async (
      _: any,
      { businessName, businessType, walletAddress }: {
        businessName: string;
        businessType: string;
        walletAddress: string;
      },
      context: Context
    ) => {
      if (!context.isAuthenticated || !context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      try {
        return await MerchantService.createMerchant({
          userId: context.user.id,
          businessName,
          businessType,
          walletAddress
        });
      } catch (error) {
        Logger.error('Failed to create merchant', error, { userId: context.user.id });
        throw new UserInputError('Failed to create merchant');
      }
    },

    updateMerchantSettings: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.isAuthenticated || !context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      if (!context.user.merchantId) {
        throw new UserInputError('Merchant ID required');
      }

      try {
        return await MerchantService.updateMerchantSettings(context.user.merchantId, input);
      } catch (error) {
        Logger.error('Failed to update merchant settings', error, { merchantId: context.user.merchantId });
        throw new UserInputError('Failed to update settings');
      }
    },

    // Transactions
    createTransaction: async (_: any, { input }: { input: CreateTransactionRequest }, context: Context) => {
      if (!context.isAuthenticated || !context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      if (!context.user.merchantId) {
        throw new UserInputError('Merchant ID required');
      }

      try {
        return await TransactionService.createTransaction(context.user.merchantId, input);
      } catch (error) {
        Logger.error('Failed to create transaction', error, { merchantId: context.user.merchantId });
        throw new UserInputError('Failed to create transaction');
      }
    },

    cancelTransaction: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.isAuthenticated || !context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      try {
        const transaction = await TransactionService.getTransactionById(id);
        
        // Check if user has access to this transaction
        if (context.user.role !== 'admin' && transaction.merchantId !== context.user.merchantId) {
          throw new ForbiddenError('Access denied');
        }

        return await TransactionService.cancelTransaction(id);
      } catch (error) {
        Logger.error('Failed to cancel transaction', error, { id });
        throw new UserInputError('Failed to cancel transaction');
      }
    },

    // QR Codes
    generatePaymentQR: async (_: any, { input }: { input: QRCodeRequest }, context: Context) => {
      if (!context.isAuthenticated || !context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      if (!context.user.merchantId) {
        throw new UserInputError('Merchant ID required');
      }

      try {
        const merchant = await MerchantService.getMerchantById(context.user.merchantId);
        const result = await QRGenerator.createPaymentQR(
          context.user.merchantId,
          merchant.walletAddress,
          input
        );

        return {
          qrCode: result.qrCode,
          paymentUrl: result.paymentUrl,
          expiresAt: result.expiresAt,
          data: result.data
        };
      } catch (error) {
        Logger.error('Failed to generate payment QR', error, { merchantId: context.user.merchantId });
        throw new UserInputError('Failed to generate QR code');
      }
    },

    // Notifications
    markNotificationRead: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.isAuthenticated || !context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      try {
        const notification = await NotificationService.getNotificationById(id);
        
        // Check if user has access to this notification
        if (context.user.role !== 'admin' && notification.userId !== context.user.id) {
          throw new ForbiddenError('Access denied');
        }

        return await NotificationService.markAsRead(id);
      } catch (error) {
        Logger.error('Failed to mark notification as read', error, { id });
        throw new UserInputError('Failed to mark notification as read');
      }
    },

    markAllNotificationsRead: async (_: any, { userId }: { userId: string }, context: Context) => {
      if (!context.isAuthenticated || !context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      // Check access permissions
      if (context.user.role !== 'admin' && userId !== context.user.id) {
        throw new ForbiddenError('Access denied');
      }

      try {
        await NotificationService.markAllAsRead(userId);
        
        return {
          success: true,
          message: 'All notifications marked as read',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        Logger.error('Failed to mark all notifications as read', error, { userId });
        throw new UserInputError('Failed to mark notifications as read');
      }
    },

    deleteNotification: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.isAuthenticated || !context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      try {
        const notification = await NotificationService.getNotificationById(id);
        
        // Check if user has access to this notification
        if (context.user.role !== 'admin' && notification.userId !== context.user.id) {
          throw new ForbiddenError('Access denied');
        }

        await NotificationService.deleteNotification(id);
        
        return {
          success: true,
          message: 'Notification deleted',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        Logger.error('Failed to delete notification', error, { id });
        throw new UserInputError('Failed to delete notification');
      }
    },

    // Webhook testing
    testWebhook: async (_: any, { merchantId }: { merchantId: string }, context: Context) => {
      if (!context.isAuthenticated || !context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      // Check access permissions
      if (context.user.role !== 'admin' && merchantId !== context.user.merchantId) {
        throw new ForbiddenError('Access denied');
      }

      try {
        await MerchantService.testWebhook(merchantId);
        
        return {
          success: true,
          message: 'Webhook test sent',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        Logger.error('Failed to test webhook', error, { merchantId });
        throw new UserInputError('Failed to test webhook');
      }
    }
  },

  Subscription: {
    transactionUpdated: {
      subscribe: async (_: any, { merchantId }: { merchantId: string }, context: Context) => {
        if (!context.isAuthenticated || !context.user) {
          throw new AuthenticationError('Not authenticated');
        }

        // Check access permissions
        if (context.user.role !== 'admin' && merchantId !== context.user.merchantId) {
          throw new ForbiddenError('Access denied');
        }

        return TransactionService.subscribeToTransactionUpdates(merchantId);
      }
    },

    notificationReceived: {
      subscribe: async (_: any, { userId }: { userId: string }, context: Context) => {
        if (!context.isAuthenticated || !context.user) {
          throw new AuthenticationError('Not authenticated');
        }

        // Check access permissions
        if (context.user.role !== 'admin' && userId !== context.user.id) {
          throw new ForbiddenError('Access denied');
        }

        return NotificationService.subscribeToNotifications(userId);
      }
    },

    analyticsUpdated: {
      subscribe: async (_: any, { merchantId }: { merchantId: string }, context: Context) => {
        if (!context.isAuthenticated || !context.user) {
          throw new AuthenticationError('Not authenticated');
        }

        // Check access permissions
        if (context.user.role !== 'admin' && merchantId !== context.user.merchantId) {
          throw new ForbiddenError('Access denied');
        }

        return AnalyticsService.subscribeToAnalyticsUpdates(merchantId);
      }
    },

    balanceUpdated: {
      subscribe: async (_: any, { walletAddress }: { walletAddress: string }, context: Context) => {
        if (!context.isAuthenticated || !context.user) {
          throw new AuthenticationError('Not authenticated');
        }

        // Only allow users to subscribe to their own wallet address
        if (context.user.walletAddress !== walletAddress && context.user.role !== 'admin') {
          throw new ForbiddenError('Access denied');
        }

        return MerchantService.subscribeToBalanceUpdates(walletAddress);
      }
    }
  }
};

export default resolvers;
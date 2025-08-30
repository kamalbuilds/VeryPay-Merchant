import { type Address } from 'viem';

export interface User {
  id: string;
  address: Address;
  email?: string;
  name?: string;
  avatar?: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  totalSpent: number;
  rewardsBalance: number;
  walkingRewards: number;
  createdAt: Date;
  lastSeen: Date;
}

export interface Transaction {
  id: string;
  hash: string;
  from: Address;
  to: Address;
  amount: string;
  token: 'VERY' | 'ETH' | 'USDC' | 'USDT';
  usdValue: number;
  status: 'pending' | 'confirmed' | 'failed';
  type: 'payment' | 'reward' | 'refund';
  timestamp: Date;
  merchant?: string;
  customer?: string;
  metadata?: Record<string, any>;
}

export interface Merchant {
  id: string;
  name: string;
  address: Address;
  category: string;
  description?: string;
  logo?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  qrCode: string;
  isActive: boolean;
  settings: {
    acceptedTokens: string[];
    rewardRate: number;
    autoConvert: boolean;
    notifications: boolean;
  };
}

export interface RewardTier {
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  minSpent: number;
  rewardMultiplier: number;
  benefits: string[];
  color: string;
}

export interface PaymentRequest {
  id: string;
  merchant: string;
  amount: string;
  token: string;
  description?: string;
  qrCode: string;
  expiresAt: Date;
  isActive: boolean;
}

export interface WalkingReward {
  id: string;
  userId: string;
  steps: number;
  distance: number; // in meters
  rewards: number; // VERY tokens earned
  multiplier: number;
  date: Date;
  verified: boolean;
}

export interface NotificationSettings {
  push: boolean;
  email: boolean;
  sms: boolean;
  categories: {
    transactions: boolean;
    rewards: boolean;
    marketing: boolean;
    security: boolean;
  };
}

export interface AnalyticsData {
  revenue: {
    today: number;
    week: number;
    month: number;
    year: number;
  };
  transactions: {
    count: number;
    volume: number;
    averageSize: number;
  };
  customers: {
    total: number;
    new: number;
    returning: number;
    churnRate: number;
  };
  tokens: {
    distribution: Record<string, number>;
    preferences: Record<string, number>;
  };
}

export interface QRCodeData {
  type: 'payment' | 'loyalty' | 'merchant';
  version: string;
  merchant?: string;
  amount?: string;
  token?: string;
  description?: string;
  userId?: string;
  timestamp: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Form Types
export interface PaymentForm {
  amount: string;
  token: string;
  recipient?: Address;
  description?: string;
}

export interface CustomerForm {
  name: string;
  email: string;
  phone?: string;
  preferences: {
    notifications: NotificationSettings;
    marketing: boolean;
  };
}

// State Types
export interface AppState {
  user: User | null;
  merchant: Merchant | null;
  isLoading: boolean;
  error: string | null;
}

export interface TransactionState {
  transactions: Transaction[];
  pendingTransactions: Transaction[];
  isLoading: boolean;
  error: string | null;
}

export interface RewardsState {
  balance: number;
  history: WalkingReward[];
  tier: RewardTier;
  nextTier?: RewardTier;
  isLoading: boolean;
  error: string | null;
}
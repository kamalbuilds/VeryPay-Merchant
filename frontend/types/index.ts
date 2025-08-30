import { Address } from 'viem'

export interface User {
  id: string
  address: Address
  email?: string
  name?: string
  profileImage?: string
  createdAt: Date
  updatedAt: Date
  tier: UserTier
  rewardsBalance: number
  totalSpent: number
  walkingRewards: number
  loyaltyPoints: number
}

export interface Merchant {
  id: string
  address: Address
  name: string
  businessName: string
  email: string
  phone?: string
  profileImage?: string
  coverImage?: string
  description?: string
  category: MerchantCategory
  location: Location
  settings: MerchantSettings
  createdAt: Date
  updatedAt: Date
  verified: boolean
  tier: MerchantTier
}

export interface Transaction {
  id: string
  hash: string
  from: Address
  to: Address
  amount: bigint
  veryAmount: number
  usdValue: number
  type: TransactionType
  status: TransactionStatus
  timestamp: Date
  blockNumber?: bigint
  gasUsed?: bigint
  gasPrice?: bigint
  metadata?: TransactionMetadata
  rewards?: RewardTransaction
}

export interface QRCode {
  id: string
  merchantId: string
  amount?: number
  description?: string
  expiresAt?: Date
  isActive: boolean
  usageCount: number
  maxUsage?: number
  createdAt: Date
}

export interface PaymentRequest {
  id: string
  merchantId: string
  customerId?: string
  amount: number
  veryAmount: number
  description?: string
  metadata?: Record<string, any>
  qrCodeId?: string
  status: PaymentStatus
  expiresAt: Date
  createdAt: Date
}

export interface Analytics {
  totalTransactions: number
  totalVolume: number
  totalVeryVolume: number
  totalRewardsDistributed: number
  averageTransactionSize: number
  topCustomers: CustomerInsight[]
  revenueByPeriod: RevenueData[]
}

// Enums and Types
export type UserTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
export type MerchantTier = 'starter' | 'professional' | 'enterprise'
export type MerchantCategory = 
  | 'retail' 
  | 'food-beverage' 
  | 'services' 
  | 'entertainment' 
  | 'health-wellness' 
  | 'automotive' 
  | 'other'

export type TransactionType = 'payment' | 'refund' | 'reward' | 'withdrawal'
export type TransactionStatus = 'pending' | 'confirmed' | 'failed' | 'cancelled'
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired' | 'cancelled'
export type RewardType = 'transaction' | 'walking' | 'referral' | 'bonus' | 'cashback'

export interface Location {
  address: string
  city: string
  state: string
  country: string
  zipCode: string
  coordinates?: {
    lat: number
    lng: number
  }
}

export interface MerchantSettings {
  acceptsVery: boolean
  autoConvertToFiat: boolean
  rewardRate: number
  loyaltyProgramEnabled: boolean
  walkingRewardsEnabled: boolean
  notificationsEnabled: boolean
  emailNotifications: boolean
  smsNotifications: boolean
  currency: string
  timezone: string
  language: string
}

export interface TransactionMetadata {
  description?: string
  category?: string
  tags?: string[]
  customFields?: Record<string, any>
  location?: Location
}

export interface RewardTransaction {
  id: string
  userId: string
  transactionId?: string
  type: RewardType
  amount: number
  source: string
  multiplier: number
  description: string
  timestamp: Date
  expiresAt?: Date
}

export interface CustomerInsight {
  customerId: string
  customerAddress: Address
  totalTransactions: number
  totalSpent: number
  averageTransactionSize: number
  lastTransaction: Date
  tier: UserTier
  loyaltyPoints: number
}

export interface RevenueData {
  period: string
  revenue: number
  veryRevenue: number
  transactionCount: number
  averageValue: number
}
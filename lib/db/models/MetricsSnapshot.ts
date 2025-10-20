import { ObjectId } from 'mongodb'

export interface MetricsSnapshot {
  _id?: ObjectId
  companyId: string // whop company id (biz_xxx)
  date: Date // Date of the snapshot (stored as start of day UTC)
  timestamp: Date // When this snapshot was taken

  // MRR Data
  mrr: {
    total: number
    breakdown: {
      monthly: number
      annual: number
      quarterly: number
      other: number
    }
  }

  // ARR Data
  arr: number

  // Subscriber Metrics
  subscribers: {
    active: number
    cancelled: number
    past_due: number
    trialing: number
    total: number
  }

  // Active unique subscribers
  activeUniqueSubscribers: number

  // ARPU
  arpu: number

  // Revenue metrics
  revenue?: {
    total: number
    recurring: number
    nonRecurring: number
    growth: number
  }

  // Net Revenue metrics
  netRevenue?: {
    total: number
    afterRefunds: number
    afterFees: number
    margin: number
    gross: number
    refunds: number
    fees: number
  }

  // MRR Movements
  newMRR?: {
    total: number
    customers: number
    growth: number
  }

  expansionMRR?: {
    total: number
    rate: number
    customers: number
  }

  contractionMRR?: {
    total: number
    rate: number
    customers: number
  }

  churnedMRR?: {
    total: number
    rate: number
    customers: number
  }

  // Customer metrics
  activeCustomers?: {
    total: number
    new: number
    returning: number
    growth: number
  }

  newCustomers?: {
    total: number
    growth: number
  }

  // Customer movement metrics
  upgrades?: {
    total: number
    revenue: number
    customers: number
  }

  downgrades?: {
    total: number
    lostRevenue: number
    customers: number
  }

  reactivations?: {
    total: number
    revenue: number
  }

  cancellations?: {
    total: number
    rate: number
  }

  // Trial metrics
  trials?: {
    total: number
    active: number
    converted: number
    conversionRate: number
  }

  // CLV metrics
  clv?: {
    average: number
    median: number
    total: number
  }

  // Cash flow metrics
  cashFlow?: {
    gross: number
    net: number
    recurring: number
    nonRecurring: number
  }

  // Payment metrics
  payments?: {
    successful: number
    failed: number
    total: number
    successRate: number
  }

  failedCharges?: {
    total: number
    amount: number
    rate: number
  }

  // Refund metrics
  refunds?: {
    total: number
    amount: number
    rate: number
  }

  // Advanced metrics
  avgSalePrice?: {
    value: number
    growth: number
  }

  revenueChurnRate?: {
    rate: number
    amount: number
  }

  customerChurnRate?: {
    rate: number
    count: number
  }

  quickRatio?: {
    value: number
    newMRR: number
    expansionMRR: number
    churnedMRR: number
    contractionMRR: number
  }

  // Metadata
  metadata: {
    totalMemberships: number
    activeMemberships: number
    plansCount: number
  }

  // Raw data cache (for faster loading without API calls)
  rawData?: {
    company?: unknown // Full company data from Whop API
    memberships?: unknown[] // Full membership data from Whop API
    plans?: unknown[] // Full plan data from Whop API
    transactions?: unknown[] // Full transaction/payment data from Whop API
  }
}

export interface DailyMetrics {
  date: string // YYYY-MM-DD format
  mrr: number
  arr: number
  activeSubscribers: number
  arpu: number
  revenue?: number
  netRevenue?: number
  newMRR?: number
  expansionMRR?: number
  contractionMRR?: number
  churnedMRR?: number
  activeCustomers?: number
  newCustomers?: number
  upgrades?: number
  downgrades?: number
  reactivations?: number
  cancellations?: number
  trials?: number
  clv?: number
  cashFlow?: number
  successfulPayments?: number
  failedCharges?: number
  refunds?: number
  avgSalePrice?: number
  revenueChurnRate?: number
  customerChurnRate?: number
  quickRatio?: number
}

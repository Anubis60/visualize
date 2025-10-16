import { ObjectId } from 'mongodb'

// Snapshot for a single day's metrics
export interface DailySnapshot {
  date: string // YYYY-MM-DD format
  mrr: number
  arr: number
  arpu: number
  activeSubscribers: number
  revenue: number
  netRevenue: number
  newMRR: number
  expansionMRR: number
  contractionMRR: number
  churnedMRR: number
  activeCustomers: number
  newCustomers: number
  upgrades: number
  downgrades: number
  reactivations: number
  cancellations: number
  trials: number
  clv: number
  cashFlow: number
  successfulPayments: number
  failedCharges: number
  refunds: number
  avgSalePrice: number
  revenueChurnRate: number
  customerChurnRate: number
  quickRatio: number
}

// ONE document per company - gets mutated daily
export interface CompanyMetrics {
  _id?: ObjectId
  companyId: string // whop company id (biz_xxx)
  lastUpdated: Date // When raw data was last fetched from Whop API

  // Raw data from Whop API - stored ONCE, fetched ONCE
  rawData: {
    company: {
      id: string
      title: string
      logo?: string
      bannerImage?: string
    }
    memberships: unknown[] // ALL memberships from Whop API
    transactions: unknown[] // ALL transactions from Whop API
    plans: unknown[] // ALL plans from Whop API
  }

  // Historical snapshots - array of daily calculated metrics
  // Calculated from rawData filtered by date
  history: DailySnapshot[]

  // Backfill status
  backfillCompleted: boolean
  backfillCompletedAt?: Date
}

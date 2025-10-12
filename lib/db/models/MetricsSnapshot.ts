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

  // MRR Movements (optional - for net MRR movements tracking)
  mrrMovements?: {
    newBusiness: number
    expansion: number
    contraction: number
    churn: number
    reactivation: number
  }

  // Metadata
  metadata: {
    totalMemberships: number
    activeMemberships: number
    plansCount: number
  }

  // Raw data cache (for faster loading without API calls)
  rawData?: {
    company?: {
      id: string
      title: string
      logo?: string
      bannerImage?: string
    }
    memberships?: any[] // Full membership data from Whop API
    plans?: any[] // Full plan data from Whop API
    transactions?: any[] // Full transaction/payment data from Whop API
  }
}

export interface DailyMetrics {
  date: string // YYYY-MM-DD format
  mrr: number
  arr: number
  activeSubscribers: number
  arpu: number
}

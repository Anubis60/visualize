export interface Membership {
  id: string
  user_id: string
  plan_id: string
  product_id: string
  status: 'active' | 'cancelled' | 'past_due' | 'trialing'
  valid: boolean
  renewal_period_start?: string
  renewal_period_end?: string
  created_at: string
  cancelled_at?: string
  plan?: {
    id: string
    name: string
    price: number
    billing_period: 'month' | 'year' | 'quarter' | 'week' | 'day' | 'lifetime'
    release_method: string
  }
  product?: {
    id: string
    name: string
  }
  user?: {
    id: string
    email: string
    username?: string
  }
}

export interface MRRData {
  total: number
  breakdown: {
    monthly: number
    annual: number
    quarterly: number
    other: number
  }
}

export interface MRRMovement {
  type: 'new_business' | 'expansion' | 'contraction' | 'churn' | 'reactivation'
  amount: number
  count: number
}

export interface SubscriberMetrics {
  active: number
  cancelled: number
  past_due: number
  trialing: number
  total: number
}

export interface ChurnMetrics {
  customerChurnRate: number
  revenueChurnRate: number
  netRevenueRetention: number
}

export interface AnalyticsPeriod {
  startDate: Date
  endDate: Date
  mrr: number
  subscribers: SubscriberMetrics
  movements: MRRMovement[]
}

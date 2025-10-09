export interface Plan {
  id: string
  renewal_price: number  // REST API uses snake_case
  initial_price: number
  billing_period: number | null // days, or null for one_time
  plan_type: 'renewal' | 'one_time'
  currency: string
  description?: string | null
  product?: {
    id: string
    title: string
  } | null
  company?: {
    id: string
    title: string
  } | null
  created_at?: number
  updated_at?: number
  visibility?: string
  release_method?: string
  __typename?: string
}

export interface Membership {
  id: string
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'completed'
  created_at: number  // Unix timestamp in seconds
  updated_at?: number
  canceled_at: number | null
  renewal_period_start?: number | null
  renewal_period_end?: number | null
  cancel_at_period_end?: boolean
  cancellation_reason?: string | null
  currency?: string
  manage_url?: string
  license_key?: string
  plan?: {
    id: string
  }
  // Enriched plan data (populated after fetching from API)
  planData?: Plan
  user?: {
    id: string
    username?: string
    name?: string | null
  } | null
  member?: {
    id: string
  } | null
  company?: {
    id: string
    title: string
  }
  promo_code?: {
    id: string
  } | null
  metadata?: Record<string, unknown>
  __typename?: string
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

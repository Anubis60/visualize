export interface Membership {
  id: string
  status: 'completed' | 'canceled' | 'trialing'
  createdAt: number  // Unix timestamp in seconds
  canceledAt: number | null
  expiresAt: number | null
  cancelationReason: string | null
  totalSpend: number
  plan?: {
    id: string
    __typename?: string
  }
  accessPass?: {
    id: string
    title: string
    __typename?: string
  }
  member?: {
    id: string
    email: string
    username?: string
    name?: string | null
    __typename?: string
  } | null
  promoCode?: any
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

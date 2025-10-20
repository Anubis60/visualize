'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AnalyticsData {
  mrr: {
    total: number
    breakdown: {
      monthly: number
      annual: number
      quarterly: number
      other: number
    }
  }
  arr: number
  arpu: number
  subscribers: {
    active: number
    cancelled: number
    past_due: number
    trialing: number
    total: number
  }
  activeUniqueSubscribers: number
  trials: {
    total: number
    active: number
    converted: number
    conversionRate: number
  }
  clv: {
    average: number
    median: number
    total: number
  }
  cashFlow: {
    gross: number
    net: number
    recurring: number
    nonRecurring: number
  }
  payments: {
    successful: number
    failed: number
    total: number
    successRate: number
  }
  refunds: {
    total: number
    amount: number
    rate: number
  }
  plans: Array<{ id: string; name: string }>
  timestamp: string
}

interface AnalyticsContextType {
  data: AnalyticsData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined)

export function AnalyticsProvider({
  children,
  companyId
}: {
  children: ReactNode
  companyId: string
}) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)

  const fetchAnalytics = async () => {
    // Prevent duplicate simultaneous fetches
    if (isFetching) {
      console.log('[AnalyticsContext] Fetch already in progress, skipping duplicate request')
      return
    }

    setIsFetching(true)
    setLoading(true)
    setError(null)
    try {
      // Try to read from MongoDB cache first
      let response = await fetch(`/api/analytics/cached?company_id=${companyId}`)

      // If no cached data (404), fetch from Whop SDK once and store in MongoDB
      if (response.status === 404) {
        console.log('[AnalyticsContext] No cached data found, fetching from Whop SDK...')
        response = await fetch(`/api/analytics?company_id=${companyId}`)
      }

      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }
      const analyticsData = await response.json()
      setData(analyticsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      setIsFetching(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [companyId])

  return (
    <AnalyticsContext.Provider value={{ data, loading, error, refetch: fetchAnalytics }}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext)
  if (context === undefined) {
    throw new Error('useAnalytics must be used within AnalyticsProvider')
  }
  return context
}

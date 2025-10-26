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
    console.log('[AnalyticsContext] 🚀 Starting fetchAnalytics for companyId:', companyId)

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
      console.log('[AnalyticsContext] 📡 Fetching cached data from /api/analytics/cached')
      let response = await fetch(`/api/analytics/cached?company_id=${companyId}`)
      console.log('[AnalyticsContext] 📥 Cached response status:', response.status)

      // If no cached data (404), fetch from Whop SDK once and store in MongoDB
      if (response.status === 404) {
        console.log('[AnalyticsContext] ⚠️ No cached data found, fetching from Whop SDK...')
        response = await fetch(`/api/analytics?company_id=${companyId}`)
        console.log('[AnalyticsContext] 📥 Fresh data response status:', response.status)
      }

      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }
      const analyticsData = await response.json()
      console.log('[AnalyticsContext] ✅ Analytics data received:', analyticsData)
      setData(analyticsData)
    } catch (err) {
      console.error('[AnalyticsContext] ❌ Error fetching analytics:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      setIsFetching(false)
      console.log('[AnalyticsContext] 🏁 Fetch complete')
    }
  }

  useEffect(() => {
    fetchAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

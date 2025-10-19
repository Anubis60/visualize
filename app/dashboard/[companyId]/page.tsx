'use client'

import { use, useEffect, useState } from 'react'
import { MetricCard } from '@/components/metrics/MetricCard'
import { DollarSign, Users, TrendingUp, Activity } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

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
  cached?: boolean
  timestamp?: string
  snapshotDate?: string
}

export default function DashboardPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = use(params)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [historicalLoading, setHistoricalLoading] = useState(false)
  const [dailyLoading, setDailyLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        // First, ensure historical data exists (trigger backfill if needed)
        await fetch(`/api/analytics/ensure-backfill?company_id=${companyId}`)

        // Fetch analytics
        const analyticsResponse = await fetch(`/api/analytics?company_id=${companyId}`)
        if (!analyticsResponse.ok) {
          throw new Error('Failed to fetch analytics')
        }
        const data = await analyticsResponse.json()
        setAnalytics(data as AnalyticsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleHistoricalBackfill = async () => {
    setHistoricalLoading(true)
    setMessage(null)
    try {
      const response = await fetch('/api/manual/historical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId })
      })
      const data = await response.json() as { success?: boolean; stats?: { snapshotsGenerated: number; dateRange: { start: string; end: string } }; error?: string }
      if (data.success) {
        setMessage(`Historical backfill completed! Generated ${data.stats?.snapshotsGenerated} snapshots from ${data.stats?.dateRange.start} to ${data.stats?.dateRange.end}`)
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setHistoricalLoading(false)
    }
  }

  const handleDailySnapshot = async () => {
    setDailyLoading(true)
    setMessage(null)
    try {
      const response = await fetch('/api/manual/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId })
      })
      const data = await response.json() as { success?: boolean; snapshot?: { mrr: number; activeSubscribers: number }; error?: string }
      if (data.success) {
        setMessage(`Daily snapshot completed! MRR: $${data.snapshot?.mrr.toFixed(2)}, Active Subscribers: ${data.snapshot?.activeSubscribers}`)
        // Refresh analytics
        const analyticsResponse = await fetch(`/api/analytics?company_id=${companyId}`)
        if (analyticsResponse.ok) {
          const analyticsData = await analyticsResponse.json()
          setAnalytics(analyticsData as AnalyticsData)
        }
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setDailyLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return null
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Overview</h1>
            <p className="text-gray-600 mt-1">Your Whop analytics at a glance</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleHistoricalBackfill}
              disabled={historicalLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {historicalLoading ? 'Running...' : 'Run Historical Backfill'}
            </button>
            <button
              onClick={handleDailySnapshot}
              disabled={dailyLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {dailyLoading ? 'Running...' : 'Run Daily Snapshot'}
            </button>
          </div>
        </div>
        {message && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">{message}</p>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Monthly Recurring Revenue"
            value={formatCurrency(analytics.mrr.total)}
            description="Total MRR from active subscriptions"
            icon={DollarSign}
          />
          <MetricCard
            title="Annual Run Rate"
            value={formatCurrency(analytics.arr)}
            description="MRR × 12"
            icon={TrendingUp}
          />
          <MetricCard
            title="Active Subscribers"
            value={analytics.activeUniqueSubscribers}
            description={`${analytics.subscribers.active} active memberships`}
            icon={Users}
          />
          <MetricCard
            title="ARPU"
            value={formatCurrency(analytics.arpu)}
            description="Average Revenue Per User"
            icon={Activity}
          />
        </div>

        {/* MRR Breakdown */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">MRR Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Monthly Plans</p>
              <p className="text-2xl font-bold">{formatCurrency(analytics.mrr.breakdown.monthly)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Annual Plans (normalized)</p>
              <p className="text-2xl font-bold">{formatCurrency(analytics.mrr.breakdown.annual)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Quarterly Plans (normalized)</p>
              <p className="text-2xl font-bold">{formatCurrency(analytics.mrr.breakdown.quarterly)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Other</p>
              <p className="text-2xl font-bold">{formatCurrency(analytics.mrr.breakdown.other)}</p>
            </div>
          </div>
        </div>

      {/* Subscriber Status */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Subscriber Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-2xl font-bold text-green-600">{analytics.subscribers.active}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Cancelled</p>
            <p className="text-2xl font-bold text-red-600">{analytics.subscribers.cancelled}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Past Due</p>
            <p className="text-2xl font-bold text-yellow-600">{analytics.subscribers.past_due}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Trialing</p>
            <p className="text-2xl font-bold text-blue-600">{analytics.subscribers.trialing}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

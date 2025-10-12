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

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        console.log('🔍 Dashboard: Fetching analytics for company:', companyId)

        // Fetch analytics
        const analyticsResponse = await fetch(`/api/analytics?company_id=${companyId}`)
        console.log('📡 Dashboard: Response status:', analyticsResponse.status)
        if (!analyticsResponse.ok) {
          throw new Error('Failed to fetch analytics')
        }
        const data = await analyticsResponse.json()
        console.log('📊 Dashboard: Received data:', data)
        console.log('💰 MRR:', data.mrr?.total, '| ARR:', data.arr, '| ARPU:', data.arpu)
        console.log('👥 Active Subscribers:', data.activeUniqueSubscribers)
        setAnalytics(data)

        // Fetch transactions in background (don't wait for it)
        console.log('🔄 Starting transactions fetch...')
        fetch(`/api/transactions?company_id=${companyId}`)
          .then(res => {
            console.log('📡 Transactions response status:', res.status)
            return res.json()
          })
          .then(transactionData => {
            console.log('✅ Transactions fetched successfully:', transactionData.total, 'receipts')
          })
          .catch(err => {
            console.error('❌ Error fetching transactions:', err)
          })
      } catch (err) {
        console.error('❌ Dashboard: Error fetching analytics:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
            <h1 className="text-3xl font-bold text-gray-900">📊 Overview</h1>
            <p className="text-gray-600 mt-1">Your Whop analytics at a glance</p>
          </div>
          {analytics.cached && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <div className="text-sm">
                <div className="font-semibold text-green-900">Using Cached Data</div>
                <div className="text-green-700">
                  {analytics.snapshotDate && new Date(analytics.snapshotDate).toLocaleDateString()} snapshot
                </div>
              </div>
            </div>
          )}
        </div>
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

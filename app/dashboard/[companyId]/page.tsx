'use client'

import { useEffect, useState } from 'react'
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
}

export default function DashboardPage({ params }: { params: Promise<{ companyId: string }> }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)

  useEffect(() => {
    params.then(p => setCompanyId(p.companyId))
  }, [params])

  useEffect(() => {
    if (!companyId) return

    async function fetchAnalytics() {
      try {
        const response = await fetch(`/api/analytics?company_id=${companyId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch analytics')
        }
        const data = await response.json()
        setAnalytics(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [companyId])

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
        <h1 className="text-3xl font-bold text-gray-900">📊 Overview</h1>
        <p className="text-gray-600 mt-1">Your Whop analytics at a glance</p>
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

'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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
}

export default function MRRPage({ params }: { params: Promise<{ companyId: string }> }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string>('')

  useEffect(() => {
    params.then((p) => {
      setCompanyId(p.companyId)
      fetch(`/api/analytics?company_id=${p.companyId}`)
        .then(res => res.json())
        .then(data => {
          setAnalytics(data)
          setLoading(false)
        })
        .catch(err => {
          console.error('Failed to fetch analytics:', err)
          setLoading(false)
        })
    })
  }, [params])

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (!analytics) {
    return <div className="p-8">Failed to load analytics data</div>
  }

  // Mock historical data - in production, this would come from your database
  const historicalData = [
    { month: 'Jan', mrr: 0 },
    { month: 'Feb', mrr: 0 },
    { month: 'Mar', mrr: 0 },
    { month: 'Apr', mrr: 0 },
    { month: 'May', mrr: analytics.mrr.total * 0.4 },
    { month: 'Jun', mrr: analytics.mrr.total * 0.6 },
    { month: 'Jul', mrr: analytics.mrr.total * 0.75 },
    { month: 'Aug', mrr: analytics.mrr.total * 0.85 },
    { month: 'Sep', mrr: analytics.mrr.total * 0.92 },
    { month: 'Oct', mrr: analytics.mrr.total },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Monthly Recurring Revenue</h1>
        <p className="text-gray-600">Track your normalized monthly recurring revenue over time</p>
      </div>

      {/* Current MRR Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-4xl font-bold text-gray-900">
            ${analytics.mrr.total.toFixed(2)}
          </span>
          <span className="text-gray-500">/ month</span>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6">
          <div>
            <div className="text-sm text-gray-600">Monthly Plans</div>
            <div className="text-xl font-semibold text-gray-900">${analytics.mrr.breakdown.monthly.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Annual Plans (normalized)</div>
            <div className="text-xl font-semibold text-gray-900">${analytics.mrr.breakdown.annual.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Quarterly Plans</div>
            <div className="text-xl font-semibold text-gray-900">${analytics.mrr.breakdown.quarterly.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Other Plans</div>
            <div className="text-xl font-semibold text-gray-900">${analytics.mrr.breakdown.other.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* MRR Trend Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">MRR Growth Trend</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={historicalData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => `$${value.toFixed(2)}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="mrr"
              stroke="#3b82f6"
              strokeWidth={2}
              name="MRR"
              dot={{ fill: '#3b82f6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Info Panel */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">About MRR</h3>
        <p className="text-blue-800 text-sm">
          Monthly Recurring Revenue (MRR) is the predictable revenue your business earns each month from active subscriptions.
          All billing periods are normalized to a monthly value. For example, a $120/year subscription contributes $10/month to MRR.
        </p>
      </div>
    </div>
  )
}

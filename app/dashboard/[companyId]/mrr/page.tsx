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

interface HistoricalData {
  date: string
  mrr: number
  arr: number
  activeSubscribers: number
  arpu: number
}

export default function MRRPage({ params }: { params: Promise<{ companyId: string }> }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then((p) => {
      console.log('🔍 MRR Page: Fetching analytics for company:', p.companyId)

      // Fetch current analytics
      Promise.all([
        fetch(`/api/analytics?company_id=${p.companyId}`).then(res => res.json()),
        fetch(`/api/analytics/historical?company_id=${p.companyId}&days=90`).then(res => res.json())
      ])
        .then(([currentData, historicalResponse]) => {
          console.log('📊 MRR Page: Received current data:', currentData)
          console.log('📈 MRR Page: Received historical data:', historicalResponse)
          setAnalytics(currentData)
          setHistoricalData(historicalResponse.data || [])
          setLoading(false)
        })
        .catch(err => {
          console.error('❌ MRR Page: Failed to fetch data:', err)
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

  // Format historical data for the chart
  const chartData = historicalData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    mrr: item.mrr,
  }))

  // If no historical data, show current value only
  if (chartData.length === 0) {
    chartData.push({
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      mrr: analytics.mrr.total,
    })
  }

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
        <h2 className="text-xl font-semibold text-gray-900 mb-4">MRR Growth Trend (Last 90 Days)</h2>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
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
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">No historical data yet</p>
              <p className="text-sm">Check back tomorrow to see your MRR trend</p>
            </div>
          </div>
        )}
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

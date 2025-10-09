'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface AnalyticsData {
  arr: number
  mrr: {
    total: number
  }
}

interface HistoricalData {
  date: string
  mrr: number
  arr: number
  activeSubscribers: number
  arpu: number
}

export default function ARRPage({ params }: { params: Promise<{ companyId: string }> }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then((p) => {
      console.log('🔍 ARR Page: Fetching analytics for company:', p.companyId)

      // Fetch current and historical analytics
      Promise.all([
        fetch(`/api/analytics?company_id=${p.companyId}`).then(res => res.json()),
        fetch(`/api/analytics/historical?company_id=${p.companyId}&days=90`).then(res => res.json())
      ])
        .then(([currentData, historicalResponse]) => {
          console.log('📊 ARR Page: Received current data:', currentData)
          console.log('📈 ARR Page: Received historical data:', historicalResponse)
          setAnalytics(currentData)
          setHistoricalData(historicalResponse.data || [])
          setLoading(false)
        })
        .catch(err => {
          console.error('❌ ARR Page: Failed to fetch data:', err)
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
    arr: item.arr,
  }))

  // If no historical data, show current value only
  if (chartData.length === 0) {
    chartData.push({
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      arr: analytics.arr,
    })
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Annual Run Rate</h1>
        <p className="text-gray-600">Your annualized recurring revenue based on current MRR</p>
      </div>

      {/* Current ARR Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-4xl font-bold text-gray-900">
            ${analytics.arr.toFixed(2)}
          </span>
          <span className="text-gray-500">/ year</span>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-6">
          <div>
            <div className="text-sm text-gray-600">Current MRR</div>
            <div className="text-2xl font-semibold text-gray-900">${analytics.mrr.total.toFixed(2)}</div>
            <div className="text-sm text-gray-500 mt-1">Monthly recurring revenue</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Calculation</div>
            <div className="text-lg font-mono text-gray-700">MRR × 12 = ARR</div>
            <div className="text-sm text-gray-500 mt-1">${analytics.mrr.total.toFixed(2)} × 12 = ${analytics.arr.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* ARR Trend Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">ARR Growth Trend (Last 90 Days)</h2>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => `$${value.toFixed(2)}`}
              />
              <Legend />
              <Bar
                dataKey="arr"
                fill="#10b981"
                name="ARR"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">No historical data yet</p>
              <p className="text-sm">Check back tomorrow to see your ARR trend</p>
            </div>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="font-semibold text-green-900 mb-2">About ARR</h3>
        <p className="text-green-800 text-sm mb-4">
          Annual Run Rate (ARR) represents the annualized value of your recurring revenue. It&apos;s calculated by multiplying your
          current Monthly Recurring Revenue (MRR) by 12.
        </p>
        <p className="text-green-800 text-sm">
          ARR is a forward-looking metric that assumes your current MRR remains constant for the next 12 months. It&apos;s commonly
          used for financial planning and investor reporting.
        </p>
      </div>
    </div>
  )
}

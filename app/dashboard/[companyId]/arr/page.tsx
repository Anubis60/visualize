'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface AnalyticsData {
  arr: number
  mrr: {
    total: number
  }
}

export default function ARRPage({ params }: { params: Promise<{ companyId: string }> }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then((p) => {
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

  // Mock quarterly breakdown
  const quarterlyData = [
    { quarter: 'Q1', arr: analytics.arr * 0.7 },
    { quarter: 'Q2', arr: analytics.arr * 0.85 },
    { quarter: 'Q3', arr: analytics.arr * 0.92 },
    { quarter: 'Q4', arr: analytics.arr },
  ]

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

      {/* Quarterly ARR Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quarterly ARR Growth</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={quarterlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="quarter" />
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

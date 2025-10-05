'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingDown } from 'lucide-react'

export default function ChurnPage({ params }: { params: Promise<{ companyId: string }> }) {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then(p => {
      setCompanyId(p.companyId)
      setLoading(false)
    })
  }, [params])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  // Mock churn data (will be calculated from actual membership data later)
  const churnData = [
    { date: 'Week 1', churnRate: 4.2, churned: 3, active: 71 },
    { date: 'Week 2', churnRate: 5.8, churned: 4, active: 69 },
    { date: 'Week 3', churnRate: 3.1, churned: 2, active: 65 },
    { date: 'Week 4', churnRate: 6.5, churned: 4, active: 62 },
    { date: 'Current', churnRate: 5.2, churned: 3, active: 58 },
  ]

  const avgChurnRate = churnData.reduce((sum, d) => sum + d.churnRate, 0) / churnData.length
  const totalChurned = churnData.reduce((sum, d) => sum + d.churned, 0)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <TrendingDown className="h-8 w-8 mr-3 text-red-600" />
          Subscriber Churn (30 Days)
        </h1>
        <p className="text-gray-600 mt-2">Monitor customer churn rate and identify trends</p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-600 mb-1">30-Day Churn Rate</p>
          <p className="text-3xl font-bold text-red-600">{avgChurnRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-2">Average over last 30 days</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Total Churned</p>
          <p className="text-3xl font-bold">{totalChurned}</p>
          <p className="text-xs text-gray-500 mt-2">Subscribers lost this month</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Current Active</p>
          <p className="text-3xl font-bold text-green-600">{churnData[churnData.length - 1].active}</p>
          <p className="text-xs text-gray-500 mt-2">As of today</p>
        </div>
      </div>

      {/* Churn Rate Chart */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6">Churn Rate Trend</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={churnData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" label={{ value: 'Churn Rate (%)', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Active Subscribers', angle: 90, position: 'insideRight' }} />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="churnRate"
              stroke="#ef4444"
              strokeWidth={3}
              name="Churn Rate (%)"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="active"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Active Subscribers"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">📊 Churn Insights</h3>
        <ul className="space-y-2 text-yellow-800">
          <li>• Your average churn rate is {avgChurnRate.toFixed(1)}% - Industry benchmark is ~5-7%</li>
          <li>• You lost {totalChurned} subscribers in the last 30 days</li>
          <li>• Peak churn occurred in Week 4 ({Math.max(...churnData.map(d => d.churnRate)).toFixed(1)}%)</li>
        </ul>
        <p className="text-sm text-yellow-700 mt-4">
          * Churn calculations will be real-time once we implement historical tracking
        </p>
      </div>
    </div>
  )
}

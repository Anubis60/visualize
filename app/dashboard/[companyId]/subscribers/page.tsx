'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Users } from 'lucide-react'

interface AnalyticsData {
  subscribers: {
    active: number
    cancelled: number
    past_due: number
    trialing: number
    total: number
  }
  activeUniqueSubscribers: number
  timestamp: string
}

export default function SubscribersPage({ params }: { params: Promise<{ companyId: string }> }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)

  useEffect(() => {
    params.then(p => setCompanyId(p.companyId))
  }, [params])

  useEffect(() => {
    if (!companyId) return

    async function fetchAnalytics() {
      try {
        const response = await fetch(`/api/analytics?company_id=${companyId}`)
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        setAnalytics(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [companyId])

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

  if (!analytics) return null

  // Mock historical data (in real app, fetch from API with date range)
  const mockHistoricalData = [
    { date: 'Jan', subscribers: analytics.activeUniqueSubscribers - 20 },
    { date: 'Feb', subscribers: analytics.activeUniqueSubscribers - 15 },
    { date: 'Mar', subscribers: analytics.activeUniqueSubscribers - 10 },
    { date: 'Apr', subscribers: analytics.activeUniqueSubscribers - 5 },
    { date: 'May', subscribers: analytics.activeUniqueSubscribers },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Users className="h-8 w-8 mr-3 text-blue-600" />
          Subscriber Count
        </h1>
        <p className="text-gray-600 mt-2">Track your active subscriber growth over time</p>
      </div>

      {/* Current Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Active Subscribers</p>
          <p className="text-3xl font-bold text-green-600">{analytics.activeUniqueSubscribers}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Total Memberships</p>
          <p className="text-3xl font-bold">{analytics.subscribers.active}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Cancelled</p>
          <p className="text-3xl font-bold text-red-600">{analytics.subscribers.cancelled}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Trialing</p>
          <p className="text-3xl font-bold text-blue-600">{analytics.subscribers.trialing}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-6">Subscriber Growth Trend</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={mockHistoricalData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="subscribers"
              stroke="#3b82f6"
              strokeWidth={3}
              name="Active Subscribers"
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-sm text-gray-500 mt-4">
          * Historical data will be available once we implement time-series tracking
        </p>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { MetricsChart } from '@/components/charts/MetricsChart'
import { DataTable } from '@/components/charts/DataTable'

interface AnalyticsData {
  revenue: {
    total: number
    recurring: number
    nonRecurring: number
    growth: number
  }
}

interface ChartDataPoint {
  date: string
  value: number
}

export default function RevenuePage({ params }: { params: Promise<{ companyId: string }> }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then((p) => {
      console.log('🔍 Revenue Page: Fetching analytics for company:', p.companyId)

      fetch(`/api/analytics/enriched?company_id=${p.companyId}`)
        .then(res => res.json())
        .then((currentData) => {
          setAnalytics(currentData)
          const now = new Date()
          setChartData([{
            date: now.toISOString(),
            value: currentData.revenue?.total || 0
          }])
          setLoading(false)
        })
        .catch(err => {
          console.error('❌ Revenue Page: Failed to fetch data:', err)
          setLoading(false)
        })
    })
  }, [params])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading revenue data...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="p-8">
        <p className="text-red-600">Failed to load revenue data</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">💵 Revenue</h1>
        <p className="text-gray-600 mt-1">Track total revenue and revenue growth</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-600">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            ${analytics.revenue?.total?.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-sm font-medium text-gray-600">Recurring Revenue</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            ${analytics.revenue?.recurring?.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <p className="text-sm font-medium text-gray-600">Non-Recurring Revenue</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            ${analytics.revenue?.nonRecurring?.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <p className="text-sm font-medium text-gray-600">Growth Rate</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {analytics.revenue?.growth?.toFixed(1) || '0.0'}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Total Revenue Over Time</h2>
        <MetricsChart
          data={chartData}
          chartType="line"
          label="Revenue"
          color="#10b981"
        />
      </div>

      <DataTable data={chartData} label="Revenue" />
    </div>
  )
}

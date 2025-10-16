'use client'

import { useEffect, useState } from 'react'
import { MetricsChart } from '@/components/charts/MetricsChart'
import { DataTable } from '@/components/charts/DataTable'

interface AnalyticsData {
  trials: {
    total: number
    active: number
    converted: number
    conversionRate: number
  }
}

interface ChartDataPoint {
  date: string
  value: number
}

export default function TrialsPage({ params }: { params: Promise<{ companyId: string }> }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then((p) => {
      fetch(`/api/analytics/enriched?company_id=${p.companyId}`)
        .then(res => res.json())
        .then((currentData) => {
          setAnalytics(currentData)
          // Create simple chart data from current metrics
          const now = new Date()
          setChartData([{
            date: now.toISOString(),
            value: currentData.trials?.total || 0
          }])
          setLoading(false)
        })
        .catch(() => {
          // Error fetching data
          setLoading(false)
        })
    })
  }, [params])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading trial data...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="p-8">
        <p className="text-red-600">Failed to load trial data</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🎯 Free Trials</h1>
        <p className="text-gray-600 mt-1">Track your trial signups and conversion metrics</p>
      </div>

      {/* Current Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-sm font-medium text-gray-600">Total Trials</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.trials?.total || 0}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-600">Active Trials</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.trials?.active || 0}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <p className="text-sm font-medium text-gray-600">Converted</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.trials?.converted || 0}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {analytics.trials?.conversionRate?.toFixed(1) || 0}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Trial Signups Over Time</h2>
        <MetricsChart
          data={chartData}
          chartType="line"
          label="Trials"
          color="#8b5cf6"
        />
      </div>

      {/* Data Table */}
      <DataTable data={chartData} label="Trials" />
    </div>
  )
}

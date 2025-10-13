'use client'

import { useEffect, useState } from 'react'
import { MetricsChart } from '@/components/charts/MetricsChart'
import { DataTable } from '@/components/charts/DataTable'

interface AnalyticsData {
  cancellations: {
    total: number
    rate: number
    voluntary: number
    involuntary: number
  }
}

interface ChartDataPoint {
  date: string
  value: number
}

export default function CancellationsPage({ params }: { params: Promise<{ companyId: string }> }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then((p) => {
      fetch(`/api/analytics/enriched?company_id=${p.companyId}`)
        .then(res => res.json())
        .then((currentData) => {
          setAnalytics(currentData)
          const now = new Date()
          setChartData([{
            date: now.toISOString(),
            value: currentData.cancellations?.total || 0
          }])
          setLoading(false)
        })
        .catch(err => {
          console.error('❌ Cancellations Page: Failed to fetch data:', err)
          setLoading(false)
        })
    })
  }, [params])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading cancellation data...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="p-8">
        <p className="text-red-600">Failed to load cancellation data</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">❌ Cancellations</h1>
        <p className="text-gray-600 mt-1">Track customer cancellations and cancellation rate</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <p className="text-sm font-medium text-gray-600">Total Cancellations</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {analytics.cancellations?.total || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <p className="text-sm font-medium text-gray-600">Cancellation Rate</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {analytics.cancellations?.rate?.toFixed(1) || '0.0'}%
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <p className="text-sm font-medium text-gray-600">Voluntary</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {analytics.cancellations?.voluntary || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-500">
          <p className="text-sm font-medium text-gray-600">Involuntary</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {analytics.cancellations?.involuntary || 0}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Cancellations Over Time</h2>
        <MetricsChart
          data={chartData}
          chartType="line"
          label="Cancellations"
          color="#ef4444"
        />
      </div>

      <DataTable data={chartData} label="Cancellations" />
    </div>
  )
}

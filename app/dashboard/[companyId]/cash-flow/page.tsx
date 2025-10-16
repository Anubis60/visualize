'use client'

import { useEffect, useState } from 'react'
import { MetricsChart } from '@/components/charts/MetricsChart'
import { DataTable } from '@/components/charts/DataTable'

interface AnalyticsData {
  cashFlow: {
    gross: number
    net: number
    recurring: number
    nonRecurring: number
  }
}

interface ChartDataPoint {
  date: string
  value: number
}

export default function CashFlowPage({ params }: { params: Promise<{ companyId: string }> }) {
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
            value: currentData.cashFlow?.net || 0
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
          <p className="mt-4 text-gray-600">Loading cash flow data...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="p-8">
        <p className="text-red-600">Failed to load cash flow data</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">💰 Cash Flow</h1>
        <p className="text-gray-600 mt-1">Monitor your revenue streams and cash flow metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-600">Gross Cash Flow</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            ${analytics.cashFlow?.gross?.toFixed(2) || '0.00'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Total revenue before fees</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-sm font-medium text-gray-600">Net Cash Flow</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            ${analytics.cashFlow?.net?.toFixed(2) || '0.00'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Revenue after fees</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <p className="text-sm font-medium text-gray-600">Recurring Revenue</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            ${analytics.cashFlow?.recurring?.toFixed(2) || '0.00'}
          </p>
          <p className="text-xs text-gray-500 mt-1">From subscriptions</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <p className="text-sm font-medium text-gray-600">Non-Recurring</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            ${analytics.cashFlow?.nonRecurring?.toFixed(2) || '0.00'}
          </p>
          <p className="text-xs text-gray-500 mt-1">One-time payments</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Net Cash Flow Over Time</h2>
        <MetricsChart
          data={chartData}
          chartType="line"
          label="Net Cash Flow"
          color="#3b82f6"
        />
      </div>

      <DataTable data={chartData} label="Net Cash Flow" />
    </div>
  )
}

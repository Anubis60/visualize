'use client'

import { useEffect, useState } from 'react'
import { MetricsChart } from '@/components/charts/MetricsChart'
import { DataTable } from '@/components/charts/DataTable'

interface AnalyticsData {
  payments: {
    successful: number
    failed: number
    total: number
    successRate: number
  }
}

interface ChartDataPoint {
  date: string
  value: number
}

export default function PaymentsPage({ params }: { params: Promise<{ companyId: string }> }) {
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
            value: currentData.payments?.successful || 0
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
          <p className="mt-4 text-gray-600">Loading payment data...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="p-8">
        <p className="text-red-600">Failed to load payment data</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">💳 Payments</h1>
        <p className="text-gray-600 mt-1">Track successful and failed payment transactions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-600">Successful Payments</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {analytics.payments?.successful || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <p className="text-sm font-medium text-gray-600">Failed Payments</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {analytics.payments?.failed || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-sm font-medium text-gray-600">Total Payments</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {analytics.payments?.total || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <p className="text-sm font-medium text-gray-600">Success Rate</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {analytics.payments?.successRate?.toFixed(1) || 0}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Successful Payments Over Time</h2>
        <MetricsChart
          data={chartData}
          chartType="line"
          label="Successful Payments"
          color="#10b981"
        />
      </div>

      <DataTable data={chartData} label="Successful Payments" />
    </div>
  )
}

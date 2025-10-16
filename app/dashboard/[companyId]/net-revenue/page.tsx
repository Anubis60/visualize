'use client'

import { useEffect, useState } from 'react'
import { ChartControls } from '@/components/charts/ChartControls'
import { MetricsChart } from '@/components/charts/MetricsChart'
import { DataTable } from '@/components/charts/DataTable'
import { useChartData, HistoricalDataPoint } from '@/lib/hooks/useChartData'

interface AnalyticsData {
  netRevenue: {
    total: number
    refunds: number
    fees: number
    gross: number
  }
  plans: Array<{ id: string; name: string }>
}

export default function NetRevenuePage({ params }: { params: Promise<{ companyId: string }> }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then((p) => {
      Promise.all([
        fetch(`/api/analytics/enriched?company_id=${p.companyId}`).then(res => res.json()),
        fetch(`/api/analytics/historical?company_id=${p.companyId}&days=365`).then(res => res.json())
      ])
        .then(([currentData, historicalResponse]) => {
          setAnalytics(currentData)
          setHistoricalData(historicalResponse.data || [])
          setLoading(false)
        })
        .catch(() => setLoading(false))
    })
  }, [params])

  const {
    chartType,
    setChartType,
    selectedPlan,
    setSelectedPlan,
    timePeriod,
    setTimePeriod,
    dateRange,
    setDateRange,
    chartData,
  } = useChartData(historicalData, 'netRevenue')

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div><p className="mt-4 text-gray-600">Loading net revenue data...</p></div></div>
  if (!analytics) return <div className="p-8"><p className="text-red-600">Failed to load net revenue data</p></div>

  const plans = analytics.plans || []

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">💰 Net Revenue</h1>
        <p className="text-gray-600 mt-1">Track revenue after refunds and fees</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-600">Net Revenue</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">${analytics.netRevenue?.total?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-sm font-medium text-gray-600">Gross Revenue</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">${analytics.netRevenue?.gross?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <p className="text-sm font-medium text-gray-600">Refunds</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">${analytics.netRevenue?.refunds?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <p className="text-sm font-medium text-gray-600">Fees</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">${analytics.netRevenue?.fees?.toFixed(2) || '0.00'}</p>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Net Revenue Over Time</h2>
        <ChartControls
          chartType={chartType}
          onChartTypeChange={setChartType}
          plans={plans}
          selectedPlan={selectedPlan}
          onPlanChange={setSelectedPlan}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
        />
        <MetricsChart data={chartData} chartType={chartType} label="Net Revenue" color="#10b981" />
      </div>
      <DataTable data={chartData} label="Net Revenue" />
    </div>
  )
}

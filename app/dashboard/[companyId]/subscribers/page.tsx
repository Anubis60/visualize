'use client'

import { useEffect, useState } from 'react'
import { ChartControls } from '@/components/charts/ChartControls'
import { MetricsChart } from '@/components/charts/MetricsChart'
import { DataTable } from '@/components/charts/DataTable'
import { useChartData, HistoricalDataPoint } from '@/lib/hooks/useChartData'
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
  plans: Array<{ id: string; name: string }>
  timestamp: string
}

export default function SubscribersPage({ params }: { params: Promise<{ companyId: string }> }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then((p) => {
      // Fetch current analytics and historical data
      Promise.all([
        fetch(`/api/analytics?company_id=${p.companyId}`).then(res => res.json()),
        fetch(`/api/analytics/historical?company_id=${p.companyId}&days=365`).then(res => res.json())
      ])
        .then(([currentData, historicalResponse]) => {
          setAnalytics(currentData)
          setHistoricalData(historicalResponse.data || [])
          setLoading(false)
        })
        .catch(() => {
          setLoading(false)
        })
    })
  }, [params])

  // Chart data management
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
  } = useChartData(historicalData, 'activeSubscribers')

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (!analytics) {
    return <div className="p-8">Failed to load analytics data</div>
  }

  const plans = analytics.plans || []

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

      {/* Subscriber Growth Chart */}
      <div className="bg-white rounded-xl shadow p-6">
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

        <MetricsChart
          data={chartData}
          chartType={chartType}
          color="#3b82f6"
          label="Active Subscribers"
        />

        <DataTable data={chartData} label="Active Subscribers" />
      </div>
    </div>
  )
}

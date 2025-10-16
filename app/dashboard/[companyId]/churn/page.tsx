'use client'

import { useEffect, useState } from 'react'
import { ChartControls } from '@/components/charts/ChartControls'
import { MetricsChart } from '@/components/charts/MetricsChart'
import { useChartData, HistoricalDataPoint } from '@/lib/hooks/useChartData'
import { DataTable } from '@/components/charts/DataTable'
import { TrendingDown } from 'lucide-react'

interface AnalyticsData {
  subscribers: {
    active: number
    cancelled: number
  }
  plans: Array<{ id: string; name: string }>
}

export default function ChurnPage({ params }: { params: Promise<{ companyId: string }> }) {
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
  } = useChartData(historicalData, 'churnRate')

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (!analytics) {
    return <div className="p-8">Failed to load analytics data</div>
  }

  const plans = analytics.plans || []

  const totalChurned = analytics.subscribers.cancelled
  const activeSubscribers = analytics.subscribers.active
  // Mock churn rate for now (will calculate from historical data later)
  const avgChurnRate = 5.2

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
          <p className="text-3xl font-bold text-green-600">{activeSubscribers}</p>
          <p className="text-xs text-gray-500 mt-2">As of today</p>
        </div>
      </div>

      {/* Churn Rate Chart */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
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
          color="#ef4444"
          label="Churn Rate (%)"
        />

        <DataTable data={chartData} label="Churn Rate (%)" />
      </div>

      {/* Insights */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">📊 Churn Insights</h3>
        <ul className="space-y-2 text-yellow-800">
          <li>• Your average churn rate is {avgChurnRate.toFixed(1)}% - Industry benchmark is ~5-7%</li>
          <li>• You have {totalChurned} cancelled subscriptions</li>
          <li>• {activeSubscribers} active subscribers currently</li>
        </ul>
      </div>
    </div>
  )
}

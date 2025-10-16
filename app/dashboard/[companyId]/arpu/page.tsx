'use client'

import { useEffect, useState } from 'react'
import { ChartControls } from '@/components/charts/ChartControls'
import { MetricsChart } from '@/components/charts/MetricsChart'
import { useChartData, HistoricalDataPoint } from '@/lib/hooks/useChartData'
import { DataTable } from '@/components/charts/DataTable'
import { DollarSign } from 'lucide-react'

interface AnalyticsData {
  mrr: {
    total: number
  }
  arpu: number
  activeUniqueSubscribers: number
  plans: Array<{ id: string; name: string }>
}

export default function ARPUPage({ params }: { params: Promise<{ companyId: string }> }) {
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
  } = useChartData(historicalData, 'arpu')

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (!analytics) {
    return <div className="p-8">Failed to load analytics data</div>
  }

  const plans = analytics.plans || []
  const totalRevenue = analytics.mrr.total
  const activeAccounts = analytics.activeUniqueSubscribers

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <DollarSign className="h-8 w-8 mr-3 text-green-600" />
          Average Revenue Per Account (ARPU)
        </h1>
        <p className="text-gray-600 mt-2">Track revenue efficiency and customer value</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Current ARPU</p>
          <p className="text-3xl font-bold text-green-600">
            ${analytics.arpu > 0 ? analytics.arpu.toFixed(2) : '0.00'}
          </p>
          <p className="text-xs text-gray-500 mt-2">Per active account/month</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Total MRR</p>
          <p className="text-3xl font-bold">${totalRevenue.toFixed(0)}</p>
          <p className="text-xs text-gray-500 mt-2">Monthly recurring revenue</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Active Accounts</p>
          <p className="text-3xl font-bold text-blue-600">{activeAccounts}</p>
          <p className="text-xs text-gray-500 mt-2">Contributing to ARPU</p>
        </div>
      </div>

      {/* ARPU Trend Chart */}
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
          color="#10b981"
          label="ARPU"
        />

        <DataTable data={chartData} label="ARPU" />
      </div>

      {/* Formula Explanation */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 How ARPU is Calculated</h3>
        <div className="text-blue-800">
          <p className="mb-2">
            <strong>Formula:</strong> ARPU = Total MRR ÷ Active Unique Subscribers
          </p>
          <p className="mb-2">
            <strong>Current Calculation:</strong> ${totalRevenue.toFixed(0)} ÷ {activeAccounts} = ${analytics.arpu.toFixed(2)}
          </p>
          <p className="text-sm text-blue-700 mt-4">
            ARPU helps you understand the average value of each customer. Higher ARPU indicates customers are on premium plans or purchasing add-ons.
          </p>
        </div>
      </div>
    </div>
  )
}

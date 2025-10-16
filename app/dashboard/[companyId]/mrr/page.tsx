'use client'

import { useEffect, useState } from 'react'
import { ChartControls } from '@/components/charts/ChartControls'
import { MetricsChart } from '@/components/charts/MetricsChart'
import { DataTable } from '@/components/charts/DataTable'
import { useChartData, HistoricalDataPoint } from '@/lib/hooks/useChartData'

interface AnalyticsData {
  mrr: {
    total: number
    breakdown: {
      monthly: number
      annual: number
      quarterly: number
      other: number
    }
  }
  plans: Array<{ id: string; name: string }>
}

export default function MRRPage({ params }: { params: Promise<{ companyId: string }> }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then((p) => {
      // Fetch current analytics and up to 1 year of historical data
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
  } = useChartData(historicalData, 'mrr')

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (!analytics) {
    return <div className="p-8">Failed to load analytics data</div>
  }

  const plans = analytics.plans || []

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Monthly Recurring Revenue</h1>
        <p className="text-gray-600">Track your normalized monthly recurring revenue over time</p>
      </div>

      {/* Current MRR Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-4xl font-bold text-gray-900">
            ${analytics.mrr.total.toFixed(2)}
          </span>
          <span className="text-gray-500">/ month</span>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6">
          <div>
            <div className="text-sm text-gray-600">Monthly Plans</div>
            <div className="text-xl font-semibold text-gray-900">${analytics.mrr.breakdown.monthly.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Annual Plans (normalized)</div>
            <div className="text-xl font-semibold text-gray-900">${analytics.mrr.breakdown.annual.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Quarterly Plans</div>
            <div className="text-xl font-semibold text-gray-900">${analytics.mrr.breakdown.quarterly.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Other Plans</div>
            <div className="text-xl font-semibold text-gray-900">${analytics.mrr.breakdown.other.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* MRR Trend Chart */}
      <div className="bg-white rounded-lg shadow p-6">
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
          color="#8b5cf6"
          label="MRR"
        />

        <DataTable data={chartData} label="MRR" />
      </div>

      {/* Info Panel */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">About MRR</h3>
        <p className="text-blue-800 text-sm">
          Monthly Recurring Revenue (MRR) is the predictable revenue your business earns each month from active subscriptions.
          All billing periods are normalized to a monthly value. For example, a $120/year subscription contributes $10/month to MRR.
        </p>
      </div>
    </div>
  )
}

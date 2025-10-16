'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ChartControls, ChartType, TimePeriod } from '@/components/charts/ChartControls'

interface AnalyticsData {
  mrr: {
    total: number
  }
  activeUniqueSubscribers: number
  plans: Array<{ id: string; name: string }>
}

export default function NetMRRMovementsPage({ params }: { params: Promise<{ companyId: string }> }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month')
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 6)),
    to: new Date(),
  })

  useEffect(() => {
    params.then((p) => {
      fetch(`/api/analytics?company_id=${p.companyId}`)
        .then(res => res.json())
        .then(data => {
          setAnalytics(data)
          setLoading(false)
        })
        .catch(() => {
          setLoading(false)
        })
    })
  }, [params])

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (!analytics) {
    return <div className="p-8">Failed to load analytics data</div>
  }

  const plans = analytics.plans || []

  // Mock MRR movements data - in production, track actual subscription changes
  const movementsData = [
    { month: 'May', newBusiness: 450, expansion: 120, contraction: -50, churn: -80, net: 440 },
    { month: 'Jun', newBusiness: 380, expansion: 90, contraction: -30, churn: -60, net: 380 },
    { month: 'Jul', newBusiness: 520, expansion: 150, contraction: -70, churn: -100, net: 500 },
    { month: 'Aug', newBusiness: 290, expansion: 80, contraction: -40, churn: -70, net: 260 },
    { month: 'Sep', newBusiness: 410, expansion: 110, contraction: -60, churn: -90, net: 370 },
    { month: 'Oct', newBusiness: 330, expansion: 95, contraction: -45, churn: -75, net: 305 },
  ]

  const totalNewBusiness = movementsData.reduce((sum, d) => sum + d.newBusiness, 0)
  const totalExpansion = movementsData.reduce((sum, d) => sum + d.expansion, 0)
  const totalContraction = movementsData.reduce((sum, d) => sum + Math.abs(d.contraction), 0)
  const totalChurn = movementsData.reduce((sum, d) => sum + Math.abs(d.churn), 0)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Net MRR Movements</h1>
        <p className="text-gray-600">Track the cumulative impact of all subscription changes by customer</p>
      </div>

      {/* Movement Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">New Business</div>
          <div className="text-2xl font-bold text-green-600">+${totalNewBusiness}</div>
          <div className="text-xs text-gray-500 mt-1">Revenue from new customers</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Expansion</div>
          <div className="text-2xl font-bold text-blue-600">+${totalExpansion}</div>
          <div className="text-xs text-gray-500 mt-1">Upgrades & add-ons</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Contraction</div>
          <div className="text-2xl font-bold text-orange-600">-${totalContraction}</div>
          <div className="text-xs text-gray-500 mt-1">Downgrades</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Churn</div>
          <div className="text-2xl font-bold text-red-600">-${totalChurn}</div>
          <div className="text-xs text-gray-500 mt-1">Cancelled subscriptions</div>
        </div>
      </div>

      {/* Net MRR Movements Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
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

        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={movementsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => `$${Math.abs(value)}`}
            />
            <Legend />
            <Bar dataKey="newBusiness" fill="#10b981" name="New Business" stackId="a" />
            <Bar dataKey="expansion" fill="#3b82f6" name="Expansion" stackId="a" />
            <Bar dataKey="contraction" fill="#f59e0b" name="Contraction" stackId="a" />
            <Bar dataKey="churn" fill="#ef4444" name="Churn" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Info Panel */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <h3 className="font-semibold text-purple-900 mb-2">Understanding Net MRR Movements</h3>
        <div className="space-y-3 text-sm text-purple-800">
          <div>
            <span className="font-semibold">New Business:</span> MRR from customers who started their first subscription
          </div>
          <div>
            <span className="font-semibold">Expansion:</span> Additional MRR from existing customers (upgrades, add-ons)
          </div>
          <div>
            <span className="font-semibold">Contraction:</span> Lost MRR from existing customers downgrading their plans
          </div>
          <div>
            <span className="font-semibold">Churn:</span> Lost MRR from customers who cancelled all subscriptions
          </div>
          <div>
            <span className="font-semibold">Reactivation:</span> MRR from previously churned customers who return
          </div>
          <div className="mt-4 pt-4 border-t border-purple-200">
            <span className="font-semibold">Note:</span> This chart groups each customer&apos;s MRR movements into a single net movement,
            showing the combined impact across all of a customer&apos;s subscriptions rather than individual subscription changes.
          </div>
        </div>
      </div>
    </div>
  )
}

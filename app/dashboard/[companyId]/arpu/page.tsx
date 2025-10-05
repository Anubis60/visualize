'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { DollarSign } from 'lucide-react'

interface AnalyticsData {
  mrr: {
    total: number
  }
  arpu: number
  activeUniqueSubscribers: number
}

export default function ARPUPage({ params }: { params: Promise<{ companyId: string }> }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)

  useEffect(() => {
    params.then(p => setCompanyId(p.companyId))
  }, [params])

  useEffect(() => {
    if (!companyId) return

    async function fetchAnalytics() {
      try {
        const response = await fetch(`/api/analytics?company_id=${companyId}`)
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        setAnalytics(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [companyId])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!analytics) return null

  // Mock historical ARPU data
  const arpuTrend = [
    { month: 'Jan', arpu: analytics.arpu > 0 ? analytics.arpu - 5 : 25 },
    { month: 'Feb', arpu: analytics.arpu > 0 ? analytics.arpu - 3 : 27 },
    { month: 'Mar', arpu: analytics.arpu > 0 ? analytics.arpu - 1 : 29 },
    { month: 'Apr', arpu: analytics.arpu > 0 ? analytics.arpu : 30 },
    { month: 'May', arpu: analytics.arpu > 0 ? analytics.arpu : 30 },
  ]

  // Mock ARPU by plan (will be real once we have plan pricing)
  const arpuByPlan = [
    { plan: 'Infinity', arpu: 30, subscribers: 25 },
    { plan: 'Infinity Elite', arpu: 50, subscribers: 8 },
    { plan: 'Free Trial', arpu: 0, subscribers: 5 },
  ]

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

      {/* ARPU Trend */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6">ARPU Trend Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={arpuTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `$${value}`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="arpu"
              stroke="#10b981"
              strokeWidth={3}
              name="ARPU ($)"
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-sm text-gray-500 mt-4">
          * Once plan pricing data is available, ARPU will show real values
        </p>
      </div>

      {/* ARPU by Plan */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6">ARPU by Plan Type</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={arpuByPlan}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="plan" />
            <YAxis yAxisId="left" label={{ value: 'ARPU ($)', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Subscribers', angle: 90, position: 'insideRight' }} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="arpu" fill="#3b82f6" name="ARPU ($)" />
            <Bar yAxisId="right" dataKey="subscribers" fill="#10b981" name="Subscribers" />
          </BarChart>
        </ResponsiveContainer>
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

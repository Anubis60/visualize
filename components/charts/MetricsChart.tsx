'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart } from 'recharts'
import { ChartType } from './ChartControls'

interface MetricsChartProps {
  data: Array<{ date: string; value: number }>
  chartType: ChartType
  color?: string
  label?: string
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

// Custom tooltip with modern glassmorphism design
const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl px-4 py-3 shadow-2xl shadow-purple-500/20">
        <p className="text-sm font-semibold text-gray-900 mb-1">{label}</p>
        <p className="text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          ${payload[0].value.toFixed(2)}
        </p>
      </div>
    )
  }
  return null
}

export function MetricsChart({ data, chartType, color = '#8b5cf6', label = 'Value' }: MetricsChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-900 mb-2">No data available</p>
          <p className="text-sm text-gray-500">Adjust your filters or check back later</p>
        </div>
      </div>
    )
  }

  const gradientId = `gradient-${label.replace(/\s/g, '-')}`

  return (
    <div className="relative">
      {/* Futuristic hologram glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-3xl blur-3xl -z-10" />

      <ResponsiveContainer width="100%" height={400}>
        {chartType === 'line' ? (
          <AreaChart data={data}>
            <defs>
              {/* Hologram gradient - light blue with transparency */}
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.25}/>
                <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.15}/>
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              strokeOpacity={0.3}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 500 }}
              tickMargin={12}
              axisLine={{ stroke: '#e5e7eb', strokeWidth: 1 }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 500 }}
              tickMargin={12}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#000000', strokeWidth: 2, strokeDasharray: '5 5' }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#000000"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              name={label}
              dot={{ fill: '#000000', r: 3, strokeWidth: 0 }}
              activeDot={{
                r: 6,
                fill: '#000000',
                stroke: '#fff',
                strokeWidth: 2,
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
              }}
            />
          </AreaChart>
        ) : (
          <BarChart data={data} barCategoryGap="20%">
            <defs>
              <linearGradient id={`bar-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={1}/>
                <stop offset="100%" stopColor={color} stopOpacity={0.6}/>
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              strokeOpacity={0.3}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 500 }}
              tickMargin={12}
              axisLine={{ stroke: '#e5e7eb', strokeWidth: 1 }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 500 }}
              tickMargin={12}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }} />
            <Bar
              dataKey="value"
              fill={`url(#bar-${gradientId})`}
              name={label}
              radius={[12, 12, 0, 0]}
              maxBarSize={60}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

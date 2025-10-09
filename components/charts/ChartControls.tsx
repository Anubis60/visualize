'use client'

import { cn } from '@/lib/utils'

export type ChartType = 'bar' | 'line'
export type TimePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year'

interface ChartControlsProps {
  // Chart type controls
  chartType: ChartType
  onChartTypeChange: (type: ChartType) => void

  // Plan filter
  plans: Array<{ id: string; name: string }>
  selectedPlan: string | null
  onPlanChange: (planId: string | null) => void

  // Date range
  dateRange: { from: Date; to: Date }
  onDateRangeChange: (range: { from: Date; to: Date }) => void

  // Time period
  timePeriod: TimePeriod
  onTimePeriodChange: (period: TimePeriod) => void
}

export function ChartControls({
  chartType,
  onChartTypeChange,
  plans,
  selectedPlan,
  onPlanChange,
  timePeriod,
  onTimePeriodChange,
}: ChartControlsProps) {
  const timePeriods: { value: TimePeriod; label: string }[] = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'quarter', label: 'Quarter' },
    { value: 'year', label: 'Year' },
  ]

  return (
    <div className="flex items-center justify-between mb-4">
      {/* Left: Chart Type Switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onChartTypeChange('line')}
          className={cn(
            'px-3 py-1 text-sm rounded-md transition-colors',
            chartType === 'line'
              ? 'bg-white shadow-sm text-gray-900 font-medium'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          Line
        </button>
        <button
          onClick={() => onChartTypeChange('bar')}
          className={cn(
            'px-3 py-1 text-sm rounded-md transition-colors',
            chartType === 'bar'
              ? 'bg-white shadow-sm text-gray-900 font-medium'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          Bar
        </button>
      </div>

      {/* Right: Plan Filter and Time Period Selector */}
      <div className="flex items-center gap-3">
        {/* Plan Filter Dropdown */}
        <select
          value={selectedPlan || 'all'}
          onChange={(e) => onPlanChange(e.target.value === 'all' ? null : e.target.value)}
          className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          <option value="all">All Plans</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>

        {/* Time Period Selector */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {timePeriods.map((period) => (
            <button
              key={period.value}
              onClick={() => onTimePeriodChange(period.value)}
              className={cn(
                'px-3 py-1 text-sm rounded-md transition-colors',
                timePeriod === period.value
                  ? 'bg-white shadow-sm text-gray-900 font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

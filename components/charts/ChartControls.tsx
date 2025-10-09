'use client'

import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarIcon, BarChart3, LineChart } from 'lucide-react'
import { format } from 'date-fns'
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
  dateRange,
  onDateRangeChange,
  timePeriod,
  onTimePeriodChange,
}: ChartControlsProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

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
      <div className="flex gap-2">
        <Button
          variant={chartType === 'line' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChartTypeChange('line')}
          className="gap-2"
        >
          <LineChart className="h-4 w-4" />
          Line
        </Button>
        <Button
          variant={chartType === 'bar' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChartTypeChange('bar')}
          className="gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Bar
        </Button>
      </div>

      {/* Right: Time Period Selector */}
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
  )
}

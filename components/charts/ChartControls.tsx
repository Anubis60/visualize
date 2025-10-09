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

      {/* Right: Filters and Controls */}
      <div className="flex items-center gap-3">
        {/* Plan Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Filter by:</span>
          <Select value={selectedPlan || 'all'} onValueChange={(value) => onPlanChange(value === 'all' ? null : value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Plans" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Picker */}
        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onDateRangeChange({ from: range.from, to: range.to })
                  setIsDatePickerOpen(false)
                }
              }}
              numberOfMonths={2}
              disabled={(date) => {
                const oneYearAgo = new Date()
                oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
                return date > new Date() || date < oneYearAgo
              }}
            />
          </PopoverContent>
        </Popover>

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

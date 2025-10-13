import { useState, useMemo } from 'react'
import { subDays, subWeeks, subMonths, subQuarters, subYears, format, startOfDay, endOfDay } from 'date-fns'
import { ChartType, TimePeriod } from '@/components/charts/ChartControls'

export interface HistoricalDataPoint {
  date: string
  mrr: number
  arr: number
  activeSubscribers: number
  arpu: number
  churnRate?: number
  revenue?: number
  netRevenue?: number
  newMRR?: number
  expansionMRR?: number
  contractionMRR?: number
  churnedMRR?: number
  activeCustomers?: number
  newCustomers?: number
  upgrades?: number
  downgrades?: number
  reactivations?: number
  cancellations?: number
  trials?: number
  clv?: number
  cashFlow?: number
  successfulPayments?: number
  failedCharges?: number
  refunds?: number
  avgSalePrice?: number
  revenueChurnRate?: number
  customerChurnRate?: number
  quickRatio?: number
}

interface ChartDataPoint {
  date: string // Formatted date for display (e.g. "Oct 13")
  value: number
  fullDate?: string // Original ISO date string (e.g. "2025-10-13")
}

type MetricKey = keyof Omit<HistoricalDataPoint, 'date'>

export function useChartData(
  rawData: HistoricalDataPoint[],
  metric: MetricKey
) {
  const [chartType, setChartType] = useState<ChartType>('line')
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week')

  // Calculate default date range based on time period
  const getDefaultDateRange = (period: TimePeriod) => {
    const to = new Date()
    let from: Date

    switch (period) {
      case 'day':
        from = subDays(to, 7) // Last 7 days
        break
      case 'week':
        from = subWeeks(to, 12) // Last 12 weeks
        break
      case 'month':
        from = subMonths(to, 6) // Last 6 months
        break
      case 'quarter':
        from = subQuarters(to, 4) // Last 4 quarters
        break
      case 'year':
        from = subYears(to, 1) // Last year
        break
      default:
        from = subWeeks(to, 12)
    }

    return { from: startOfDay(from), to: endOfDay(to) }
  }

  const [dateRange, setDateRange] = useState(getDefaultDateRange(timePeriod))

  // Update date range when time period changes
  const handleTimePeriodChange = (period: TimePeriod) => {
    setTimePeriod(period)
    setDateRange(getDefaultDateRange(period))
  }

  // Filter and format data
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!rawData || rawData.length === 0) return []

    // Filter by date range
    const filteredData = rawData.filter(item => {
      const itemDate = new Date(item.date)
      return itemDate >= dateRange.from && itemDate <= dateRange.to
    })

    // Sort by date
    const sortedData = filteredData.sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Format for chart
    return sortedData.map(item => ({
      date: format(new Date(item.date), 'MMM d'),
      value: item[metric] ?? 0,
      fullDate: item.date, // Keep original date for proper parsing
    }))
  }, [rawData, dateRange, metric])

  // Aggregate data by time period if needed
  const aggregatedData = useMemo(() => {
    if (timePeriod === 'day' || chartData.length <= 30) {
      return chartData
    }

    // For larger time periods, we might want to aggregate
    // For now, just return the data as-is
    // TODO: Add proper aggregation for week/month/quarter/year
    return chartData
  }, [chartData, timePeriod])

  return {
    chartType,
    setChartType,
    selectedPlan,
    setSelectedPlan,
    timePeriod,
    setTimePeriod: handleTimePeriodChange,
    dateRange,
    setDateRange,
    chartData: aggregatedData,
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { metricsRepository } from '@/lib/db/repositories/MetricsRepository'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('company_id')
    const days = parseInt(searchParams.get('days') || '365')
    const period = searchParams.get('period') || 'daily' // daily, weekly, monthly, quarterly

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required. Pass it as ?company_id=YOUR_ID' },
        { status: 400 }
      )
    }

    // Validate period
    if (!['daily', 'weekly', 'monthly', 'quarterly'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Must be one of: daily, weekly, monthly, quarterly' },
        { status: 400 }
      )
    }

    // Fetch historical metrics based on period
    let metrics
    switch (period) {
      case 'weekly':
        const weeks = Math.ceil(days / 7)
        metrics = await metricsRepository.getWeeklyMetrics(companyId, weeks)
        break
      case 'monthly':
        const months = Math.ceil(days / 30)
        metrics = await metricsRepository.getMonthlyMetrics(companyId, months)
        break
      case 'quarterly':
        const quarters = Math.ceil(days / 90)
        metrics = await metricsRepository.getQuarterlyMetrics(companyId, quarters)
        break
      case 'daily':
      default:
        metrics = await metricsRepository.getDailyMetrics(companyId, days)
        break
    }

    return NextResponse.json({
      companyId,
      period,
      days,
      data: metrics,
      count: metrics.length,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch historical analytics' },
      { status: 500 }
    )
  }
}

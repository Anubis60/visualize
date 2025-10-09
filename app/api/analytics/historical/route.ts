import { NextRequest, NextResponse } from 'next/server'
import { metricsRepository } from '@/lib/db/repositories/MetricsRepository'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('company_id') || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID
    const days = parseInt(searchParams.get('days') || '30')

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    // Fetch historical metrics
    const metrics = await metricsRepository.getDailyMetrics(companyId, days)

    return NextResponse.json({
      companyId,
      days,
      data: metrics,
      count: metrics.length,
    })
  } catch (error) {
    console.error('Error fetching historical analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch historical analytics' },
      { status: 500 }
    )
  }
}

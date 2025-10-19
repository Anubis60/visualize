import { NextRequest, NextResponse } from 'next/server'
import { getAllPayments } from '@/lib/whop/helpers'
import { metricsRepository } from '@/lib/db/repositories/MetricsRepository'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('company_id')
    const forceRefresh = searchParams.get('force_refresh') === 'true'

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required. Pass it as ?company_id=YOUR_ID' },
        { status: 400 }
      )
    }

    // Try to use cached snapshot data if available
    if (!forceRefresh) {
      const cachedSnapshot = await metricsRepository.getLatestSnapshotWithRawData(companyId)

      if (cachedSnapshot?.rawData?.transactions) {
        return NextResponse.json({
          data: cachedSnapshot.rawData.transactions,
          cached: true,
        })
      }
    }

    // Fetch from API if no cache or force refresh
    const payments = await getAllPayments(companyId)

    return NextResponse.json({
      data: payments,
      cached: false,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch transactions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

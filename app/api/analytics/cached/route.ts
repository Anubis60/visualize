import { NextRequest, NextResponse } from 'next/server'
import { metricsRepository } from '@/lib/db/repositories/MetricsRepository'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('company_id')

    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id is required' },
        { status: 400 }
      )
    }

    console.log(`[MongoDB Read] Fetching cached analytics for company: ${companyId}`)

    // Read from MongoDB - no Whop API calls
    const snapshot = await metricsRepository.getLatestSnapshotWithRawData(companyId)

    if (!snapshot) {
      return NextResponse.json(
        { error: 'No cached data found. Please refresh the dashboard to fetch new data.' },
        { status: 404 }
      )
    }

    console.log(`[MongoDB Read] ✓ Retrieved cached analytics from ${snapshot.date}`)

    // Extract plans from rawData
    const plans = snapshot.rawData?.plans || []

    // Return the same structure as /api/analytics but from MongoDB
    return NextResponse.json({
      mrr: snapshot.mrr,
      arr: snapshot.arr,
      arpu: snapshot.arpu,
      subscribers: snapshot.subscribers,
      activeUniqueSubscribers: snapshot.activeUniqueSubscribers,
      trials: snapshot.trials,
      clv: snapshot.clv,
      cashFlow: snapshot.cashFlow,
      payments: snapshot.payments,
      refunds: snapshot.refunds,
      plans,
      timestamp: snapshot.date,
      cached: true,
      cachedAt: snapshot.date,
    })
  } catch (error) {
    console.error('[MongoDB Read] Error:', error)
    return NextResponse.json(
      { error: 'Failed to read cached analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

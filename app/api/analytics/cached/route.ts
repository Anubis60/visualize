import { NextRequest, NextResponse } from 'next/server'
import { metricsRepository } from '@/lib/db/repositories/MetricsRepository'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('company_id')
    const period = searchParams.get('period') || 'month' // day, week, month, quarter, year
    const range = parseInt(searchParams.get('range') || '6') // number of periods

    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id is required' },
        { status: 400 }
      )
    }

    console.log(`[MongoDB Read] Fetching cached analytics for company: ${companyId}`)

    // Read current snapshot from MongoDB
    const snapshot = await metricsRepository.getLatestSnapshotWithRawData(companyId)

    if (!snapshot) {
      return NextResponse.json(
        { error: 'No cached data found. Please refresh the dashboard to fetch new data.' },
        { status: 404 }
      )
    }

    console.log(`[MongoDB Read] ✓ Retrieved cached analytics from ${snapshot.date}`)

    // Fetch historical data based on period
    interface HistoricalPoint {
      date: string
      newMRR?: number
      expansionMRR?: number
      contractionMRR?: number
      churnedMRR?: number
    }

    let historical: HistoricalPoint[] = []
    try {
      switch (period) {
        case 'day':
          historical = await metricsRepository.getDailyMetrics(companyId, range)
          break
        case 'week':
          historical = await metricsRepository.getWeeklyMetrics(companyId, range)
          break
        case 'month':
          historical = await metricsRepository.getMonthlyMetrics(companyId, range)
          break
        case 'quarter':
          historical = await metricsRepository.getQuarterlyMetrics(companyId, range)
          break
        case 'year':
          historical = await metricsRepository.getDailyMetrics(companyId, 365)
          break
        default:
          historical = await metricsRepository.getMonthlyMetrics(companyId, 6)
      }
    } catch (error) {
      console.warn('[MongoDB Read] Could not fetch historical data:', error)
      historical = []
    }

    // Extract data from rawData
    const plans = snapshot.rawData?.plans || []
    const company = snapshot.rawData?.company || null

    // Format movements for waterfall chart
    const movements = historical.length > 0 ? {
      monthly: historical.map(h => ({
        month: new Date(h.date).toLocaleDateString('en-US', { month: 'short' }),
        newBusiness: h.newMRR || 0,
        expansion: h.expansionMRR || 0,
        contraction: -(h.contractionMRR || 0),
        churn: -(h.churnedMRR || 0),
        net: (h.newMRR || 0) + (h.expansionMRR || 0) - (h.contractionMRR || 0) - (h.churnedMRR || 0)
      }))
    } : null

    // Return comprehensive response
    return NextResponse.json({
      // Current snapshot
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

      // MRR Movements
      newMRR: snapshot.newMRR,
      expansionMRR: snapshot.expansionMRR,
      contractionMRR: snapshot.contractionMRR,
      churnedMRR: snapshot.churnedMRR,
      reactivations: snapshot.reactivations,

      // Advanced metrics
      revenueChurnRate: snapshot.revenueChurnRate,
      customerChurnRate: snapshot.customerChurnRate,
      quickRatio: snapshot.quickRatio,

      // Metadata
      plans,
      company,
      timestamp: snapshot.date,
      cached: true,
      cachedAt: snapshot.date,

      // Historical data for charts
      historical,
      movements,
    })
  } catch (error) {
    console.error('[MongoDB Read] Error:', error)
    return NextResponse.json(
      { error: 'Failed to read cached analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

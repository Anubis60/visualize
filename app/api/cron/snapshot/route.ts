import { NextRequest, NextResponse } from 'next/server'
import { captureCompanySnapshot } from '@/lib/services/snapshotService'

/**
 * Cron job endpoint to capture daily snapshots
 * This endpoint should be called at 5am daily by a cron scheduler
 *
 * Can be triggered:
 * 1. By the internal node-cron scheduler (automatic)
 * 2. Manually via API call for testing: GET /api/cron/snapshot
 * 3. By external cron services (e.g., Vercel Cron, GitHub Actions)
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify the request is from an authorized source
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // If CRON_SECRET is set, require authorization
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Cron job triggered: Starting daily snapshot capture...')

    const { companyRepository } = await import('@/lib/db/repositories/CompanyRepository')

    // Only capture snapshots for companies that have completed initial backfill
    const companies = await companyRepository.getCompaniesWithBackfill()

    if (companies.length === 0) {
      console.log('No companies with completed backfill. Run /api/cron/backfill first.')
      return NextResponse.json({
        success: true,
        message: 'No companies ready for daily snapshots',
        timestamp: new Date().toISOString(),
      })
    }

    console.log(`Capturing daily snapshots for ${companies.length} compan${companies.length === 1 ? 'y' : 'ies'}`)

    // Capture today's snapshot for each company
    for (const company of companies) {
      await captureCompanySnapshot(company.companyId)
      await companyRepository.updateLastSync(company.companyId)
    }

    // Log all raw data for verification
    for (const company of companies) {
      console.log('\n=== RAW DATA FOR COMPANY:', company.companyId, '===')

      // Fetch and log raw memberships
      console.log('\n--- RAW MEMBERSHIPS (ALL) ---')
      const membershipsUrl = `https://api.whop.com/api/v1/memberships?company_id=${company.companyId}`
      const membershipsRes = await fetch(membershipsUrl, {
        headers: { Authorization: `Bearer ${process.env.WHOP_API_KEY}` }
      })
      const membershipsData = await membershipsRes.json()
      console.log(JSON.stringify(membershipsData, null, 2))

      // Fetch and log raw transactions
      console.log('\n--- RAW TRANSACTIONS/PAYMENTS (ALL) ---')
      const paymentsUrl = `https://api.whop.com/api/v1/payments?company_id=${company.companyId}`
      const paymentsRes = await fetch(paymentsUrl, {
        headers: { Authorization: `Bearer ${process.env.WHOP_API_KEY}` }
      })
      const paymentsData = await paymentsRes.json()
      console.log(JSON.stringify(paymentsData, null, 2))

      // Fetch and log historical data
      console.log('\n--- HISTORICAL DATA (1 YEAR BACK - ALL) ---')
      const { metricsRepository } = await import('@/lib/db/repositories/MetricsRepository')
      const historicalData = await metricsRepository.getDailyMetrics(company.companyId, 365)
      console.log(JSON.stringify(historicalData, null, 2))

      console.log('\n=== END RAW DATA FOR', company.companyId, '===\n')
    }

    return NextResponse.json({
      success: true,
      message: 'Snapshots captured successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Cron job failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to capture snapshots',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

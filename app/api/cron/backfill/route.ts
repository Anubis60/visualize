import { NextRequest, NextResponse } from 'next/server'
import { backfillCompanyHistory, backfillAllCompaniesNeedingHistory } from '@/lib/services/backfillService'

/**
 * Backfill endpoint to capture 365 days of historical data
 * This should be called ONCE when a company first registers
 *
 * Can be triggered:
 * 1. Manually via API call: GET /api/cron/backfill?company_id=biz_xxxxx
 * 2. For all companies needing backfill: GET /api/cron/backfill
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

    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('company_id')

    if (companyId) {
      // Backfill specific company
      await backfillCompanyHistory(companyId)

      return NextResponse.json({
        success: true,
        message: 'Backfill completed successfully',
        companyId,
        timestamp: new Date().toISOString(),
      })
    } else {
      // Backfill all companies that need it
      await backfillAllCompaniesNeedingHistory()

      return NextResponse.json({
        success: true,
        message: 'Backfill completed for all companies',
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to backfill historical data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

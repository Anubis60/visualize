import { NextRequest, NextResponse } from 'next/server'
import { companyRepository } from '@/lib/db/repositories/CompanyRepository'
import { metricsRepository } from '@/lib/db/repositories/MetricsRepository'
import { backfillCompanyHistory } from '@/lib/services/backfillService'

/**
 * Ensures historical data exists for a company
 * Checks if backfill is needed and triggers it if necessary
 * This should be called automatically when dashboard loads
 */
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

    // Check if company exists
    const company = await companyRepository.findByWhopCompanyId(companyId)

    // If company exists and backfill is completed, we're done
    if (company?.backfillCompleted) {
      return NextResponse.json({
        needsBackfill: false,
        backfillCompleted: true,
        backfillCompletedAt: company.backfillCompletedAt,
        message: 'Historical data already exists',
      })
    }

    // Check if there's any historical data
    const recentSnapshots = await metricsRepository.getRecentSnapshots(companyId, 365)

    if (recentSnapshots.length >= 30 && company) {
      // If we have at least 30 days of data, mark as completed
      await companyRepository.markBackfillCompleted(companyId)
      return NextResponse.json({
        needsBackfill: false,
        backfillCompleted: true,
        snapshotsFound: recentSnapshots.length,
        message: 'Historical data exists, marked as complete',
      })
    }

    // Run backfill in background (don't await to avoid timeout)
    backfillCompanyHistory(companyId)
      .then(() => {
        // Backfill completed successfully
      })
      .catch((error) => {
      })

    return NextResponse.json({
      needsBackfill: true,
      backfillStarted: true,
      message: 'Historical data backfill started. This will take a few minutes.',
      snapshotsFound: recentSnapshots.length,
      companyExists: !!company,
    })

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to check/trigger backfill',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

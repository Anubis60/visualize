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

    console.log(`Checking backfill status for company: ${companyId}`)

    // Check if company exists
    const company = await companyRepository.findByWhopCompanyId(companyId)

    if (!company) {
      console.log(`Company ${companyId} not found in database yet`)
      return NextResponse.json({
        needsBackfill: true,
        message: 'Company not registered yet. Will be registered on first analytics fetch.',
      })
    }

    // Check if backfill is already completed
    if (company.backfillCompleted) {
      console.log(`Company ${companyId} already has backfill completed`)
      return NextResponse.json({
        needsBackfill: false,
        backfillCompleted: true,
        backfillCompletedAt: company.backfillCompletedAt,
        message: 'Historical data already exists',
      })
    }

    // Check if there's any historical data
    const recentSnapshots = await metricsRepository.getRecentSnapshots(companyId, 365)

    if (recentSnapshots.length >= 30) {
      // If we have at least 30 days of data, mark as completed
      console.log(`Company ${companyId} has ${recentSnapshots.length} snapshots, marking as complete`)
      await companyRepository.markBackfillCompleted(companyId)
      return NextResponse.json({
        needsBackfill: false,
        backfillCompleted: true,
        snapshotsFound: recentSnapshots.length,
        message: 'Historical data exists, marked as complete',
      })
    }

    // Needs backfill - trigger it
    console.log(`Company ${companyId} needs backfill. Starting 365-day historical capture...`)

    // Run backfill in background (don't await to avoid timeout)
    backfillCompanyHistory(companyId)
      .then(() => {
        console.log(`Backfill completed successfully for ${companyId}`)
      })
      .catch((error) => {
        console.error(`Backfill failed for ${companyId}:`, error)
      })

    return NextResponse.json({
      needsBackfill: true,
      backfillStarted: true,
      message: 'Historical data backfill started. This will take a few minutes.',
      snapshotsFound: recentSnapshots.length,
    })

  } catch (error) {
    console.error('Error ensuring backfill:', error)
    return NextResponse.json(
      {
        error: 'Failed to check/trigger backfill',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

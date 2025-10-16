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

    const { companyRepository } = await import('@/lib/db/repositories/CompanyRepository')

    // Only capture snapshots for companies that have completed initial backfill
    const companies = await companyRepository.getCompaniesWithBackfill()

    if (companies.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No companies ready for daily snapshots',
        timestamp: new Date().toISOString(),
      })
    }

    // Capture today's snapshot for each company
    for (const company of companies) {
      await captureCompanySnapshot(company.companyId)
      await companyRepository.updateLastSync(company.companyId)
    }

    return NextResponse.json({
      success: true,
      message: 'Snapshots captured successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
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

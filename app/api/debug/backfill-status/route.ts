import { NextRequest, NextResponse } from 'next/server'
import { companyRepository } from '@/lib/db/repositories/CompanyRepository'
import { metricsRepository } from '@/lib/db/repositories/MetricsRepository'

/**
 * Check backfill status and data completeness for a company
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

    // Get company info
    const company = await companyRepository.findByWhopCompanyId(companyId)

    if (!company) {
      return NextResponse.json({
        error: 'Company not found',
        companyId,
      }, { status: 404 })
    }

    // Get all snapshots
    const snapshots = await metricsRepository.getRecentSnapshots(companyId, 365)

    // Count total payments across all snapshots
    let totalPaymentsStored = 0
    let snapshotsWithPayments = 0
    let oldestSnapshot: Date | null = null
    let newestSnapshot: Date | null = null

    for (const snapshot of snapshots) {
      const payments = snapshot.rawData?.transactions || []
      if (Array.isArray(payments) && payments.length > 0) {
        totalPaymentsStored += payments.length
        snapshotsWithPayments++
      }

      if (!oldestSnapshot || snapshot.date < oldestSnapshot) {
        oldestSnapshot = snapshot.date
      }
      if (!newestSnapshot || snapshot.date > newestSnapshot) {
        newestSnapshot = snapshot.date
      }
    }

    // Get the most recent snapshot to check payment count
    const latestSnapshot = snapshots[snapshots.length - 1]
    const latestPaymentCount = latestSnapshot?.rawData?.transactions?.length || 0

    return NextResponse.json({
      companyId,
      companyTitle: company.title,
      backfillCompleted: company.backfillCompleted || false,
      backfillCompletedAt: company.backfillCompletedAt || null,
      snapshots: {
        total: snapshots.length,
        oldestDate: oldestSnapshot?.toISOString().split('T')[0],
        newestDate: newestSnapshot?.toISOString().split('T')[0],
        snapshotsWithPayments,
      },
      payments: {
        latestSnapshotPaymentCount: latestPaymentCount,
        totalPaymentsStoredAcrossAllSnapshots: totalPaymentsStored,
        note: 'totalPaymentsStoredAcrossAllSnapshots counts payments in each daily snapshot (may have duplicates across days)',
      },
      latestSnapshotSample: latestSnapshot ? {
        date: latestSnapshot.date.toISOString().split('T')[0],
        mrr: latestSnapshot.mrr.total,
        arr: latestSnapshot.arr,
        activeSubscribers: latestSnapshot.activeUniqueSubscribers,
        membershipsCount: latestSnapshot.rawData?.memberships?.length || 0,
        paymentsCount: latestSnapshot.rawData?.transactions?.length || 0,
        plansCount: latestSnapshot.rawData?.plans?.length || 0,
      } : null,
    })

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to check backfill status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

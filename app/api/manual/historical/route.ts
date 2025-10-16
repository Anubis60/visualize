import { NextRequest, NextResponse } from 'next/server'
import { whopClient } from '@/lib/whop/client'
import { calculateMRR, calculateARR, calculateARPU } from '@/lib/analytics/mrr'
import { calculateSubscriberMetrics, getActiveUniqueSubscribers } from '@/lib/analytics/subscribers'
import { calculateTrialMetrics } from '@/lib/analytics/trials'
import { calculateCustomerLifetimeValue } from '@/lib/analytics/lifetime'
import { calculateCashFlow, calculatePaymentMetrics, calculateRefundMetrics } from '@/lib/analytics/transactions'
import { Membership, Plan } from '@/lib/types/analytics'
import { companyMetricsRepository } from '@/lib/db/repositories/CompanyMetricsRepository'
import { DailySnapshot } from '@/lib/db/models/CompanyMetrics'

/**
 * Manual Historical Backfill Endpoint
 * Fetches data from Whop API and generates 365 days of historical snapshots
 */
export async function POST(request: NextRequest) {

  try {
    const body = await request.json()
    const companyId = body.company_id

    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id is required' },
        { status: 400 }
      )
    }


    // Step 1: Fetch raw data from Whop API
    const allMemberships = await whopClient.getAllMemberships(companyId)

    const allPlans = await whopClient.getAllPlans(companyId)

    const payments = await whopClient.getAllPayments(companyId)

    // Step 2: Store raw data in MongoDB
    const sampleData = allMemberships[0] || {}
    const companyData = (sampleData as { company?: { title?: string; route?: string } }).company

    await companyMetricsRepository.storeRawData(companyId, {
      company: {
        id: companyId,
        title: companyData?.title || 'Company',
        logo: undefined,
        bannerImage: undefined,
      },
      memberships: allMemberships,
      plans: allPlans,
      transactions: payments,
    })

    // Step 3: Generate 365 days of historical snapshots

    const planMap = new Map<string, Plan>()
    allPlans.forEach((plan) => {
      planMap.set(plan.id, plan)
    })

    const enrichedMemberships: Membership[] = allMemberships.map(m => ({
      ...m,
      planData: m.plan ? planMap.get(m.plan.id) : undefined
    }))

    const now = new Date()
    const snapshots: DailySnapshot[] = []

    for (let daysAgo = 365; daysAgo >= 0; daysAgo--) {
      const snapshotDate = new Date(now)
      snapshotDate.setDate(now.getDate() - daysAgo)
      const dateString = snapshotDate.toISOString().split('T')[0]
      const snapshotTimestamp = snapshotDate.getTime() / 1000

      // Filter data for this specific date
      const membershipsOnDate = enrichedMemberships.filter(m => {
        const createdAt = m.createdAt || 0
        const canceledAt = m.canceledAt || Infinity
        const expiresAt = m.expiresAt || Infinity

        return createdAt <= snapshotTimestamp &&
               (canceledAt > snapshotTimestamp || canceledAt === null) &&
               (expiresAt > snapshotTimestamp || expiresAt === null)
      })

      const paymentsOnDate = payments.filter(p => {
        const paidAt = p.paid_at || p.created_at
        return paidAt && paidAt <= snapshotTimestamp
      })

      // Calculate metrics for this date
      const mrrData = calculateMRR(membershipsOnDate)
      const arr = calculateARR(mrrData.total)
      const subscriberMetrics = calculateSubscriberMetrics(membershipsOnDate)
      const activeUniqueSubscribers = getActiveUniqueSubscribers(membershipsOnDate)
      const arpu = calculateARPU(mrrData.total, activeUniqueSubscribers)
      const trialMetrics = calculateTrialMetrics(membershipsOnDate)
      const clvMetrics = calculateCustomerLifetimeValue(membershipsOnDate)
      const cashFlowMetrics = calculateCashFlow(paymentsOnDate)
      const paymentMetrics = calculatePaymentMetrics(paymentsOnDate)
      const refundMetrics = calculateRefundMetrics(paymentsOnDate)

      const totalRevenue = paymentsOnDate.reduce((sum, p) => p.status === 'paid' ? sum + p.total : sum, 0)
      const grossRevenue = totalRevenue
      const refundedAmount = refundMetrics.refundedAmount
      const processingFees = totalRevenue * 0.029 + (paymentMetrics.totalPayments * 0.30)
      const netRevenueTotal = grossRevenue - refundedAmount - processingFees

      snapshots.push({
        date: dateString,
        mrr: mrrData.total,
        arr,
        arpu,
        activeSubscribers: activeUniqueSubscribers,
        revenue: totalRevenue,
        netRevenue: netRevenueTotal,
        newMRR: 0,
        expansionMRR: 0,
        contractionMRR: 0,
        churnedMRR: 0,
        activeCustomers: activeUniqueSubscribers,
        newCustomers: 0,
        upgrades: 0,
        downgrades: 0,
        reactivations: 0,
        cancellations: subscriberMetrics.cancelled,
        trials: trialMetrics.totalTrials,
        clv: clvMetrics.averageCLV,
        cashFlow: cashFlowMetrics.netCashFlow,
        successfulPayments: paymentMetrics.successfulPayments,
        failedCharges: paymentMetrics.failedPayments,
        refunds: refundMetrics.totalRefunds,
        avgSalePrice: paymentMetrics.totalPayments > 0 ? totalRevenue / paymentMetrics.totalPayments : 0,
        revenueChurnRate: 0,
        customerChurnRate: subscriberMetrics.total > 0 ? (subscriberMetrics.cancelled / subscriberMetrics.total) * 100 : 0,
        quickRatio: 0,
      })

      // Log progress every 50 days
      if ((daysAgo % 50 === 0) || daysAgo === 0) {
      }
    }

    // Step 4: Store all snapshots in MongoDB
    await companyMetricsRepository.bulkUpsertSnapshots(companyId, snapshots)

    // Step 5: Mark backfill as completed
    await companyMetricsRepository.markBackfillCompleted(companyId)


    return NextResponse.json({
      success: true,
      message: 'Historical backfill completed',
      stats: {
        memberships: allMemberships.length,
        payments: payments.length,
        plans: allPlans.length,
        snapshotsGenerated: snapshots.length,
        dateRange: {
          start: snapshots[0].date,
          end: snapshots[snapshots.length - 1].date
        }
      }
    })

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to complete historical backfill',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

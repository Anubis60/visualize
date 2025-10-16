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
 * Manual Daily Snapshot Endpoint
 * Fetches current data from Whop API and updates today's snapshot
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


    const today = new Date().toISOString().split('T')[0]

    // Step 1: Fetch current data from Whop API
    const allMemberships = await whopClient.getAllMemberships(companyId)

    const allPlans = await whopClient.getAllPlans(companyId)

    const payments = await whopClient.getAllPayments(companyId)

    // Step 2: Update raw data in MongoDB
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

    // Step 3: Calculate today's metrics

    const planMap = new Map<string, Plan>()
    allPlans.forEach((plan) => {
      planMap.set(plan.id, plan)
    })

    const enrichedMemberships: Membership[] = allMemberships.map(m => ({
      ...m,
      planData: m.plan ? planMap.get(m.plan.id) : undefined
    }))

    const mrrData = calculateMRR(enrichedMemberships)
    const arr = calculateARR(mrrData.total)
    const subscriberMetrics = calculateSubscriberMetrics(enrichedMemberships)
    const activeUniqueSubscribers = getActiveUniqueSubscribers(enrichedMemberships)
    const arpu = calculateARPU(mrrData.total, activeUniqueSubscribers)
    const trialMetrics = calculateTrialMetrics(enrichedMemberships)
    const clvMetrics = calculateCustomerLifetimeValue(enrichedMemberships)
    const cashFlowMetrics = calculateCashFlow(payments)
    const paymentMetrics = calculatePaymentMetrics(payments)
    const refundMetrics = calculateRefundMetrics(payments)


    const totalRevenue = payments.reduce((sum, p) => p.status === 'paid' ? sum + p.total : sum, 0)
    const grossRevenue = totalRevenue
    const refundedAmount = refundMetrics.refundedAmount
    const processingFees = totalRevenue * 0.029 + (paymentMetrics.totalPayments * 0.30)
    const netRevenueTotal = grossRevenue - refundedAmount - processingFees

    const todaySnapshot: DailySnapshot = {
      date: today,
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
    }

    // Step 4: Store today's snapshot
    await companyMetricsRepository.upsertDailySnapshot(companyId, todaySnapshot)


    return NextResponse.json({
      success: true,
      message: 'Daily snapshot completed',
      snapshot: todaySnapshot,
      stats: {
        memberships: allMemberships.length,
        payments: payments.length,
        plans: allPlans.length,
      }
    })

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to complete daily snapshot',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

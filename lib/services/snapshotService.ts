import { getAllMemberships, getAllPayments, getAllPlans } from '@/lib/whop/helpers'
import { calculateMRR, calculateARR, calculateARPU } from '@/lib/analytics/mrr'
import { calculateSubscriberMetrics, getActiveUniqueSubscribers } from '@/lib/analytics/subscribers'
import { calculateTrialMetrics } from '@/lib/analytics/trials'
import { calculateCustomerLifetimeValue } from '@/lib/analytics/lifetime'
import { calculateCashFlow, calculatePaymentMetrics, calculateRefundMetrics } from '@/lib/analytics/transactions'
import {
  calculateExpansionMRR,
  calculateContractionMRR,
  calculateChurnedMRR,
  calculateNewMRR,
  calculateReactivationMRR
} from '@/lib/analytics/movements'
import { Membership, Plan } from '@/lib/types/analytics'
import { metricsRepository } from '@/lib/db/repositories/MetricsRepository'

/**
 * Captures a complete data snapshot for a company
 * Includes company info, memberships, plans, transactions, and calculated metrics
 */
export async function captureCompanySnapshot(companyId: string): Promise<void> {
  try {
    // 1. Fetch ALL memberships using SDK helpers
    const allMemberships = await getAllMemberships(companyId)

    // 2. Fetch ALL plans using SDK helpers
    const allPlans = await getAllPlans(companyId)

    // 3. Update company record in database
    const { companyRepository } = await import('@/lib/db/repositories/CompanyRepository')
    const sampleData = allMemberships[0] || {}
    const companyData = (sampleData as { company?: { title?: string; route?: string } }).company
    await companyRepository.registerCompany({
      id: companyId,
      title: companyData?.title || 'Company',
      route: companyData?.route || companyId,
      logo: undefined,
      bannerImage: undefined,
      industryType: undefined,
      businessType: undefined,
      rawData: companyData || {},
    })

    // 4. Fetch ALL payments using SDK helpers
    const payments = await getAllPayments(companyId)

    // 5. Enrich memberships with plan data
    const planMap = new Map<string, Plan>()
    allPlans.forEach((plan) => {
      planMap.set(plan.id, plan)
    })

    const enrichedMemberships: Membership[] = allMemberships.map(m => ({
      ...m,
      planData: m.plan ? planMap.get(m.plan.id) : undefined
    }))

    // 6. Calculate all metrics
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

    // 7. Fetch previous snapshot for MRR movement calculations
    const previousSnapshot = await metricsRepository.getPreviousSnapshot(companyId)

    // 8. Calculate MRR movements using snapshot comparison
    const expansionMRR = calculateExpansionMRR(previousSnapshot, allMemberships, allPlans)
    const contractionMRR = calculateContractionMRR(previousSnapshot, allMemberships, allPlans)
    const churnedMRR = calculateChurnedMRR(previousSnapshot, allMemberships)
    const newMRR = calculateNewMRR(allMemberships, allPlans)
    const reactivationMRR = calculateReactivationMRR(previousSnapshot, allMemberships, allPlans)

    // 9. Calculate advanced metrics
    const previousMRR = previousSnapshot?.mrr.total || 0

    // Revenue Churn Rate = (Churned MRR + Contraction MRR) / Previous MRR
    const revenueChurnRate = previousMRR > 0
      ? ((churnedMRR.total + contractionMRR.total) / previousMRR) * 100
      : 0

    // Quick Ratio = (New MRR + Expansion MRR) / (Churned MRR + Contraction MRR)
    const quickRatioDenominator = churnedMRR.total + contractionMRR.total
    const quickRatioValue = quickRatioDenominator > 0
      ? (newMRR.total + expansionMRR.total) / quickRatioDenominator
      : 0

    // 10. MRR Balance Equation Validation
    // End MRR = Start MRR + New + Expansion + Reactivation - Contraction - Churned
    if (previousSnapshot) {
      const startMRR = previousSnapshot.mrr.total
      const endMRR = mrrData.total
      const calculatedEndMRR = startMRR + newMRR.total + expansionMRR.total + reactivationMRR.revenue - contractionMRR.total - churnedMRR.total
      const difference = Math.abs(endMRR - calculatedEndMRR)

      console.log('[Snapshot] MRR Balance Equation:')
      console.log(`  Start MRR: $${startMRR.toFixed(2)}`)
      console.log(`  + New MRR: $${newMRR.total.toFixed(2)}`)
      console.log(`  + Expansion MRR: $${expansionMRR.total.toFixed(2)}`)
      console.log(`  + Reactivation MRR: $${reactivationMRR.revenue.toFixed(2)}`)
      console.log(`  - Contraction MRR: $${contractionMRR.total.toFixed(2)}`)
      console.log(`  - Churned MRR: $${churnedMRR.total.toFixed(2)}`)
      console.log(`  = Calculated End MRR: $${calculatedEndMRR.toFixed(2)}`)
      console.log(`  Actual End MRR: $${endMRR.toFixed(2)}`)
      console.log(`  Difference: $${difference.toFixed(2)} ${difference > 1 ? '⚠️' : '✓'}`)
    }

    // 11. Calculate revenue metrics
    const totalRevenue = payments.reduce((sum, p) => p.status === 'paid' ? sum + p.total : sum, 0)
    const recurringRevenue = mrrData.total * 30 // Approximate monthly recurring
    const nonRecurringRevenue = totalRevenue - recurringRevenue

    const grossRevenue = totalRevenue
    const refundedAmount = refundMetrics.refundedAmount
    const processingFees = totalRevenue * 0.029 + (paymentMetrics.totalPayments * 0.30) // Estimate 2.9% + $0.30 per transaction
    const netRevenueTotal = grossRevenue - refundedAmount - processingFees

    const activeCustomersCount = activeUniqueSubscribers

    // 7. Store comprehensive snapshot in MongoDB with precise timestamp
    await metricsRepository.insertSnapshot(companyId, {
      mrr: {
        total: mrrData.total,
        breakdown: mrrData.breakdown,
      },
      arr,
      arpu,
      subscribers: subscriberMetrics,
      activeUniqueSubscribers,
      revenue: {
        total: totalRevenue,
        recurring: recurringRevenue,
        nonRecurring: nonRecurringRevenue,
        growth: 0, // Calculate from previous snapshot
      },
      netRevenue: {
        total: netRevenueTotal,
        afterRefunds: grossRevenue - refundedAmount,
        afterFees: grossRevenue - processingFees,
        margin: (netRevenueTotal / grossRevenue) * 100,
        gross: grossRevenue,
        refunds: refundedAmount,
        fees: processingFees,
      },
      newMRR: {
        total: newMRR.total,
        customers: newMRR.customers,
        growth: newMRR.growth,
      },
      expansionMRR: {
        total: expansionMRR.total,
        rate: expansionMRR.rate,
        customers: expansionMRR.customers,
      },
      contractionMRR: {
        total: contractionMRR.total,
        rate: contractionMRR.rate,
        customers: contractionMRR.customers,
      },
      churnedMRR: {
        total: churnedMRR.total,
        rate: churnedMRR.rate,
        customers: churnedMRR.customers,
      },
      activeCustomers: {
        total: activeCustomersCount,
        new: newMRR.customers,
        returning: activeCustomersCount - newMRR.customers,
        growth: 0,
      },
      newCustomers: {
        total: newMRR.customers,
        growth: 0,
      },
      upgrades: {
        total: expansionMRR.customers,
        revenue: expansionMRR.total,
        customers: expansionMRR.customers,
      },
      downgrades: {
        total: contractionMRR.customers,
        lostRevenue: contractionMRR.total,
        customers: contractionMRR.customers,
      },
      reactivations: {
        total: reactivationMRR.total,
        revenue: reactivationMRR.revenue,
      },
      cancellations: {
        total: subscriberMetrics.cancelled,
        rate: (subscriberMetrics.cancelled / subscriberMetrics.total) * 100,
      },
      trials: {
        total: trialMetrics.totalTrials,
        active: trialMetrics.activeTrials,
        converted: trialMetrics.convertedTrials,
        conversionRate: trialMetrics.conversionRate,
      },
      clv: {
        average: clvMetrics.averageCLV,
        median: clvMetrics.medianCLV,
        total: clvMetrics.totalCustomers,
      },
      cashFlow: {
        gross: cashFlowMetrics.grossCashFlow,
        net: cashFlowMetrics.netCashFlow,
        recurring: cashFlowMetrics.recurringCashFlow,
        nonRecurring: cashFlowMetrics.nonRecurringCashFlow,
      },
      payments: {
        successful: paymentMetrics.successfulPayments,
        failed: paymentMetrics.failedPayments,
        total: paymentMetrics.totalPayments,
        successRate: paymentMetrics.successRate,
      },
      failedCharges: {
        total: paymentMetrics.failedPayments,
        amount: payments.filter(p => p.status === 'failed').reduce((sum, p) => sum + p.total, 0),
        rate: (paymentMetrics.failedPayments / paymentMetrics.totalPayments) * 100,
      },
      refunds: {
        total: refundMetrics.totalRefunds,
        amount: refundMetrics.refundedAmount,
        rate: refundMetrics.refundRate,
      },
      avgSalePrice: {
        value: totalRevenue / paymentMetrics.totalPayments || 0,
        growth: 0,
      },
      revenueChurnRate: {
        rate: revenueChurnRate,
        amount: churnedMRR.total + contractionMRR.total,
      },
      customerChurnRate: {
        rate: (subscriberMetrics.cancelled / subscriberMetrics.total) * 100,
        count: subscriberMetrics.cancelled,
      },
      quickRatio: {
        value: quickRatioValue,
        newMRR: newMRR.total,
        expansionMRR: expansionMRR.total,
        churnedMRR: churnedMRR.total,
        contractionMRR: contractionMRR.total,
      },
      metadata: {
        totalMemberships: allMemberships.length,
        activeMemberships: enrichedMemberships.filter(m => {
          const now = Date.now() / 1000
          return (m.status === 'active' || m.status === 'completed') &&
                 m.canceledAt === null &&
                 (!m.expiresAt || m.expiresAt > now)
        }).length,
        plansCount: allPlans.length,
      },
      rawData: {
        company: {
          id: companyId,
          title: companyData?.title || 'Company',
          logo: undefined,
          bannerImage: undefined,
        },
        memberships: allMemberships,
        plans: allPlans,
        transactions: payments,
      }
    })

  } catch (error) {
    throw error
  }
}

/**
 * Captures snapshots for all registered companies in the database
 */
export async function captureAllSnapshots(): Promise<void> {
  try {
    // Import company repository
    const { companyRepository } = await import('@/lib/db/repositories/CompanyRepository')

    // Get all registered companies from database
    const companies = await companyRepository.getAllCompanies()

    if (companies.length === 0) {
      return
    }

    for (const company of companies) {
      await captureCompanySnapshot(company.companyId)
      // Legacy: lastSyncAt no longer tracked
    }

  } catch (error) {
    throw error
  }
}

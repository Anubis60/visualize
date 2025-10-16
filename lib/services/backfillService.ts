import { whopClient } from '@/lib/whop/client'
import { calculateMRR, calculateARR, calculateARPU } from '@/lib/analytics/mrr'
import { calculateSubscriberMetrics, getActiveUniqueSubscribers } from '@/lib/analytics/subscribers'
import { calculateTrialMetrics } from '@/lib/analytics/trials'
import { calculateCustomerLifetimeValue } from '@/lib/analytics/lifetime'
import { calculateCashFlow, calculatePaymentMetrics, calculateRefundMetrics } from '@/lib/analytics/transactions'
import { Membership, Plan } from '@/lib/types/analytics'
import { metricsRepository } from '@/lib/db/repositories/MetricsRepository'
import { companyRepository } from '@/lib/db/repositories/CompanyRepository'

/**
 * Backfills 365 days of historical snapshots for a company
 * This should only be run ONCE when a company first registers
 */
export async function backfillCompanyHistory(companyId: string): Promise<void> {
  try {
    // 1. Fetch ALL memberships using whopClient
    const allMemberships = await whopClient.getAllMemberships(companyId)

    // 2. Fetch ALL plans using whopClient
    const allPlans = await whopClient.getAllPlans(companyId)

    // 3. Register company in database
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

    // 4. Fetch ALL payments using whopClient
    const payments = await whopClient.getAllPayments(companyId)

    // 5. Enrich memberships with plan data
    const planMap = new Map<string, Plan>()
    allPlans.forEach((plan) => {
      planMap.set(plan.id, plan)
    })

    const enrichedMemberships: Membership[] = allMemberships.map(m => ({
      ...m,
      planData: m.plan ? planMap.get(m.plan.id) : undefined
    }))

    // 6. Generate snapshots for the past 365 days
    const now = new Date()
    const snapshotsGenerated = []

    for (let daysAgo = 365; daysAgo >= 0; daysAgo--) {
      const snapshotDate = new Date(now)
      snapshotDate.setDate(now.getDate() - daysAgo)
      snapshotDate.setHours(5, 0, 0, 0) // Set to 5 AM like the cron job

      const snapshotTimestamp = snapshotDate.getTime() / 1000

      // Filter memberships that existed on this date
      const membershipsOnDate = enrichedMemberships.filter(m => {
        const createdAt = m.createdAt || 0
        const canceledAt = m.canceledAt || Infinity
        const expiresAt = m.expiresAt || Infinity

        return createdAt <= snapshotTimestamp &&
               (canceledAt > snapshotTimestamp || canceledAt === null) &&
               (expiresAt > snapshotTimestamp || expiresAt === null)
      })

      // Filter payments that occurred before or on this date
      const paymentsOnDate = payments.filter(p => {
        const paidAt = p.paid_at || p.created_at
        return paidAt && paidAt <= snapshotTimestamp
      })

      // Calculate all metrics for this date
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

      // Calculate revenue metrics
      const totalRevenue = paymentsOnDate.reduce((sum, p) => p.status === 'paid' ? sum + p.total : sum, 0)
      const recurringRevenue = mrrData.total * 30
      const nonRecurringRevenue = totalRevenue - recurringRevenue

      // Calculate net revenue
      const grossRevenue = totalRevenue
      const refundedAmount = refundMetrics.refundedAmount
      const processingFees = totalRevenue * 0.029 + (paymentMetrics.totalPayments * 0.30)
      const netRevenueTotal = grossRevenue - refundedAmount - processingFees

      // Calculate customer metrics
      const activeCustomersCount = activeUniqueSubscribers
      const thirtyDaysBeforeSnapshot = snapshotTimestamp - (30 * 24 * 60 * 60)
      const newCustomersCount = membershipsOnDate.filter(m => {
        const createdAt = m.createdAt || 0
        return createdAt > thirtyDaysBeforeSnapshot && m.status === 'active'
      }).length

      // Store snapshot with the specific date
      await metricsRepository.upsertDailySnapshot(companyId, {
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
          growth: 0,
        },
        netRevenue: {
          total: netRevenueTotal,
          afterRefunds: grossRevenue - refundedAmount,
          afterFees: grossRevenue - processingFees,
          margin: grossRevenue > 0 ? (netRevenueTotal / grossRevenue) * 100 : 0,
          gross: grossRevenue,
          refunds: refundedAmount,
          fees: processingFees,
        },
        newMRR: {
          total: mrrData.total * 0.1,
          customers: newCustomersCount,
          growth: 0,
        },
        expansionMRR: {
          total: 0,
          rate: 0,
          customers: 0,
        },
        contractionMRR: {
          total: 0,
          rate: 0,
          customers: 0,
        },
        churnedMRR: {
          total: 0,
          rate: 0,
          customers: subscriberMetrics.cancelled,
        },
        activeCustomers: {
          total: activeCustomersCount,
          new: newCustomersCount,
          returning: activeCustomersCount - newCustomersCount,
          growth: 0,
        },
        newCustomers: {
          total: newCustomersCount,
          growth: 0,
        },
        upgrades: {
          total: 0,
          revenue: 0,
          customers: 0,
        },
        downgrades: {
          total: 0,
          lostRevenue: 0,
          customers: 0,
        },
        reactivations: {
          total: 0,
          revenue: 0,
        },
        cancellations: {
          total: subscriberMetrics.cancelled,
          rate: subscriberMetrics.total > 0 ? (subscriberMetrics.cancelled / subscriberMetrics.total) * 100 : 0,
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
          amount: paymentsOnDate.filter(p => p.status === 'failed').reduce((sum, p) => sum + p.total, 0),
          rate: paymentMetrics.totalPayments > 0 ? (paymentMetrics.failedPayments / paymentMetrics.totalPayments) * 100 : 0,
        },
        refunds: {
          total: refundMetrics.totalRefunds,
          amount: refundMetrics.refundedAmount,
          rate: refundMetrics.refundRate,
        },
        avgSalePrice: {
          value: paymentMetrics.totalPayments > 0 ? totalRevenue / paymentMetrics.totalPayments : 0,
          growth: 0,
        },
        revenueChurnRate: {
          rate: 0,
          amount: 0,
        },
        customerChurnRate: {
          rate: subscriberMetrics.total > 0 ? (subscriberMetrics.cancelled / subscriberMetrics.total) * 100 : 0,
          count: subscriberMetrics.cancelled,
        },
        quickRatio: {
          value: 0,
          newMRR: 0,
          expansionMRR: 0,
          churnedMRR: 0,
          contractionMRR: 0,
        },
        metadata: {
          totalMemberships: allMemberships.length,
          activeMemberships: membershipsOnDate.length,
          plansCount: allPlans.length,
        },
        rawData: {
          company: {
            id: companyId,
            title: companyData?.title || 'Company',
            logo: undefined,
            bannerImage: undefined,
          },
          memberships: membershipsOnDate,
          plans: allPlans,
          transactions: paymentsOnDate,
        }
      }, snapshotDate)

      snapshotsGenerated.push(snapshotDate.toISOString().split('T')[0])
    }

    // Mark backfill as completed
    await companyRepository.markBackfillCompleted(companyId)

  } catch (error) {
    throw error
  }
}

/**
 * Run backfill for all companies that need it
 */
export async function backfillAllCompaniesNeedingHistory(): Promise<void> {
  try {
    const companies = await companyRepository.getCompaniesNeedingBackfill()

    if (companies.length === 0) {
      return
    }

    for (const company of companies) {
      await backfillCompanyHistory(company.companyId)
    }

  } catch (error) {
    throw error
  }
}

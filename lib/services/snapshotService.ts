import { whopClient } from '@/lib/whop/client'
import { calculateMRR, calculateARR, calculateARPU } from '@/lib/analytics/mrr'
import { calculateSubscriberMetrics, getActiveUniqueSubscribers } from '@/lib/analytics/subscribers'
import { calculateTrialMetrics } from '@/lib/analytics/trials'
import { calculateCustomerLifetimeValue } from '@/lib/analytics/lifetime'
import { calculateCashFlow, calculatePaymentMetrics, calculateRefundMetrics } from '@/lib/analytics/transactions'
import { Membership, Plan } from '@/lib/types/analytics'
import { metricsRepository } from '@/lib/db/repositories/MetricsRepository'

/**
 * Captures a complete data snapshot for a company
 * Includes company info, memberships, plans, transactions, and calculated metrics
 */
export async function captureCompanySnapshot(companyId: string): Promise<void> {
  try {
    // 1. Fetch ALL memberships using whopClient
    const allMemberships = await whopClient.getAllMemberships(companyId)

    // 2. Fetch ALL plans using whopClient
    const allPlans = await whopClient.getAllPlans(companyId)

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

    // Calculate MRR movements (simplified - you may want more sophisticated logic)
    const totalRevenue = payments.reduce((sum, p) => p.status === 'paid' ? sum + p.total : sum, 0)
    const recurringRevenue = mrrData.total * 30 // Approximate monthly recurring
    const nonRecurringRevenue = totalRevenue - recurringRevenue

    // Calculate net revenue
    const grossRevenue = totalRevenue
    const refundedAmount = refundMetrics.refundedAmount
    const processingFees = totalRevenue * 0.029 + (paymentMetrics.totalPayments * 0.30) // Estimate 2.9% + $0.30 per transaction
    const netRevenueTotal = grossRevenue - refundedAmount - processingFees

    // Calculate active customers
    const activeCustomersCount = activeUniqueSubscribers
    const newCustomersCount = enrichedMemberships.filter(m => {
      const createdAt = m.createdAt || 0
      const thirtyDaysAgo = (Date.now() / 1000) - (30 * 24 * 60 * 60)
      return createdAt > thirtyDaysAgo && m.status === 'active'
    }).length

    // 7. Store comprehensive snapshot in MongoDB
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
        total: mrrData.total * 0.1, // Placeholder - implement proper calculation
        customers: newCustomersCount,
        growth: 0,
      },
      expansionMRR: {
        total: 0, // Implement expansion tracking
        rate: 0,
        customers: 0,
      },
      contractionMRR: {
        total: 0, // Implement contraction tracking
        rate: 0,
        customers: 0,
      },
      churnedMRR: {
        total: 0, // Implement churn tracking
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
        total: 0, // Implement upgrade tracking
        revenue: 0,
        customers: 0,
      },
      downgrades: {
        total: 0, // Implement downgrade tracking
        lostRevenue: 0,
        customers: 0,
      },
      reactivations: {
        total: 0, // Implement reactivation tracking
        revenue: 0,
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
        rate: 0, // Calculate from MRR movements
        amount: 0,
      },
      customerChurnRate: {
        rate: (subscriberMetrics.cancelled / subscriberMetrics.total) * 100,
        count: subscriberMetrics.cancelled,
      },
      quickRatio: {
        value: 0, // (New MRR + Expansion MRR) / (Churned MRR + Contraction MRR)
        newMRR: 0,
        expansionMRR: 0,
        churnedMRR: 0,
        contractionMRR: 0,
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
      await companyRepository.updateLastSync(company.companyId)
    }

  } catch (error) {
    throw error
  }
}

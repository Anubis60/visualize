import { whopSdk } from '@/lib/whop/sdk'
import { calculateMRR, calculateARR, calculateARPU } from '@/lib/analytics/mrr'
import { calculateSubscriberMetrics, getActiveUniqueSubscribers } from '@/lib/analytics/subscribers'
import { calculateTrialMetrics } from '@/lib/analytics/trials'
import { calculateCustomerLifetimeValue } from '@/lib/analytics/lifetime'
import { calculateCashFlow, calculatePaymentMetrics, calculateRefundMetrics, Payment } from '@/lib/analytics/transactions'
import { Membership, Plan } from '@/lib/types/analytics'
import { metricsRepository } from '@/lib/db/repositories/MetricsRepository'
import { companyRepository } from '@/lib/db/repositories/CompanyRepository'

/**
 * Backfills 365 days of historical snapshots for a company
 * This should only be run ONCE when a company first registers
 */
export async function backfillCompanyHistory(companyId: string): Promise<void> {
  console.log(`Starting 365-day historical backfill for company ${companyId}`)

  try {
    // 1. Fetch company data
    console.log('  Fetching company data...')
    const company = await whopSdk.withCompany(companyId).companies.getCompany({
      companyId,
    })

    // Update company record in database with latest data
    await companyRepository.registerCompany({
      id: company.id,
      title: company.title,
      route: company.route || companyId,
      logo: company.logo,
      bannerImage: company.bannerImage,
      industryType: company.industryType || undefined,
      businessType: company.businessType || undefined,
      rawData: company,
    })
    console.log('  Company data updated in database')

    // 2. Fetch ALL memberships using pagination
    console.log('  Fetching memberships...')
    let allMemberships: Membership[] = []
    let hasNextPage = true
    let cursor: string | undefined = undefined

    while (hasNextPage) {
      const response = await whopSdk.withCompany(companyId).companies.listMemberships({
        companyId,
        first: 50,
        after: cursor,
      })

      const nodes = (response?.memberships?.nodes || []) as unknown as Membership[]
      allMemberships = [...allMemberships, ...nodes]

      hasNextPage = response?.memberships?.pageInfo?.hasNextPage || false
      cursor = response?.memberships?.pageInfo?.endCursor ?? undefined

      if (!hasNextPage) break
    }

    // 3. Fetch ALL plans using pagination
    console.log('  Fetching plans...')
    let allPlans: Plan[] = []
    let hasNextPlanPage = true
    let planCursor: string | undefined = undefined

    while (hasNextPlanPage) {
      const plansResponse = await whopSdk.withCompany(companyId).companies.listPlans({
        companyId,
        first: 50,
        after: planCursor,
      })

      const planNodes = (plansResponse?.plans?.nodes || []) as Plan[]
      allPlans = [...allPlans, ...planNodes]

      hasNextPlanPage = plansResponse?.plans?.pageInfo?.hasNextPage || false
      planCursor = plansResponse?.plans?.pageInfo?.endCursor ?? undefined

      if (!hasNextPlanPage) break
    }

    // 4. Fetch ALL payments using cursor-based pagination
    console.log('  Fetching payments...')
    let allPayments: Payment[] = []
    let hasMorePayments = true
    let paymentCursor: string | undefined = undefined

    while (hasMorePayments) {
      const paymentsUrl = new URL("https://api.whop.com/api/v1/payments")
      paymentsUrl.searchParams.set("company_id", companyId)
      paymentsUrl.searchParams.set("first", "100") // Fetch 100 at a time
      if (paymentCursor) {
        paymentsUrl.searchParams.set("after", paymentCursor)
      }

      const paymentsResponse = await fetch(paymentsUrl, {
        headers: {
          Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
        },
      })

      const paymentsData = await paymentsResponse.json()
      const payments = (paymentsData.data || []) as Payment[]

      if (payments.length === 0) {
        hasMorePayments = false
      } else {
        allPayments = [...allPayments, ...payments]
        console.log(`    Fetched ${payments.length} payments (total so far: ${allPayments.length})`)

        // Check if there's a next page using page_info
        const pageInfo = paymentsData.page_info
        if (pageInfo && pageInfo.has_next_page && pageInfo.end_cursor) {
          paymentCursor = pageInfo.end_cursor
        } else {
          hasMorePayments = false
        }
      }
    }

    const payments = allPayments
    console.log(`  Total payments fetched: ${payments.length}`)

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
    console.log('  Generating 365 daily snapshots...')
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
            id: company.id,
            title: company.title,
            logo: typeof company.logo === 'string' ? company.logo : undefined,
            bannerImage: typeof company.bannerImage === 'string' ? company.bannerImage : undefined,
          },
          memberships: membershipsOnDate,
          plans: allPlans,
          transactions: paymentsOnDate,
        }
      }, snapshotDate)

      snapshotsGenerated.push(snapshotDate.toISOString().split('T')[0])

      // Log progress every 30 days
      if (daysAgo % 30 === 0) {
        console.log(`    Progress: ${365 - daysAgo}/365 snapshots generated`)
      }
    }

    // Mark backfill as completed
    await companyRepository.markBackfillCompleted(companyId)

    console.log(`Backfill completed successfully for ${companyId}`)
    console.log(`  - Total snapshots generated: ${snapshotsGenerated.length}`)
    console.log(`  - Date range: ${snapshotsGenerated[0]} to ${snapshotsGenerated[snapshotsGenerated.length - 1]}`)
    console.log(`  - Memberships: ${allMemberships.length}`)
    console.log(`  - Payments: ${payments.length}`)

  } catch (error) {
    console.error(`Failed to backfill history for ${companyId}:`, error)
    throw error
  }
}

/**
 * Run backfill for all companies that need it
 */
export async function backfillAllCompaniesNeedingHistory(): Promise<void> {
  console.log('Starting backfill for companies that need historical data...')

  try {
    const companies = await companyRepository.getCompaniesNeedingBackfill()

    if (companies.length === 0) {
      console.log('No companies need backfill')
      return
    }

    console.log(`Found ${companies.length} compan${companies.length === 1 ? 'y' : 'ies'} needing backfill`)

    for (const company of companies) {
      console.log(`\nProcessing company: ${company.companyId}`)
      await backfillCompanyHistory(company.companyId)
    }

    console.log('\nAll companies backfilled successfully')
  } catch (error) {
    console.error('Failed to backfill companies:', error)
    throw error
  }
}

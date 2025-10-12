import { whopSdk } from '@/lib/whop/sdk'
import { calculateMRR, calculateARR, calculateARPU } from '@/lib/analytics/mrr'
import { calculateSubscriberMetrics, getActiveUniqueSubscribers } from '@/lib/analytics/subscribers'
import { Membership, Plan } from '@/lib/types/analytics'
import { metricsRepository } from '@/lib/db/repositories/MetricsRepository'

/**
 * Captures a complete data snapshot for a company
 * Includes company info, memberships, plans, transactions, and calculated metrics
 */
export async function captureCompanySnapshot(companyId: string): Promise<void> {
  console.log(`📸 Starting snapshot capture for company ${companyId}`)

  try {
    // 1. Fetch company data
    console.log('  Fetching company data...')
    const company = await whopSdk.withCompany(companyId).companies.getCompany({
      companyId,
    })

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

    // 4. Fetch transactions/payments
    console.log('  Fetching transactions...')
    const transactionsUrl = new URL("https://api.whop.com/api/v1/payments")
    transactionsUrl.searchParams.set("company_id", companyId)

    const transactionsResponse = await fetch(transactionsUrl, {
      headers: {
        Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
      },
    })

    const transactionsData = await transactionsResponse.json()
    const transactions = transactionsData.data || []

    // 5. Enrich memberships with plan data
    const planMap = new Map<string, Plan>()
    allPlans.forEach((plan) => {
      planMap.set(plan.id, plan)
    })

    const enrichedMemberships: Membership[] = allMemberships.map(m => ({
      ...m,
      planData: m.plan ? planMap.get(m.plan.id) : undefined
    }))

    // 6. Calculate metrics
    console.log('  Calculating metrics...')
    const mrrData = calculateMRR(enrichedMemberships)
    const arr = calculateARR(mrrData.total)
    const subscriberMetrics = calculateSubscriberMetrics(enrichedMemberships)
    const activeUniqueSubscribers = getActiveUniqueSubscribers(enrichedMemberships)
    const arpu = calculateARPU(mrrData.total, activeUniqueSubscribers)

    // 7. Store snapshot in MongoDB
    console.log('  Storing snapshot...')
    await metricsRepository.upsertDailySnapshot(companyId, {
      mrr: {
        total: mrrData.total,
        breakdown: mrrData.breakdown,
      },
      arr,
      arpu,
      subscribers: subscriberMetrics,
      activeUniqueSubscribers,
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
          id: company.id,
          title: company.title,
          logo: typeof company.logo === 'string' ? company.logo : undefined,
          bannerImage: typeof company.bannerImage === 'string' ? company.bannerImage : undefined,
        },
        memberships: allMemberships,
        plans: allPlans,
        transactions,
      }
    })

    console.log(`✅ Snapshot captured successfully for ${companyId}`)
    console.log(`  - Memberships: ${allMemberships.length}`)
    console.log(`  - Plans: ${allPlans.length}`)
    console.log(`  - Transactions: ${transactions.length}`)
    console.log(`  - MRR: $${mrrData.total.toFixed(2)}`)
    console.log(`  - ARR: $${arr.toFixed(2)}`)

  } catch (error) {
    console.error(`❌ Failed to capture snapshot for ${companyId}:`, error)
    throw error
  }
}

/**
 * Captures snapshots for all registered companies in the database
 */
export async function captureAllSnapshots(): Promise<void> {
  console.log('📸 Starting snapshot capture for all registered companies...')

  try {
    // Import company repository
    const { companyRepository } = await import('@/lib/db/repositories/CompanyRepository')

    // Get all registered companies from database
    const companies = await companyRepository.getAllCompanies()

    if (companies.length === 0) {
      console.log('⚠️  No companies registered yet. Companies will be registered when users first visit their dashboard.')
      return
    }

    console.log(`Found ${companies.length} registered compan${companies.length === 1 ? 'y' : 'ies'}`)

    for (const company of companies) {
      await captureCompanySnapshot(company.whopCompanyId)
      await companyRepository.updateLastSync(company.whopCompanyId)
    }

    console.log('✅ All snapshots captured successfully')
  } catch (error) {
    console.error('❌ Failed to capture snapshots:', error)
    throw error
  }
}

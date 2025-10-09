import { NextRequest, NextResponse } from 'next/server'
import { whopSdk } from '@/lib/whop/sdk'
import { calculateMRR, calculateARR, calculateARPU } from '@/lib/analytics/mrr'
import { calculateSubscriberMetrics, getActiveUniqueSubscribers } from '@/lib/analytics/subscribers'
import { Membership, Plan } from '@/lib/types/analytics'
import { metricsRepository } from '@/lib/db/repositories/MetricsRepository'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('company_id') || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    // Fetch ALL memberships using Whop SDK with pagination
    let allMemberships: Membership[] = []
    let hasNextPage = true
    let cursor: string | undefined = undefined

    while (hasNextPage) {
      const response = await whopSdk.withCompany(companyId).companies.listMemberships({
        companyId,
        first: 50, // Fetch 50 at a time to avoid complexity issues
        after: cursor,
      })

      const nodes = (response?.memberships?.nodes || []) as unknown as Membership[]
      allMemberships = [...allMemberships, ...nodes]

      hasNextPage = response?.memberships?.pageInfo?.hasNextPage || false
      cursor = response?.memberships?.pageInfo?.endCursor ?? undefined

      if (!hasNextPage) break
    }

    const memberships = allMemberships

    // Fetch ALL plans using Whop SDK with pagination
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

    // Create a map of planId -> planData for quick lookup
    const planMap = new Map<string, Plan>()
    allPlans.forEach((plan) => {
      planMap.set(plan.id, plan)
    })

    // Enrich memberships with plan data
    const enrichedMemberships: Membership[] = memberships.map(m => ({
      ...m,
      planData: m.plan ? planMap.get(m.plan.id) : undefined
    }))

    console.log(`\n📊 Analytics API Summary:`)
    console.log(`  Total memberships fetched: ${memberships.length}`)
    console.log(`  Total plans fetched: ${allPlans.length}`)
    console.log(`  Memberships with plan data: ${enrichedMemberships.filter(m => m.planData).length}`)

    // Debug: Show raw sample data
    console.log('\n🔍 Sample Membership (raw):')
    console.log(JSON.stringify(memberships[0], null, 2))
    console.log('\n🔍 Sample Plan (raw):')
    console.log(JSON.stringify(allPlans[0], null, 2))

    // Calculate metrics with enriched data
    const mrrData = calculateMRR(enrichedMemberships)
    const arr = calculateARR(mrrData.total)
    const subscriberMetrics = calculateSubscriberMetrics(enrichedMemberships)
    const activeUniqueSubscribers = getActiveUniqueSubscribers(enrichedMemberships)
    const arpu = calculateARPU(mrrData.total, activeUniqueSubscribers)

    console.log(`\n💰 Final Metrics:`)
    console.log(`  MRR: $${mrrData.total.toFixed(2)}`)
    console.log(`  ARR: $${arr.toFixed(2)}`)
    console.log(`  ARPU: $${arpu.toFixed(2)}`)
    console.log(`  Active Unique Subscribers: ${activeUniqueSubscribers}`)
    console.log(`  Active Memberships: ${subscriberMetrics.active}\n`)

    // Extract unique plans with their access pass titles
    const uniquePlans = allPlans
      .filter(plan => plan.accessPass?.title)
      .reduce((acc, plan) => {
        const existing = acc.find(p => p.id === plan.id)
        if (!existing) {
          acc.push({
            id: plan.id,
            name: plan.accessPass?.title || 'Unknown Plan'
          })
        }
        return acc
      }, [] as Array<{ id: string; name: string }>)

    const response = {
      mrr: {
        total: mrrData.total,
        breakdown: mrrData.breakdown,
      },
      arr,
      arpu,
      subscribers: subscriberMetrics,
      activeUniqueSubscribers,
      plans: uniquePlans,
      timestamp: new Date().toISOString(),
    }

    // Store snapshot in MongoDB for historical tracking
    try {
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
          totalMemberships: memberships.length,
          activeMemberships: enrichedMemberships.filter(m => {
            const now = Date.now() / 1000
            return (m.status === 'active' || m.status === 'completed') &&
                   m.canceledAt === null &&
                   (!m.expiresAt || m.expiresAt > now)
          }).length,
          plansCount: allPlans.length,
        }
      })
      console.log(`✅ Stored daily snapshot for ${companyId}`)
    } catch (snapshotError) {
      console.error('Failed to store metrics snapshot:', snapshotError)
      // Don't fail the request if snapshot storage fails
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error calculating analytics:', error)
    return NextResponse.json(
      { error: 'Failed to calculate analytics' },
      { status: 500 }
    )
  }
}

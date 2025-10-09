import { NextRequest, NextResponse } from 'next/server'
import { whopSdk } from '@/lib/whop/sdk'
import { calculateMRR, calculateARR, calculateARPU } from '@/lib/analytics/mrr'
import { calculateSubscriberMetrics, getActiveUniqueSubscribers } from '@/lib/analytics/subscribers'
import { Membership, Plan } from '@/lib/types/analytics'

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
    let allPlans: unknown[] = []
    let hasNextPlanPage = true
    let planCursor: string | undefined = undefined

    while (hasNextPlanPage) {
      const plansResponse = await whopSdk.withCompany(companyId).companies.listPlans({
        companyId,
        first: 50,
        after: planCursor,
      })

      const planNodes = plansResponse?.plans?.nodes || []
      allPlans = [...allPlans, ...planNodes]

      hasNextPlanPage = plansResponse?.plans?.pageInfo?.hasNextPage || false
      planCursor = plansResponse?.plans?.pageInfo?.endCursor ?? undefined

      if (!hasNextPlanPage) break
    }

    // Create a map of planId -> planData for quick lookup
    const planMap = new Map<string, Plan>()
    allPlans.forEach((plan: unknown) => {
      const p = plan as Plan
      planMap.set(p.id, p)
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

    return NextResponse.json({
      mrr: {
        total: mrrData.total,
        breakdown: mrrData.breakdown,
      },
      arr,
      arpu,
      subscribers: subscriberMetrics,
      activeUniqueSubscribers,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error calculating analytics:', error)
    return NextResponse.json(
      { error: 'Failed to calculate analytics' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getAllMemberships, getAllPlans } from '@/lib/whop/helpers'
import { calculateMRR, calculateARR, calculateARPU } from '@/lib/analytics/mrr'
import { calculateSubscriberMetrics, getActiveUniqueSubscribers } from '@/lib/analytics/subscribers'
import { calculateTrialMetrics } from '@/lib/analytics/trials'
import { Membership, Plan } from '@/lib/types/analytics'
import { metricsRepository } from '@/lib/db/repositories/MetricsRepository'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('company_id')
    const forceRefresh = searchParams.get('force_refresh') === 'true'

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required. Pass it as ?company_id=YOUR_ID' },
        { status: 400 }
      )
    }

    // Try to use cached snapshot data if available and not forcing refresh
    if (!forceRefresh) {
      const cachedSnapshot = await metricsRepository.getLatestSnapshotWithRawData(companyId)

      if (cachedSnapshot?.rawData) {
        // Extract unique plans from cached data
        const cachedPlans = (cachedSnapshot.rawData.plans || []) as Plan[]
        const uniquePlans = cachedPlans
          .filter((plan) => plan.accessPass?.title)
          .reduce((acc: Array<{ id: string; name: string }>, plan) => {
            const existing = acc.find(p => p.id === plan.id)
            if (!existing) {
              acc.push({
                id: plan.id,
                name: plan.accessPass?.title || 'Unknown Plan'
              })
            }
            return acc
          }, [] as Array<{ id: string; name: string }>)

        return NextResponse.json({
          mrr: cachedSnapshot.mrr,
          arr: cachedSnapshot.arr,
          arpu: cachedSnapshot.arpu,
          subscribers: cachedSnapshot.subscribers,
          activeUniqueSubscribers: cachedSnapshot.activeUniqueSubscribers,
          plans: uniquePlans,
          timestamp: cachedSnapshot.timestamp.toISOString(),
          cached: true,
          snapshotDate: cachedSnapshot.date.toISOString(),
        })
      }
    }

    // Fetch ALL memberships and plans using SDK helpers
    const memberships = await getAllMemberships(companyId)
    const allPlans = await getAllPlans(companyId)

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

    // Calculate metrics with enriched data
    const mrrData = calculateMRR(enrichedMemberships)
    const arr = calculateARR(mrrData.total)
    const subscriberMetrics = calculateSubscriberMetrics(enrichedMemberships)
    const activeUniqueSubscribers = getActiveUniqueSubscribers(enrichedMemberships)
    const arpu = calculateARPU(mrrData.total, activeUniqueSubscribers)
    const trialMetrics = calculateTrialMetrics(enrichedMemberships)

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
      trials: {
        total: trialMetrics.totalTrials,
        active: trialMetrics.activeTrials,
        converted: trialMetrics.convertedTrials,
        conversionRate: trialMetrics.conversionRate,
      },
      plans: uniquePlans,
      timestamp: new Date().toISOString(),
    }

    console.log(JSON.stringify(response, null, 2))

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
    } catch (snapshotError) {
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to calculate analytics' },
      { status: 500 }
    )
  }
}

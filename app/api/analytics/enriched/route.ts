import { NextRequest, NextResponse } from 'next/server'
import { getAllMemberships, getAllPayments, getAllPlans } from '@/lib/whop/helpers'
import { calculateMRR, calculateARR, calculateARPU } from '@/lib/analytics/mrr'
import { calculateSubscriberMetrics, getActiveUniqueSubscribers } from '@/lib/analytics/subscribers'
import { calculateTrialMetrics } from '@/lib/analytics/trials'
import { calculateCustomerLifetimeValue } from '@/lib/analytics/lifetime'
import { calculateCashFlow, calculatePaymentMetrics, calculateRefundMetrics } from '@/lib/analytics/transactions'
import { Membership, Plan } from '@/lib/types/analytics'
import { metricsRepository } from '@/lib/db/repositories/MetricsRepository'

// Session cache TTL: 10 minutes
const CACHE_TTL_MS = 10 * 60 * 1000;

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

    // Check for cached data (session-level cache)
    if (!forceRefresh) {
      const cachedSnapshot = await metricsRepository.getLatestSnapshotWithRawData(companyId)

      if (cachedSnapshot) {
        const cacheAge = Date.now() - cachedSnapshot.timestamp.getTime()

        // Use cache if less than 10 minutes old
        if (cacheAge < CACHE_TTL_MS) {
          console.log(`[Cache HIT] Using cached data (${Math.round(cacheAge / 1000)}s old)`)

          // Return cached enriched data
          const cachedPlans = (cachedSnapshot.rawData?.plans || []) as Plan[]
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
            trials: (cachedSnapshot.rawData as any)?.trials || { total: 0, active: 0, converted: 0, conversionRate: 0 },
            clv: (cachedSnapshot.rawData as any)?.clv || { average: 0, median: 0, total: 0 },
            cashFlow: (cachedSnapshot.rawData as any)?.cashFlow || { gross: 0, net: 0, recurring: 0, nonRecurring: 0 },
            payments: (cachedSnapshot.rawData as any)?.payments || { successful: 0, failed: 0, total: 0, successRate: 0 },
            refunds: (cachedSnapshot.rawData as any)?.refunds || { total: 0, amount: 0, rate: 0 },
            plans: uniquePlans,
            timestamp: cachedSnapshot.timestamp.toISOString(),
            cached: true,
            cacheAge: Math.round(cacheAge / 1000)
          })
        }
      }
    }

    console.log(`[Cache MISS] Fetching fresh data from Whop SDK`)

    // Fetch all data using SDK helpers (only if cache miss or force refresh)
    const allMemberships = await getAllMemberships(companyId)
    const allPlans = await getAllPlans(companyId)
    const payments = await getAllPayments(companyId)

    // Enrich memberships with plan data
    const planMap = new Map<string, Plan>()
    allPlans.forEach((plan) => {
      planMap.set(plan.id, plan)
    })

    const enrichedMemberships: Membership[] = allMemberships.map(m => ({
      ...m,
      planData: m.plan ? planMap.get(m.plan.id) : undefined
    }))

    // Calculate all metrics
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

    // Extract unique plans
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
      refunds: {
        total: refundMetrics.totalRefunds,
        amount: refundMetrics.refundedAmount,
        rate: refundMetrics.refundRate,
      },
      plans: uniquePlans,
      timestamp: new Date().toISOString(),
      cached: false
    }

    // Store in cache for next request (session-level cache with 10min TTL)
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
          plans: allPlans,
          trials: response.trials,
          clv: response.clv,
          cashFlow: response.cashFlow,
          payments: response.payments,
          refunds: response.refunds,
        }
      })
      console.log(`[Cache UPDATED] Stored fresh data for future requests`)
    } catch (cacheError) {
      console.error('[Cache ERROR] Failed to store cache:', cacheError)
      // Don't fail the request if cache update fails
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to calculate analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

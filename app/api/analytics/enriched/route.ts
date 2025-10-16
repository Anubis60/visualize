import { NextRequest, NextResponse } from 'next/server'
import { whopSdk } from '@/lib/whop/sdk'
import { calculateMRR, calculateARR, calculateARPU } from '@/lib/analytics/mrr'
import { calculateSubscriberMetrics, getActiveUniqueSubscribers } from '@/lib/analytics/subscribers'
import { calculateTrialMetrics } from '@/lib/analytics/trials'
import { calculateCustomerLifetimeValue } from '@/lib/analytics/lifetime'
import { calculateCashFlow, calculatePaymentMetrics, calculateRefundMetrics, Payment } from '@/lib/analytics/transactions'
import { Membership, Plan } from '@/lib/types/analytics'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('company_id')

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required. Pass it as ?company_id=YOUR_ID' },
        { status: 400 }
      )
    }

    // Fetch memberships
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

    // Fetch plans
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

    // Fetch payments
    const paymentsUrl = new URL("https://api.whop.com/api/v1/payments")
    paymentsUrl.searchParams.set("company_id", companyId)

    const paymentsResponse = await fetch(paymentsUrl, {
      headers: {
        Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
      },
    })

    const paymentsData = await paymentsResponse.json()
    const payments = (paymentsData.data || []) as Payment[]

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
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to calculate analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

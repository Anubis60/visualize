import { NextRequest, NextResponse } from 'next/server'
import { whopClient } from '@/lib/whop/client'
import { calculateMRR, calculateARR, calculateARPU } from '@/lib/analytics/mrr'
import { calculateSubscriberMetrics, getActiveUniqueSubscribers } from '@/lib/analytics/subscribers'

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

    // Fetch all memberships
    const memberships = await whopClient.getAllMemberships(companyId)

    // Calculate metrics
    const mrrData = calculateMRR(memberships)
    const arr = calculateARR(mrrData.total)
    const subscriberMetrics = calculateSubscriberMetrics(memberships)
    const activeUniqueSubscribers = getActiveUniqueSubscribers(memberships)
    const arpu = calculateARPU(mrrData.total, activeUniqueSubscribers)

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

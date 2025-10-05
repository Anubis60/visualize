import { NextRequest, NextResponse } from 'next/server'
import { whopSdk } from '@/lib/whop/sdk'
import { calculateMRR, calculateARR, calculateARPU } from '@/lib/analytics/mrr'
import { calculateSubscriberMetrics, getActiveUniqueSubscribers } from '@/lib/analytics/subscribers'
import { Membership } from '@/lib/types/analytics'

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

    // Fetch company receipts/payments using Whop SDK
    const companyReceipts = await whopSdk.withCompany(companyId).payments.listReceiptsForCompany({
      companyId,
      first: 100,
    })

    console.log('Whop SDK Receipts Response:', JSON.stringify(companyReceipts, null, 2))

    // For now, use empty memberships array since we need to set up proper permissions
    const memberships: Membership[] = []

    console.log('Parsed memberships count:', memberships.length)

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

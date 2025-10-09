import { NextRequest, NextResponse } from 'next/server'
import { whopSdk } from '@/lib/whop/sdk'

// Increase timeout to 5 minutes for large transaction lists
export const maxDuration = 300

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

    console.log('\n💳 Fetching all transactions for company:', companyId)

    // First, fetch all plans to get plan IDs
    console.log('📋 Fetching all plans first...')
    let allPlans: Array<{ id: string }> = []
    let hasPlanPage = true
    let planCursor: string | undefined = undefined

    while (hasPlanPage) {
      const plansResponse = await whopSdk.withCompany(companyId).companies.listPlans({
        companyId,
        first: 50,
        after: planCursor,
      })

      const planNodes = (plansResponse?.plans?.nodes || []) as Array<{ id: string }>
      allPlans = [...allPlans, ...planNodes]

      hasPlanPage = plansResponse?.plans?.pageInfo?.hasNextPage || false
      planCursor = plansResponse?.plans?.pageInfo?.endCursor ?? undefined

      if (!hasPlanPage) break
    }

    const planIds = allPlans.map(p => p.id)
    console.log(`✅ Found ${planIds.length} plans:`, planIds)

    // Fetch ALL receipts/transactions using pagination
    let allReceipts: unknown[] = []
    let hasNextPage = true
    let cursor: string | undefined = undefined

    // Calculate timestamp for 1 year ago
    const oneYearAgo = Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60)

    while (hasNextPage) {
      let response
      try {
        console.log(`🔄 Fetching receipts page with cursor: ${cursor || 'initial'}`)

        response = await whopSdk.payments.listReceiptsForCompany({
          companyId: companyId,
          first: 50,
          ...(cursor && { after: cursor }),
          filter: {
            planIds: planIds,
            billingReasons: ["manual", "one_time", "subscription", "subscription_create", "subscription_cycle", "subscription_update"],
            direction: "asc",
            order: "created_at",
            startDate: oneYearAgo,
            statuses: ["failed", "partially_refunded", "past_due", "refunded", "succeeded"],
          },
        })
      } catch (sdkError) {
        console.error('\n❌ SDK Error Details:')
        console.error('Error type:', typeof sdkError)
        console.error('Error:', sdkError)
        if (sdkError && typeof sdkError === 'object') {
          console.error('Error keys:', Object.keys(sdkError))
          console.error('Error JSON:', JSON.stringify(sdkError, null, 2))
        }

        // Check if it's a permissions error
        const errorMsg = JSON.stringify(sdkError)
        if (errorMsg.includes('500') || errorMsg.includes('Internal Server Error')) {
          throw new Error('Whop API returned 500 error. This is likely a permissions issue. Make sure your Whop app has the "payment:basic:read" permission enabled.')
        }

        throw new Error(`Failed to fetch receipts: ${sdkError instanceof Error ? sdkError.message : JSON.stringify(sdkError)}`)
      }

      // Log raw SDK response
      console.log('\n🔍 RAW SDK RESPONSE:')
      console.log(JSON.stringify(response, null, 2))

      const receipts = (response?.receipts?.nodes || []).filter(r => r !== null)
      allReceipts = [...allReceipts, ...receipts]

      hasNextPage = response?.receipts?.pageInfo?.hasNextPage || false
      cursor = response?.receipts?.pageInfo?.endCursor ?? undefined

      console.log(`  Fetched ${receipts.length} receipts (total: ${allReceipts.length})`)

      if (!hasNextPage) break
    }

    console.log(`\n✅ Total receipts fetched: ${allReceipts.length}`)

    // Log first few receipts in detail for study
    console.log('\n📊 Sample Receipts (first 3):')
    allReceipts.slice(0, 3).forEach((receipt, index) => {
      console.log(`\n--- Receipt ${index + 1} ---`)
      console.log(JSON.stringify(receipt, null, 2))
    })

    // Log summary stats
    const stats = {
      total: allReceipts.length,
      byStatus: allReceipts.reduce((acc: Record<string, number>, r: unknown) => {
        const receipt = r as Record<string, unknown>
        const status = (receipt.status as string) || 'unknown'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {}),
      byFriendlyStatus: allReceipts.reduce((acc: Record<string, number>, r: unknown) => {
        const receipt = r as Record<string, unknown>
        const friendlyStatus = (receipt.friendlyStatus as string) || 'unknown'
        acc[friendlyStatus] = (acc[friendlyStatus] || 0) + 1
        return acc
      }, {}),
      byCurrency: allReceipts.reduce((acc: Record<string, number>, r: unknown) => {
        const receipt = r as Record<string, unknown>
        const currency = (receipt.currency as string) || 'unknown'
        acc[currency] = (acc[currency] || 0) + 1
        return acc
      }, {}),
      byPaymentProcessor: allReceipts.reduce((acc: Record<string, number>, r: unknown) => {
        const receipt = r as Record<string, unknown>
        const processor = (receipt.paymentProcessor as string) || 'unknown'
        acc[processor] = (acc[processor] || 0) + 1
        return acc
      }, {}),
      totalRevenue: allReceipts.reduce((sum: number, r: unknown) => {
        const receipt = r as Record<string, unknown>
        return sum + ((receipt.finalAmount as number) || 0)
      }, 0),
      totalRevenueUSD: allReceipts.reduce((sum: number, r: unknown) => {
        const receipt = r as Record<string, unknown>
        return sum + ((receipt.settledUsdAmount as number) || 0)
      }, 0),
      totalRefunded: allReceipts.reduce((sum: number, r: unknown) => {
        const receipt = r as Record<string, unknown>
        return sum + ((receipt.refundedAmount as number) || 0)
      }, 0),
    }

    console.log('\n📈 Transaction Stats:')
    console.log(JSON.stringify(stats, null, 2))

    return NextResponse.json({
      companyId,
      total: allReceipts.length,
      stats,
      receipts: allReceipts,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { whopSdk } from '@/lib/whop/sdk'

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

    console.log('\n💳 Fetching all transactions for company:', companyId)

    interface Receipt {
      status?: string
      friendlyStatus?: string
      currency?: string
      paymentProcessor?: string
      finalAmount?: number
      settledUsdAmount?: number
      refundedAmount?: number
      [key: string]: unknown
    }

    // Fetch ALL receipts/transactions using pagination
    let allReceipts: Receipt[] = []
    let hasNextPage = true
    let cursor: string | undefined = undefined

    while (hasNextPage) {
      const response = await whopSdk.withCompany(companyId).payments.listReceiptsForCompany({
        companyId,
        first: 50,
        after: cursor,
      })

      const receipts = response?.receipts?.nodes || []
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
      byStatus: allReceipts.reduce((acc: Record<string, number>, r) => {
        const status = r.status || 'unknown'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {}),
      byFriendlyStatus: allReceipts.reduce((acc: Record<string, number>, r) => {
        const friendlyStatus = r.friendlyStatus || 'unknown'
        acc[friendlyStatus] = (acc[friendlyStatus] || 0) + 1
        return acc
      }, {}),
      byCurrency: allReceipts.reduce((acc: Record<string, number>, r) => {
        const currency = r.currency || 'unknown'
        acc[currency] = (acc[currency] || 0) + 1
        return acc
      }, {}),
      byPaymentProcessor: allReceipts.reduce((acc: Record<string, number>, r) => {
        const processor = r.paymentProcessor || 'unknown'
        acc[processor] = (acc[processor] || 0) + 1
        return acc
      }, {}),
      totalRevenue: allReceipts.reduce((sum, r) => sum + (r.finalAmount || 0), 0),
      totalRevenueUSD: allReceipts.reduce((sum, r) => sum + (r.settledUsdAmount || 0), 0),
      totalRefunded: allReceipts.reduce((sum, r) => sum + (r.refundedAmount || 0), 0),
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

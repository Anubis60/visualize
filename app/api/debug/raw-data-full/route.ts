import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('company_id')

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    console.log('\n=== RAW DATA FOR COMPANY:', companyId, '===')

    // Fetch and log raw memberships
    console.log('\n--- RAW MEMBERSHIPS (ALL) ---')
    const membershipsUrl = `https://api.whop.com/api/v1/memberships?company_id=${companyId}`
    const membershipsRes = await fetch(membershipsUrl, {
      headers: { Authorization: `Bearer ${process.env.WHOP_API_KEY}` }
    })
    const membershipsData = await membershipsRes.json()
    console.log(JSON.stringify(membershipsData, null, 2))

    // Fetch and log raw transactions
    console.log('\n--- RAW TRANSACTIONS/PAYMENTS (ALL) ---')
    const paymentsUrl = `https://api.whop.com/api/v1/payments?company_id=${companyId}`
    const paymentsRes = await fetch(paymentsUrl, {
      headers: { Authorization: `Bearer ${process.env.WHOP_API_KEY}` }
    })
    const paymentsData = await paymentsRes.json()
    console.log(JSON.stringify(paymentsData, null, 2))

    // Fetch and log historical data
    console.log('\n--- HISTORICAL DATA (1 YEAR BACK - ALL) ---')
    const { metricsRepository } = await import('@/lib/db/repositories/MetricsRepository')
    const historicalData = await metricsRepository.getDailyMetrics(companyId, 365)
    console.log(JSON.stringify(historicalData, null, 2))

    console.log('\n=== END RAW DATA FOR', companyId, '===\n')

    return NextResponse.json({
      success: true,
      message: 'Raw data logged to Vercel server logs',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error logging raw data:', error)
    return NextResponse.json(
      { error: 'Failed to log raw data' },
      { status: 500 }
    )
  }
}

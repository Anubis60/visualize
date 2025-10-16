import { NextRequest, NextResponse } from 'next/server'
import { whopSdk } from '@/lib/whop/sdk'

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

    const results: Record<string, unknown> = {}

    // Company Data
    try {
      const company = await whopSdk.withCompany(companyId).companies.getCompany({
        companyId,
      })
      results.company = company
    } catch (error) {
      results.company = { error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // Memberships (first page)
    try {
      const memberships = await whopSdk.withCompany(companyId).companies.listMemberships({
        companyId,
        first: 5,
      })
      results.memberships = memberships
    } catch (error) {
      results.memberships = { error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // Plans (first page)
    try {
      const plans = await whopSdk.withCompany(companyId).companies.listPlans({
        companyId,
        first: 5,
      })
      results.plans = plans
    } catch (error) {
      results.plans = { error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // Payments/Transactions
    try {
      const paymentsUrl = new URL("https://api.whop.com/api/v1/payments")
      paymentsUrl.searchParams.set("company_id", companyId)
      paymentsUrl.searchParams.set("per", "5")

      const paymentsResponse = await fetch(paymentsUrl, {
        headers: {
          Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
        },
      })

      const paymentsData = await paymentsResponse.json()
      results.payments = paymentsData
    } catch (error) {
      results.payments = { error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // Available SDK methods
    const sdkMethods = Object.keys(whopSdk.withCompany(companyId).companies)
    results.availableSdkMethods = sdkMethods

    // Return full raw data in response for Vercel logs and browser viewing
    return NextResponse.json({
      message: 'Raw SDK responses - Full data included in response',
      companyId,
      rawResponses: results,
      availableSdkMethods: sdkMethods,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch debug data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

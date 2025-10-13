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

    console.log('\n\n========================================')
    console.log('🔍 RAW SDK RESPONSE DEBUG')
    console.log('========================================\n')

    const results: Record<string, unknown> = {}

    // 1. Company Data
    console.log('\n📋 1. COMPANY DATA:')
    console.log('-------------------')
    try {
      const company = await whopSdk.withCompany(companyId).companies.getCompany({
        companyId,
      })
      console.log(JSON.stringify(company, null, 2))
      results.company = company
    } catch (error) {
      console.error('Error fetching company:', error)
      results.company = { error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // 2. Memberships (just first page)
    console.log('\n\n👥 2. MEMBERSHIPS (first page):')
    console.log('--------------------------------')
    try {
      const memberships = await whopSdk.withCompany(companyId).companies.listMemberships({
        companyId,
        first: 5, // Just get 5 for debugging
      })
      console.log(JSON.stringify(memberships, null, 2))
      results.memberships = memberships
    } catch (error) {
      console.error('Error fetching memberships:', error)
      results.memberships = { error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // 3. Plans (just first page)
    console.log('\n\n📦 3. PLANS (first page):')
    console.log('-------------------------')
    try {
      const plans = await whopSdk.withCompany(companyId).companies.listPlans({
        companyId,
        first: 5, // Just get 5 for debugging
      })
      console.log(JSON.stringify(plans, null, 2))
      results.plans = plans
    } catch (error) {
      console.error('Error fetching plans:', error)
      results.plans = { error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // 4. Payments/Transactions (REST API)
    console.log('\n\n💳 4. PAYMENTS/TRANSACTIONS:')
    console.log('----------------------------')
    try {
      const paymentsUrl = new URL("https://api.whop.com/api/v1/payments")
      paymentsUrl.searchParams.set("company_id", companyId)
      paymentsUrl.searchParams.set("per", "5") // Just get 5 for debugging

      const paymentsResponse = await fetch(paymentsUrl, {
        headers: {
          Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
        },
      })

      const paymentsData = await paymentsResponse.json()
      console.log(JSON.stringify(paymentsData, null, 2))
      results.payments = paymentsData
    } catch (error) {
      console.error('Error fetching payments:', error)
      results.payments = { error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // 5. Check if SDK has other methods
    console.log('\n\n🔧 5. AVAILABLE SDK METHODS:')
    console.log('----------------------------')
    const sdkMethods = Object.keys(whopSdk.withCompany(companyId).companies)
    console.log('Available methods on companies:', sdkMethods)
    results.availableSdkMethods = sdkMethods

    console.log('\n\n========================================')
    console.log('✅ DEBUG COMPLETE - Check console logs above')
    console.log('========================================\n\n')

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
    console.error('❌ Debug endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch debug data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'

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

    const url = new URL("https://api.whop.com/api/v1/payments")
    url.searchParams.set("company_id", companyId)

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
      },
    })

    const data = await response.json()
    console.log(data)

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

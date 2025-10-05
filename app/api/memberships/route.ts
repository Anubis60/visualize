import { NextRequest, NextResponse } from 'next/server'
import { whopClient } from '@/lib/whop/client'

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

    const memberships = await whopClient.getAllMemberships(companyId)

    return NextResponse.json({
      data: memberships,
      count: memberships.length
    })
  } catch (error) {
    console.error('Error fetching memberships:', error)
    return NextResponse.json(
      { error: 'Failed to fetch memberships' },
      { status: 500 }
    )
  }
}

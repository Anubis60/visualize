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

    const company = await whopSdk.withCompany(companyId).companies.getCompany({
      companyId,
    })

    return NextResponse.json({
      id: company.id,
      title: company.title,
      logo: company.logo,
      bannerImage: company.bannerImage,
    })
  } catch (error) {
    console.error('Error fetching company data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch company data' },
      { status: 500 }
    )
  }
}

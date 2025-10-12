import { NextRequest, NextResponse } from 'next/server'
import { whopSdk } from '@/lib/whop/sdk'
import { metricsRepository } from '@/lib/db/repositories/MetricsRepository'
import { companyRepository } from '@/lib/db/repositories/CompanyRepository'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('company_id')
    const forceRefresh = searchParams.get('force_refresh') === 'true'

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required. Pass it as ?company_id=YOUR_ID' },
        { status: 400 }
      )
    }

    // Try to use cached snapshot data if available
    if (!forceRefresh) {
      const cachedSnapshot = await metricsRepository.getLatestSnapshotWithRawData(companyId)

      if (cachedSnapshot?.rawData?.company) {
        console.log(`📦 Using cached company data from snapshot`)
        return NextResponse.json({
          ...cachedSnapshot.rawData.company,
          cached: true,
        })
      }
    }

    // Fetch from API if no cache or force refresh
    const company = await whopSdk.withCompany(companyId).companies.getCompany({
      companyId,
    })

    // Auto-register company in database for future snapshots
    try {
      await companyRepository.registerCompany(companyId, company.title)
      console.log(`✅ Company ${companyId} (${company.title}) registered for snapshots`)
    } catch (error) {
      console.error('Failed to register company:', error)
      // Don't fail the request if registration fails
    }

    return NextResponse.json({
      id: company.id,
      title: company.title,
      logo: company.logo,
      bannerImage: company.bannerImage,
      cached: false,
    })
  } catch (error) {
    console.error('Error fetching company data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch company data' },
      { status: 500 }
    )
  }
}

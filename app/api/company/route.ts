import { NextRequest, NextResponse } from 'next/server'
import { whopClient } from '@/lib/whop/sdk'
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

    // Try to use cached company data from companies collection (fastest)
    if (!forceRefresh) {
      const cachedCompany = await companyRepository.findByWhopCompanyId(companyId)

      if (cachedCompany) {
        // Use the stored logo string (already extracted from rawData.logo.url when saved)
        // cachedCompany.logo is the URL string, rawData.logo is the object { url: "..." }
        return NextResponse.json({
          id: cachedCompany.companyId,
          title: cachedCompany.title,
          logo: cachedCompany.logo, // This is already the URL string
          bannerImage: cachedCompany.bannerImage,
          cached: true,
        })
      }

      // Fallback to snapshot data if company not in collection yet
      const cachedSnapshot = await metricsRepository.getLatestSnapshotWithRawData(companyId)

      if (cachedSnapshot?.rawData?.company) {
        return NextResponse.json({
          ...cachedSnapshot.rawData.company,
          cached: true,
        })
      }
    }

    // Fetch from API if no cache or force refresh
    const company = await whopClient.companies.retrieve(companyId)

    // Auto-register company in database for future snapshots
    try {
      await companyRepository.registerCompany({
        id: company.id,
        title: company.title,
        route: company.route || companyId,
        logo: company.logo?.url || undefined,
        bannerImage: undefined, // SDK doesn't provide bannerImage yet
        industryType: company.industry_type || undefined,
        businessType: company.business_type || undefined,
        rawData: company, // Store full Whop company object
      })
    } catch {
      // Ignore errors when saving to DB - still return company data
    }

    return NextResponse.json({
      id: company.id,
      title: company.title,
      logo: company.logo?.url || undefined,
      bannerImage: undefined, // SDK doesn't provide bannerImage yet
      cached: false,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch company data' },
      { status: 500 }
    )
  }
}

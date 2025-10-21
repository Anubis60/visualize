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
        // Extract logo and bannerImage from rawData if available (rawData has the full Whop API response)
        let logo: unknown = cachedCompany.logo
        let bannerImage: unknown = undefined

        if (cachedCompany.rawData && typeof cachedCompany.rawData === 'object') {
          const rawData = cachedCompany.rawData as { logo?: unknown; bannerImage?: unknown }
          // Prefer rawData values as they contain the full Whop API response
          if ('logo' in rawData) {
            logo = rawData.logo
          }
          if ('bannerImage' in rawData) {
            bannerImage = rawData.bannerImage
          }
        }

        return NextResponse.json({
          id: cachedCompany.companyId,
          title: cachedCompany.title,
          logo,
          bannerImage,
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
        logo: undefined, // SDK doesn't provide logo
        bannerImage: undefined, // SDK doesn't provide bannerImage
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
      logo: undefined, // SDK doesn't provide logo
      bannerImage: undefined, // SDK doesn't provide bannerImage
      cached: false,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch company data' },
      { status: 500 }
    )
  }
}

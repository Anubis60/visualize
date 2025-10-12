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

    // Try to use cached company data from companies collection (fastest)
    if (!forceRefresh) {
      const cachedCompany = await companyRepository.findByWhopCompanyId(companyId)

      if (cachedCompany) {
        console.log(`📦 Using cached company data from companies collection`)

        // Extract bannerImage from rawData if available
        let bannerImage: unknown = undefined
        if (cachedCompany.rawData && typeof cachedCompany.rawData === 'object' && 'bannerImage' in cachedCompany.rawData) {
          bannerImage = (cachedCompany.rawData as { bannerImage?: unknown }).bannerImage
        }

        return NextResponse.json({
          id: cachedCompany.companyId,
          title: cachedCompany.title,
          logo: cachedCompany.logo,
          bannerImage,
          cached: true,
        })
      }

      // Fallback to snapshot data if company not in collection yet
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
      await companyRepository.registerCompany({
        id: company.id,
        title: company.title,
        route: company.route || companyId,
        logo: company.logo,
        bannerImage: company.bannerImage,
        industryType: company.industryType || undefined,
        businessType: company.businessType || undefined,
        rawData: company, // Store full Whop company object
      })
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

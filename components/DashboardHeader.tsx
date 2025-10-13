'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface DashboardHeaderProps {
  companyId: string
}

interface CompanyData {
  title: string
  logo?: string | { sourceUrl?: string | null; __typename?: string } | null
  cached?: boolean
}

export function DashboardHeader({ companyId }: DashboardHeaderProps) {
  const [company, setCompany] = useState<CompanyData | null>(null)

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await fetch(`/api/company?company_id=${companyId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch company data')
        }
        const result = await response.json()
        console.log('🔍 Company data received:', result)
        console.log('🔍 Logo value:', result.logo)
        setCompany(result)
      } catch (error) {
        console.error('Failed to fetch company data:', error)
      }
    }
    fetchCompany()
  }, [companyId])

  // Helper function to extract URL from logo (handles both string and object formats)
  const getImageUrl = (image: string | { sourceUrl?: string | null } | null | undefined): string | null => {
    if (!image) return null
    if (typeof image === 'string') return image
    if (typeof image === 'object' && image.sourceUrl) return image.sourceUrl
    return null
  }

  const logoUrl = getImageUrl(company?.logo)

  return (
    <div className="fixed top-0 right-0 z-30 flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200">
      {logoUrl ? (
        <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-gray-200">
          <Image
            src={logoUrl}
            alt={company?.title || "Company"}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-semibold ring-2 ring-gray-200">
          {company?.title?.[0] || "C"}
        </div>
      )}
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-gray-900">
          {company?.title || "Loading..."}
        </span>
        <span className="text-xs text-gray-500">Dashboard</span>
      </div>
    </div>
  )
}

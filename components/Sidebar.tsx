'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Users, TrendingDown, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react'
import { useSidebarStore } from '@/lib/stores/sidebarStore'
import { useEffect, useState } from 'react'
import { whopSdk } from '@/lib/whop/sdk'

interface SidebarProps {
  companyId: string
}

interface CompanyData {
  title: string
  logo?: { sourceUrl?: string | null } | null
  bannerImage?: { sourceUrl?: string | null } | null
}

export function Sidebar({ companyId }: SidebarProps) {
  const pathname = usePathname()
  const collapsed = useSidebarStore(state => state.collapsed)
  const setCollapsed = useSidebarStore(state => state.setCollapsed)
  const [company, setCompany] = useState<CompanyData | null>(null)

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const result = await whopSdk.companies.getCompany({ companyId })
        setCompany(result)
      } catch (error) {
        console.error('Failed to fetch company data:', error)
      }
    }
    fetchCompany()
  }, [companyId])

  const isActive = (path: string) => pathname === path

  // Use banner image if available, otherwise fallback to logo
  const companyImageUrl = company?.bannerImage?.sourceUrl || company?.logo?.sourceUrl

  return (
    <aside className={cn(
      "bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col transition-all duration-300 z-20",
      collapsed ? "w-16" : "w-56"
    )}>
      {/* Header */}
      <div className={cn(
        "border-b border-slate-800 flex flex-col items-center justify-center",
        collapsed ? "p-3" : "p-4"
      )}>
        {companyImageUrl ? (
          <>
            <div className={cn(
              "relative overflow-hidden rounded-lg",
              collapsed ? "w-10 h-10" : "w-full h-24"
            )}>
              <Image
                src={companyImageUrl}
                alt={company?.title || "Company"}
                fill
                className="object-cover"
              />
            </div>
            {!collapsed && company?.title && (
              <h2 className="mt-2 text-sm font-semibold text-center text-white truncate w-full px-2">
                {company.title}
              </h2>
            )}
          </>
        ) : (
          <div className={cn(
            "bg-slate-800 rounded-lg flex items-center justify-center",
            collapsed ? "w-10 h-10" : "w-full h-24"
          )}>
            <span className="text-slate-400 text-xs">Loading...</span>
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 bg-slate-800 hover:bg-slate-700 text-white rounded-full p-1.5 shadow-lg transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {/* Overview */}
        <Link
          href={`/dashboard/${companyId}`}
          className={cn(
            "flex items-center hover:bg-slate-800 transition-colors",
            collapsed ? "px-4 py-3 justify-center" : "px-6 py-3",
            isActive(`/dashboard/${companyId}`) && "bg-slate-800 border-l-4 border-blue-500"
          )}
          title={collapsed ? "Overview" : undefined}
        >
          <span className="text-lg">📊</span>
          {!collapsed && <span className="ml-3">Overview</span>}
        </Link>

        {/* Revenue Section */}
        <div className="mt-6">
          {!collapsed && (
            <div className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Revenue
            </div>
          )}
          {collapsed && (
            <div className="px-4 py-2 text-center">
              <span className="text-xs text-slate-400">💵</span>
            </div>
          )}

          <Link
            href={`/dashboard/${companyId}/mrr`}
            className={cn(
              "flex items-center hover:bg-slate-800 transition-colors",
              collapsed ? "px-4 py-3 justify-center" : "px-6 py-3",
              isActive(`/dashboard/${companyId}/mrr`) && "bg-slate-800 border-l-4 border-blue-500"
            )}
            title={collapsed ? "MRR" : undefined}
          >
            <DollarSign className="h-4 w-4" />
            {!collapsed && <span className="ml-3">MRR</span>}
          </Link>

          <Link
            href={`/dashboard/${companyId}/arr`}
            className={cn(
              "flex items-center hover:bg-slate-800 transition-colors",
              collapsed ? "px-4 py-3 justify-center" : "px-6 py-3",
              isActive(`/dashboard/${companyId}/arr`) && "bg-slate-800 border-l-4 border-blue-500"
            )}
            title={collapsed ? "Annual Run Rate" : undefined}
          >
            <DollarSign className="h-4 w-4" />
            {!collapsed && <span className="ml-3">Annual Run Rate</span>}
          </Link>

          <Link
            href={`/dashboard/${companyId}/net-mrr-movements`}
            className={cn(
              "flex items-center hover:bg-slate-800 transition-colors",
              collapsed ? "px-4 py-3 justify-center" : "px-6 py-3",
              isActive(`/dashboard/${companyId}/net-mrr-movements`) && "bg-slate-800 border-l-4 border-blue-500"
            )}
            title={collapsed ? "Net MRR Movements" : undefined}
          >
            <TrendingDown className="h-4 w-4" />
            {!collapsed && <span className="ml-3">Net MRR Movements</span>}
          </Link>
        </div>

        {/* Customers Section */}
        <div className="mt-6">
          {!collapsed && (
            <div className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Customers
            </div>
          )}
          {collapsed && (
            <div className="px-4 py-2 text-center">
              <span className="text-xs text-slate-400">👥</span>
            </div>
          )}

          <Link
            href={`/dashboard/${companyId}/subscribers`}
            className={cn(
              "flex items-center hover:bg-slate-800 transition-colors",
              collapsed ? "px-4 py-3 justify-center" : "px-6 py-3",
              isActive(`/dashboard/${companyId}/subscribers`) && "bg-slate-800 border-l-4 border-blue-500"
            )}
            title={collapsed ? "Subscriber Count" : undefined}
          >
            <Users className="h-4 w-4" />
            {!collapsed && <span className="ml-3">Subscriber Count</span>}
          </Link>

          <Link
            href={`/dashboard/${companyId}/churn`}
            className={cn(
              "flex items-center hover:bg-slate-800 transition-colors",
              collapsed ? "px-4 py-3 justify-center" : "px-6 py-3",
              isActive(`/dashboard/${companyId}/churn`) && "bg-slate-800 border-l-4 border-blue-500"
            )}
            title={collapsed ? "Subscriber Churn (30d)" : undefined}
          >
            <TrendingDown className="h-4 w-4" />
            {!collapsed && <span className="ml-3">Subscriber Churn (30d)</span>}
          </Link>

          <Link
            href={`/dashboard/${companyId}/arpu`}
            className={cn(
              "flex items-center hover:bg-slate-800 transition-colors",
              collapsed ? "px-4 py-3 justify-center" : "px-6 py-3",
              isActive(`/dashboard/${companyId}/arpu`) && "bg-slate-800 border-l-4 border-blue-500"
            )}
            title={collapsed ? "Avg Revenue Per Account" : undefined}
          >
            <DollarSign className="h-4 w-4" />
            {!collapsed && <span className="ml-3">Avg Revenue Per Account</span>}
          </Link>
        </div>
      </nav>
    </aside>
  )
}

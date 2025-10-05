'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Users, TrendingDown, DollarSign, Settings, ChevronRight } from 'lucide-react'

interface SidebarProps {
  companyId: string
}

export function Sidebar({ companyId }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold">💰 Financier</h1>
        <p className="text-sm text-slate-400 mt-1">Analytics Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {/* Overview */}
        <Link
          href={`/dashboard/${companyId}`}
          className={cn(
            "flex items-center px-6 py-3 hover:bg-slate-800 transition-colors",
            isActive(`/dashboard/${companyId}`) && "bg-slate-800 border-l-4 border-blue-500"
          )}
        >
          <span className="text-lg">📊</span>
          <span className="ml-3">Overview</span>
        </Link>

        {/* Customers Section */}
        <div className="mt-6">
          <div className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Customers
          </div>

          <Link
            href={`/dashboard/${companyId}/subscribers`}
            className={cn(
              "flex items-center px-6 py-3 hover:bg-slate-800 transition-colors",
              isActive(`/dashboard/${companyId}/subscribers`) && "bg-slate-800 border-l-4 border-blue-500"
            )}
          >
            <Users className="h-4 w-4" />
            <span className="ml-3">Subscriber Count</span>
          </Link>

          <Link
            href={`/dashboard/${companyId}/churn`}
            className={cn(
              "flex items-center px-6 py-3 hover:bg-slate-800 transition-colors",
              isActive(`/dashboard/${companyId}/churn`) && "bg-slate-800 border-l-4 border-blue-500"
            )}
          >
            <TrendingDown className="h-4 w-4" />
            <span className="ml-3">Subscriber Churn (30d)</span>
          </Link>

          <Link
            href={`/dashboard/${companyId}/arpu`}
            className={cn(
              "flex items-center px-6 py-3 hover:bg-slate-800 transition-colors",
              isActive(`/dashboard/${companyId}/arpu`) && "bg-slate-800 border-l-4 border-blue-500"
            )}
          >
            <DollarSign className="h-4 w-4" />
            <span className="ml-3">Avg Revenue Per Account</span>
          </Link>
        </div>

        {/* Settings */}
        <div className="mt-6">
          <Link
            href={`/dashboard/${companyId}/settings`}
            className={cn(
              "flex items-center px-6 py-3 hover:bg-slate-800 transition-colors",
              isActive(`/dashboard/${companyId}/settings`) && "bg-slate-800 border-l-4 border-blue-500"
            )}
          >
            <Settings className="h-4 w-4" />
            <span className="ml-3">Settings</span>
          </Link>
        </div>
      </nav>
    </aside>
  )
}

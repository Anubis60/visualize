'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Users, TrendingDown, DollarSign, Settings, ChevronLeft, ChevronRight } from 'lucide-react'

interface SidebarProps {
  companyId: string
}

export function Sidebar({ companyId }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (path: string) => pathname === path

  return (
    <aside className={cn(
      "bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className={cn(
        "p-6 border-b border-slate-800 flex items-center justify-between",
        collapsed && "p-4"
      )}>
        {!collapsed && (
          <div>
            <h1 className="text-2xl font-bold">💰 Financier</h1>
            <p className="text-sm text-slate-400 mt-1">Analytics Dashboard</p>
          </div>
        )}
        {collapsed && (
          <div className="text-2xl mx-auto">💰</div>
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

        {/* Settings */}
        <div className="mt-6">
          <Link
            href={`/dashboard/${companyId}/settings`}
            className={cn(
              "flex items-center hover:bg-slate-800 transition-colors",
              collapsed ? "px-4 py-3 justify-center" : "px-6 py-3",
              isActive(`/dashboard/${companyId}/settings`) && "bg-slate-800 border-l-4 border-blue-500"
            )}
            title={collapsed ? "Settings" : undefined}
          >
            <Settings className="h-4 w-4" />
            {!collapsed && <span className="ml-3">Settings</span>}
          </Link>
        </div>
      </nav>
    </aside>
  )
}

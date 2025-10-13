'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Users, TrendingDown, TrendingUp, DollarSign, ChevronLeft, ChevronRight, Target, CreditCard, AlertTriangle, UserPlus, UserMinus, ArrowUpCircle, ArrowDownCircle, RotateCcw, Zap } from 'lucide-react'
import { useSidebarStore } from '@/lib/stores/sidebarStore'

interface SidebarProps {
  companyId: string
}

export function Sidebar({ companyId }: SidebarProps) {
  const pathname = usePathname()
  const collapsed = useSidebarStore(state => state.collapsed)
  const setCollapsed = useSidebarStore(state => state.setCollapsed)

  const isActive = (path: string) => pathname === path

  return (
    <aside className={cn(
      "bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col transition-all duration-300 z-20",
      collapsed ? "w-16" : "w-48"
    )}>
      {/* Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 bg-slate-800 hover:bg-slate-700 text-white rounded-full p-1.5 shadow-lg transition-colors z-10"
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
          {!collapsed && <span className="ml-3 text-sm">Overview</span>}
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

          <Link href={`/dashboard/${companyId}/revenue`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/revenue`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Revenue" : undefined}>
            <span className="text-lg">💵</span>
            {!collapsed && <span className="ml-3 text-sm">Revenue</span>}
          </Link>

          <Link href={`/dashboard/${companyId}/mrr`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/mrr`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "MRR" : undefined}>
            <DollarSign className="h-4 w-4" />
            {!collapsed && <span className="ml-3 text-sm">MRR</span>}
          </Link>

          <Link href={`/dashboard/${companyId}/arr`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/arr`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "ARR" : undefined}>
            <DollarSign className="h-4 w-4" />
            {!collapsed && <span className="ml-3 text-sm">ARR</span>}
          </Link>

          <Link href={`/dashboard/${companyId}/net-revenue`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/net-revenue`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Net Revenue" : undefined}>
            <span className="text-lg">💰</span>
            {!collapsed && <span className="ml-3 text-sm">Net Revenue</span>}
          </Link>
        </div>

        {/* MRR Movements Section */}
        <div className="mt-6">
          {!collapsed && (
            <div className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              MRR Movements
            </div>
          )}
          {collapsed && (
            <div className="px-4 py-2 text-center">
              <span className="text-xs text-slate-400">📈</span>
            </div>
          )}

          <Link href={`/dashboard/${companyId}/net-mrr-movements`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/net-mrr-movements`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Net MRR Movements" : undefined}>
            <TrendingDown className="h-4 w-4" />
            {!collapsed && <span className="ml-3 text-sm">Net MRR</span>}
          </Link>

          <Link href={`/dashboard/${companyId}/new-mrr`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/new-mrr`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "New MRR" : undefined}>
            <span className="text-lg">✨</span>
            {!collapsed && <span className="ml-3 text-sm">New MRR</span>}
          </Link>

          <Link href={`/dashboard/${companyId}/expansion-mrr`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/expansion-mrr`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Expansion MRR" : undefined}>
            <TrendingUp className="h-4 w-4" />
            {!collapsed && <span className="ml-3 text-sm">Expansion MRR</span>}
          </Link>

          <Link href={`/dashboard/${companyId}/contraction-mrr`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/contraction-mrr`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Contraction MRR" : undefined}>
            <TrendingDown className="h-4 w-4" />
            {!collapsed && <span className="ml-3 text-sm">Contraction MRR</span>}
          </Link>

          <Link href={`/dashboard/${companyId}/churned-mrr`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/churned-mrr`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Churned MRR" : undefined}>
            <span className="text-lg">💔</span>
            {!collapsed && <span className="ml-3 text-sm">Churned MRR</span>}
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

          <Link href={`/dashboard/${companyId}/active-customers`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/active-customers`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Active Customers" : undefined}>
            <Users className="h-4 w-4" />
            {!collapsed && <span className="ml-3 text-sm">Active Customers</span>}
          </Link>

          <Link href={`/dashboard/${companyId}/new-customers`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/new-customers`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "New Customers" : undefined}>
            <UserPlus className="h-4 w-4" />
            {!collapsed && <span className="ml-3 text-sm">New Customers</span>}
          </Link>

          <Link href={`/dashboard/${companyId}/subscribers`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/subscribers`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Subscribers" : undefined}>
            <Users className="h-4 w-4" />
            {!collapsed && <span className="ml-3 text-sm">Subscribers</span>}
          </Link>

          <Link href={`/dashboard/${companyId}/arpu`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/arpu`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "ARPU" : undefined}>
            <DollarSign className="h-4 w-4" />
            {!collapsed && <span className="ml-3 text-sm">ARPU</span>}
          </Link>

          <Link href={`/dashboard/${companyId}/clv`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/clv`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "CLV" : undefined}>
            <span className="text-lg">💎</span>
            {!collapsed && <span className="ml-3 text-sm">CLV</span>}
          </Link>

          <Link href={`/dashboard/${companyId}/trials`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/trials`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Trials" : undefined}>
            <Target className="h-4 w-4" />
            {!collapsed && <span className="ml-3 text-sm">Trials</span>}
          </Link>
        </div>

        {/* Customer Movement Section */}
        <div className="mt-6">
          {!collapsed && (
            <div className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Customer Movement
            </div>
          )}
          {collapsed && (
            <div className="px-4 py-2 text-center">
              <span className="text-xs text-slate-400">🔄</span>
            </div>
          )}

          <Link href={`/dashboard/${companyId}/upgrades`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/upgrades`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Upgrades" : undefined}>
            <ArrowUpCircle className="h-4 w-4" />
            {!collapsed && <span className="ml-3 text-sm">Upgrades</span>}
          </Link>

          <Link href={`/dashboard/${companyId}/downgrades`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/downgrades`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Downgrades" : undefined}>
            <ArrowDownCircle className="h-4 w-4" />
            {!collapsed && <span className="ml-3 text-sm">Downgrades</span>}
          </Link>

          <Link href={`/dashboard/${companyId}/cancellations`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/cancellations`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Cancellations" : undefined}>
            <UserMinus className="h-4 w-4" />
            {!collapsed && <span className="ml-3 text-sm">Cancellations</span>}
          </Link>

          <Link href={`/dashboard/${companyId}/reactivations`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/reactivations`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Reactivations" : undefined}>
            <RotateCcw className="h-4 w-4" />
            {!collapsed && <span className="ml-3 text-sm">Reactivations</span>}
          </Link>
        </div>

        {/* Churn Section */}
        <div className="mt-6">
          {!collapsed && (
            <div className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Churn
            </div>
          )}
          {collapsed && (
            <div className="px-4 py-2 text-center">
              <span className="text-xs text-slate-400">📉</span>
            </div>
          )}

          <Link href={`/dashboard/${companyId}/churn`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/churn`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Subscriber Churn" : undefined}>
            <TrendingDown className="h-4 w-4" />
            {!collapsed && <span className="ml-3 text-sm">Subscriber Churn</span>}
          </Link>

          <Link href={`/dashboard/${companyId}/customer-churn-rate`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/customer-churn-rate`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Customer Churn Rate" : undefined}>
            <span className="text-lg">👋</span>
            {!collapsed && <span className="ml-3 text-sm">Customer Churn</span>}
          </Link>

          <Link href={`/dashboard/${companyId}/revenue-churn-rate`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/revenue-churn-rate`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Revenue Churn Rate" : undefined}>
            <TrendingDown className="h-4 w-4" />
            {!collapsed && <span className="ml-3 text-sm">Revenue Churn</span>}
          </Link>
        </div>

        {/* Transactions Section */}
        <div className="mt-6">
          {!collapsed && (
            <div className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Transactions
            </div>
          )}
          {collapsed && (
            <div className="px-4 py-2 text-center">
              <span className="text-xs text-slate-400">💳</span>
            </div>
          )}

          <Link href={`/dashboard/${companyId}/cash-flow`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/cash-flow`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Cash Flow" : undefined}>
            <span className="text-lg">💰</span>
            {!collapsed && <span className="ml-3 text-sm">Cash Flow</span>}
          </Link>

          <Link href={`/dashboard/${companyId}/payments`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/payments`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Payments" : undefined}>
            <CreditCard className="h-4 w-4" />
            {!collapsed && <span className="ml-3 text-sm">Payments</span>}
          </Link>

          <Link href={`/dashboard/${companyId}/failed-charges`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/failed-charges`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Failed Charges" : undefined}>
            <AlertTriangle className="h-4 w-4" />
            {!collapsed && <span className="ml-3 text-sm">Failed Charges</span>}
          </Link>

          <Link href={`/dashboard/${companyId}/refunds`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/refunds`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Refunds" : undefined}>
            <span className="text-lg">↩️</span>
            {!collapsed && <span className="ml-3 text-sm">Refunds</span>}
          </Link>

          <Link href={`/dashboard/${companyId}/avg-sale-price`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/avg-sale-price`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Avg Sale Price" : undefined}>
            <DollarSign className="h-4 w-4" />
            {!collapsed && <span className="ml-3 text-sm">Avg Sale Price</span>}
          </Link>
        </div>

        {/* Metrics Section */}
        <div className="mt-6">
          {!collapsed && (
            <div className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Metrics
            </div>
          )}
          {collapsed && (
            <div className="px-4 py-2 text-center">
              <span className="text-xs text-slate-400">⚡</span>
            </div>
          )}

          <Link href={`/dashboard/${companyId}/quick-ratio`} className={cn("flex items-center hover:bg-slate-800 transition-colors", collapsed ? "px-4 py-3 justify-center" : "px-6 py-3", isActive(`/dashboard/${companyId}/quick-ratio`) && "bg-slate-800 border-l-4 border-blue-500")} title={collapsed ? "Quick Ratio" : undefined}>
            <Zap className="h-4 w-4" />
            {!collapsed && <span className="ml-3 text-sm">Quick Ratio</span>}
          </Link>
        </div>
      </nav>
    </aside>
  )
}

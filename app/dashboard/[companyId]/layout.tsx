'use client'

import { Sidebar } from '@/components/Sidebar'
import { useSidebarStore } from '@/lib/stores/sidebarStore'
import { use } from 'react'

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ companyId: string }>
}) {
  const { companyId } = use(params)
  const collapsed = useSidebarStore(state => state.collapsed)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar companyId={companyId} />
      <main className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-56'}`}>
        {children}
      </main>
    </div>
  )
}

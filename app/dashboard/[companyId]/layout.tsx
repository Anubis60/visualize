'use client'

import { Sidebar } from '@/components/Sidebar'
import { DashboardHeader } from '@/components/DashboardHeader'
import { useSidebarStore } from '@/lib/stores/sidebarStore'
// import SubscriptionModal from '@/components/SubscriptionModal' // TODO: Uncomment when ready to add subscription gating
import { AnalyticsProvider } from '@/lib/contexts/AnalyticsContext'
import { use, useEffect, useState } from 'react'

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ companyId: string }>
}) {
  const { companyId } = use(params)
  const collapsed = useSidebarStore(state => state.collapsed)
  // const [showSubscriptionModal, setShowSubscriptionModal] = useState(false) // TODO: Uncomment when ready for subscription gating
  // const [userId, setUserId] = useState<string | null>(null) // TODO: Uncomment when ready for subscription gating
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function initializeDashboard() {
      try {
        /* TODO: Uncomment when Whop SDK is updated with webhook methods

        // Register webhook for this company (if not already registered)
        fetch('/api/webhooks/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyId }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              console.log('[Dashboard] Webhook registration:', data.alreadyRegistered ? 'Already exists' : 'Created + Backfill started');
            } else {
              console.error('[Dashboard] Webhook registration failed:', data.error);
            }
          })
          .catch((error) => {
            console.error('[Dashboard] Webhook registration error:', error);
          });

        */

        /* TODO: Uncomment when ready for subscription gating

        // Get userId from Whop's window context (provided by Whop SDK)
        const whopContext = (window as typeof window & { __WHOP__?: { userId?: string } }).__WHOP__
        const whopUserId = whopContext?.userId || companyId
        setUserId(whopUserId)

        // Check subscription status by companyId
        const subscriptionResponse = await fetch(`/api/subscription/check?companyId=${companyId}`)
        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json() as { hasAccess: boolean }

          // Show modal if user doesn't have access
          if (!subscriptionData.hasAccess) {
            setShowSubscriptionModal(true)
          }
        }

        */
      } catch {
        // Error checking subscription
      } finally {
        setLoading(false)
      }
    }

    initializeDashboard()
  }, [companyId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <AnalyticsProvider companyId={companyId}>
      <div className="flex min-h-screen bg-gray-50">
        {/* TODO: Uncomment when ready for subscription gating

        {showSubscriptionModal && userId && (
          <SubscriptionModal userId={userId} companyId={companyId} />
        )}

        */}

        {/* Main Dashboard - no blur/gating for now */}
        <div className="w-full flex">
          <Sidebar companyId={companyId} />
          <div className="flex-1 flex flex-col">
            <DashboardHeader companyId={companyId} />
            <main className={`flex-1 transition-all duration-300 pt-20 ${collapsed ? 'ml-16' : 'ml-48'}`}>
              {children}
            </main>
          </div>
        </div>
      </div>
    </AnalyticsProvider>
  )
}

import { MetricsSnapshot } from '@/lib/db/models/MetricsSnapshot'
import type { MembershipListResponse } from '@whop/sdk/resources/memberships'

/**
 * MRR Movement Calculations
 *
 * These functions compare previous and current snapshots to calculate
 * MRR movements (Expansion, Contraction, Churn, New, Reactivation)
 *
 * Based on README.md implementation guidelines
 */

interface RawMembership {
  id: string
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'completed' | 'expired'
  createdAt: number
  canceledAt: number | null
  expiresAt: number | null
  cancelationReason: string | null
  totalSpend: number
  plan?: { id: string }
  accessPass: undefined
  member: { id: string; email: string; username: string; name: string | null } | null
  promoCode: MembershipListResponse['promo_code']
}

interface RawPlan {
  id: string
  rawRenewalPrice: number
  rawInitialPrice: number
  billingPeriod: number | null
  planType: 'one_time' | 'renewal'
  baseCurrency: string
  description: string | null
  accessPass: { id: string; title: string } | null
  createdAt: number
  updatedAt: number
  visibility: string
  releaseMethod: string
}

/**
 * Normalize plan price to monthly amount
 * From README: billing_period is in DAYS
 */
function normalizeToMonthly(price: number, billingPeriodDays: number): number {
  if (billingPeriodDays === 30) return price // Monthly
  if (billingPeriodDays === 365) return price / 12 // Annual
  if (billingPeriodDays === 90) return price / 3 // Quarterly
  // Custom periods: convert days to months
  return (price / billingPeriodDays) * 30
}

/**
 * Calculate monthly MRR amount for a membership
 */
function getMembershipMRR(
  membership: RawMembership,
  planMap: Map<string, RawPlan>
): number {
  const plan = planMap.get(membership.plan?.id || '')
  if (!plan || plan.planType !== 'renewal' || !plan.billingPeriod) return 0

  return normalizeToMonthly(plan.rawRenewalPrice, plan.billingPeriod)
}

/**
 * Calculate Expansion MRR
 * Revenue gained from existing customers upgrading their plans
 */
export function calculateExpansionMRR(
  previousSnapshot: MetricsSnapshot | null,
  currentMemberships: RawMembership[],
  currentPlans: RawPlan[]
): { total: number; rate: number; customers: number } {
  if (!previousSnapshot?.rawData?.memberships || !previousSnapshot?.rawData?.plans) {
    return { total: 0, rate: 0, customers: 0 }
  }

  const previousMemberships = previousSnapshot.rawData.memberships as RawMembership[]
  const previousPlans = previousSnapshot.rawData.plans as RawPlan[]

  // Create plan lookups
  const previousPlanMap = new Map(previousPlans.map(p => [p.id, p]))
  const currentPlanMap = new Map(currentPlans.map(p => [p.id, p]))

  // Create membership lookup by ID
  const previousMembershipMap = new Map(
    previousMemberships.map(m => [m.id, m])
  )

  let expansionMRR = 0
  const expandedCustomers = new Set<string>()

  // Check each current membership
  for (const currentMembership of currentMemberships) {
    const previousMembership = previousMembershipMap.get(currentMembership.id)

    // Must exist in both snapshots and be active
    if (!previousMembership) continue
    if (currentMembership.status !== 'active' && currentMembership.status !== 'completed') continue

    const previousMRR = getMembershipMRR(previousMembership, previousPlanMap)
    const currentMRR = getMembershipMRR(currentMembership, currentPlanMap)

    // Expansion = current MRR > previous MRR
    if (currentMRR > previousMRR) {
      expansionMRR += (currentMRR - previousMRR)
      const customerId = currentMembership.member?.id
      if (customerId) expandedCustomers.add(customerId)
    }
  }

  const previousMRR = previousSnapshot.mrr.total
  const rate = previousMRR > 0 ? (expansionMRR / previousMRR) * 100 : 0

  return {
    total: expansionMRR,
    rate,
    customers: expandedCustomers.size
  }
}

/**
 * Calculate Contraction MRR
 * Revenue lost from existing customers downgrading their plans
 */
export function calculateContractionMRR(
  previousSnapshot: MetricsSnapshot | null,
  currentMemberships: RawMembership[],
  currentPlans: RawPlan[]
): { total: number; rate: number; customers: number } {
  if (!previousSnapshot?.rawData?.memberships || !previousSnapshot?.rawData?.plans) {
    return { total: 0, rate: 0, customers: 0 }
  }

  const previousMemberships = previousSnapshot.rawData.memberships as RawMembership[]
  const previousPlans = previousSnapshot.rawData.plans as RawPlan[]

  const previousPlanMap = new Map(previousPlans.map(p => [p.id, p]))
  const currentPlanMap = new Map(currentPlans.map(p => [p.id, p]))

  const previousMembershipMap = new Map(
    previousMemberships.map(m => [m.id, m])
  )

  let contractionMRR = 0
  const contractedCustomers = new Set<string>()

  for (const currentMembership of currentMemberships) {
    const previousMembership = previousMembershipMap.get(currentMembership.id)

    if (!previousMembership) continue
    if (currentMembership.status !== 'active' && currentMembership.status !== 'completed') continue

    const previousMRR = getMembershipMRR(previousMembership, previousPlanMap)
    const currentMRR = getMembershipMRR(currentMembership, currentPlanMap)

    // Contraction = current MRR < previous MRR
    if (currentMRR < previousMRR && currentMRR > 0) {
      contractionMRR += (previousMRR - currentMRR)
      const customerId = currentMembership.member?.id
      if (customerId) contractedCustomers.add(customerId)
    }
  }

  const previousMRR = previousSnapshot.mrr.total
  const rate = previousMRR > 0 ? (contractionMRR / previousMRR) * 100 : 0

  return {
    total: contractionMRR,
    rate,
    customers: contractedCustomers.size
  }
}

/**
 * Calculate Churned MRR
 * Revenue lost from customers who canceled their subscriptions
 */
export function calculateChurnedMRR(
  previousSnapshot: MetricsSnapshot | null,
  currentMemberships: RawMembership[]
): { total: number; rate: number; customers: number } {
  if (!previousSnapshot?.rawData?.memberships || !previousSnapshot?.rawData?.plans) {
    return { total: 0, rate: 0, customers: 0 }
  }

  const previousMemberships = previousSnapshot.rawData.memberships as RawMembership[]
  const previousPlans = previousSnapshot.rawData.plans as RawPlan[]

  const previousPlanMap = new Map(previousPlans.map(p => [p.id, p]))

  // Get currently active membership IDs
  const currentActiveMembershipIds = new Set(
    currentMemberships
      .filter(m => m.status === 'active' || m.status === 'completed' || m.status === 'trialing')
      .map(m => m.id)
  )

  let churnedMRR = 0
  const churnedCustomers = new Set<string>()

  // Find memberships that were active before but aren't now
  for (const previousMembership of previousMemberships) {
    const wasActive = previousMembership.status === 'active' ||
                     previousMembership.status === 'completed' ||
                     previousMembership.status === 'trialing'

    if (!wasActive) continue

    // If membership is no longer active, it churned
    if (!currentActiveMembershipIds.has(previousMembership.id)) {
      const mrr = getMembershipMRR(previousMembership, previousPlanMap)
      churnedMRR += mrr
      const customerId = previousMembership.member?.id
      if (customerId) churnedCustomers.add(customerId)
    }
  }

  const previousMRR = previousSnapshot.mrr.total
  const rate = previousMRR > 0 ? (churnedMRR / previousMRR) * 100 : 0

  return {
    total: churnedMRR,
    rate,
    customers: churnedCustomers.size
  }
}

/**
 * Calculate New MRR
 * Revenue from brand new customers (first membership ever)
 */
export function calculateNewMRR(
  currentMemberships: RawMembership[],
  currentPlans: RawPlan[]
): { total: number; customers: number; growth: number } {
  const currentPlanMap = new Map(currentPlans.map(p => [p.id, p]))

  // Group memberships by user
  const userMemberships = new Map<string, RawMembership[]>()
  for (const membership of currentMemberships) {
    const userId = membership.member?.id
    if (!userId) continue

    if (!userMemberships.has(userId)) {
      userMemberships.set(userId, [])
    }
    userMemberships.get(userId)!.push(membership)
  }

  let newMRR = 0
  let newCustomers = 0

  // For each user, find their first membership
  for (const memberships of userMemberships.values()) {
    // Sort by created_at to find first membership
    const sorted = memberships.sort((a, b) => {
      const aTime = a.createdAt || 0
      const bTime = b.createdAt || 0
      return aTime - bTime
    })

    const firstMembership = sorted[0]

    // Check if this is a NEW customer (first membership is recent)
    // Consider "new" if first membership was created in last 30 days
    const thirtyDaysAgo = (Date.now() / 1000) - (30 * 24 * 60 * 60)
    const isNew = (firstMembership.createdAt || 0) > thirtyDaysAgo

    if (isNew && (firstMembership.status === 'active' || firstMembership.status === 'completed')) {
      const mrr = getMembershipMRR(firstMembership, currentPlanMap)
      newMRR += mrr
      newCustomers++
    }
  }

  return {
    total: newMRR,
    customers: newCustomers,
    growth: 0 // TODO: Calculate growth vs previous period
  }
}

/**
 * Calculate Reactivation MRR
 * Revenue from customers who previously churned and returned
 */
export function calculateReactivationMRR(
  previousSnapshot: MetricsSnapshot | null,
  currentMemberships: RawMembership[],
  currentPlans: RawPlan[]
): { total: number; revenue: number } {
  if (!previousSnapshot?.rawData?.memberships) {
    return { total: 0, revenue: 0 }
  }

  const previousMemberships = previousSnapshot.rawData.memberships as RawMembership[]
  const currentPlanMap = new Map(currentPlans.map(p => [p.id, p]))

  // Find users who had canceled memberships before
  const previouslyCanceledUsers = new Set<string>()
  for (const prevMembership of previousMemberships) {
    if (prevMembership.status === 'canceled' || prevMembership.status === 'expired') {
      const userId = prevMembership.member?.id
      if (userId) previouslyCanceledUsers.add(userId)
    }
  }

  // Group current memberships by user
  const userMemberships = new Map<string, RawMembership[]>()
  for (const membership of currentMemberships) {
    const userId = membership.member?.id
    if (!userId) continue

    if (!userMemberships.has(userId)) {
      userMemberships.set(userId, [])
    }
    userMemberships.get(userId)!.push(membership)
  }

  let reactivationMRR = 0
  let reactivatedCount = 0

  // Check if previously canceled users are now active
  for (const userId of previouslyCanceledUsers) {
    const userCurrentMemberships = userMemberships.get(userId) || []
    const hasActiveMembership = userCurrentMemberships.some(
      m => m.status === 'active' || m.status === 'completed'
    )

    if (hasActiveMembership) {
      // Sum MRR from all active memberships for this reactivated user
      for (const membership of userCurrentMemberships) {
        if (membership.status === 'active' || membership.status === 'completed') {
          const mrr = getMembershipMRR(membership, currentPlanMap)
          reactivationMRR += mrr
        }
      }
      reactivatedCount++
    }
  }

  return {
    total: reactivatedCount,
    revenue: reactivationMRR
  }
}

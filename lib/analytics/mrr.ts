import { Membership, MRRData } from '@/lib/types/analytics'

/**
 * Normalizes a plan price to monthly recurring revenue
 */
export function normalizePriceToMonthly(price: number, billingPeriod: string): number {
  const priceInDollars = price / 100 // Whop uses cents

  switch (billingPeriod) {
    case 'month':
      return priceInDollars
    case 'year':
      return priceInDollars / 12
    case 'quarter':
      return priceInDollars / 3
    case 'week':
      return priceInDollars * 4.33 // Average weeks per month
    case 'day':
      return priceInDollars * 30
    case 'lifetime':
      return 0 // Lifetime deals don't contribute to MRR
    default:
      return priceInDollars
  }
}

/**
 * Calculates total MRR from active memberships
 */
export function calculateMRR(memberships: Membership[]): MRRData {
  const breakdown = {
    monthly: 0,
    annual: 0,
    quarterly: 0,
    other: 0,
  }

  const activeMemberships = memberships.filter(m => {
    // Whop uses "completed" status for active memberships
    // Active = completed + not cancelled + not expired
    const now = Date.now() / 1000 // Convert to seconds for Whop timestamps
    const isActive = m.status === 'completed' &&
                     m.canceledAt === null &&
                     (m.expiresAt === null || m.expiresAt > now)
    return isActive && m.plan
  })

  // Note: Whop SDK only returns plan.id, not price/billing_period
  // We need to fetch plan details separately to calculate MRR
  // For now, MRR will be 0 until we implement plan fetching

  activeMemberships.forEach(membership => {
    if (!membership.plan) return
    // TODO: Fetch plan details and calculate MRR
  })

  const total = breakdown.monthly + breakdown.annual + breakdown.quarterly + breakdown.other

  return {
    total,
    breakdown,
  }
}

/**
 * Calculates Annual Run Rate (ARR)
 */
export function calculateARR(mrr: number): number {
  return mrr * 12
}

/**
 * Calculates Average Revenue Per User (ARPU)
 */
export function calculateARPU(mrr: number, activeSubscribers: number): number {
  if (activeSubscribers === 0) return 0
  return mrr / activeSubscribers
}

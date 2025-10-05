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
    return isActive && m.planData
  })

  console.log('\n=== MRR Calculation ===')
  console.log(`Total active memberships with plan data: ${activeMemberships.length}`)

  activeMemberships.forEach(membership => {
    const planData = membership.planData
    if (!planData) return

    // Skip one-time or free plans
    if (planData.planType === 'one_time' || planData.rawRenewalPrice === 0) {
      console.log(`Skipping ${planData.title}: ${planData.planType}, $${planData.rawRenewalPrice}`)
      return
    }

    // Calculate monthly recurring revenue
    const price = planData.rawRenewalPrice // Already in dollars
    const billingPeriod = planData.billingPeriod || 30 // Default to 30 days

    // Normalize to monthly (30 days)
    const monthlyRevenue = (price / billingPeriod) * 30

    console.log(`${planData.title}: $${price} / ${billingPeriod} days = $${monthlyRevenue.toFixed(2)}/month`)

    // Categorize by billing period
    if (billingPeriod === 30) {
      breakdown.monthly += monthlyRevenue
    } else if (billingPeriod === 365) {
      breakdown.annual += monthlyRevenue
    } else if (billingPeriod === 90) {
      breakdown.quarterly += monthlyRevenue
    } else {
      breakdown.other += monthlyRevenue
    }
  })

  const total = breakdown.monthly + breakdown.annual + breakdown.quarterly + breakdown.other

  console.log('\nMRR Breakdown:')
  console.log(`  Monthly: $${breakdown.monthly.toFixed(2)}`)
  console.log(`  Annual: $${breakdown.annual.toFixed(2)}`)
  console.log(`  Quarterly: $${breakdown.quarterly.toFixed(2)}`)
  console.log(`  Other: $${breakdown.other.toFixed(2)}`)
  console.log(`  TOTAL MRR: $${total.toFixed(2)}`)
  console.log('======================\n')

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

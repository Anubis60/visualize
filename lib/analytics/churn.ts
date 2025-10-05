import { Membership, ChurnMetrics } from '@/lib/types/analytics'
import { normalizePriceToMonthly } from './mrr'

/**
 * Calculates churn metrics for a given period
 */
export function calculateChurnMetrics(
  currentMemberships: Membership[],
  previousMemberships: Membership[]
): ChurnMetrics {
  // Get churned users (in previous period but not in current)
  const currentUserIds = new Set(
    currentMemberships
      .filter(m => m.status === 'active' && m.valid)
      .map(m => m.user_id)
  )

  const previousActiveUsers = previousMemberships.filter(
    m => m.status === 'active' && m.valid
  )

  const churnedUsers = previousActiveUsers.filter(
    m => !currentUserIds.has(m.user_id)
  )

  // Calculate customer churn rate
  const previousActiveCount = previousActiveUsers.length
  const customerChurnRate = previousActiveCount > 0
    ? (churnedUsers.length / previousActiveCount) * 100
    : 0

  // Calculate revenue churn
  const previousMRR = previousActiveUsers.reduce((sum, m) => {
    if (!m.plan) return sum
    return sum + normalizePriceToMonthly(m.plan.price, m.plan.billing_period)
  }, 0)

  const churnedMRR = churnedUsers.reduce((sum, m) => {
    if (!m.plan) return sum
    return sum + normalizePriceToMonthly(m.plan.price, m.plan.billing_period)
  }, 0)

  const revenueChurnRate = previousMRR > 0
    ? (churnedMRR / previousMRR) * 100
    : 0

  // Calculate current MRR for net revenue retention
  const currentMRR = currentMemberships
    .filter(m => m.status === 'active' && m.valid)
    .reduce((sum, m) => {
      if (!m.plan) return sum
      return sum + normalizePriceToMonthly(m.plan.price, m.plan.billing_period)
    }, 0)

  // Net Revenue Retention = ((Starting MRR + Expansion - Contraction - Churn) / Starting MRR) × 100
  const netRevenueRetention = previousMRR > 0
    ? (currentMRR / previousMRR) * 100
    : 100

  return {
    customerChurnRate,
    revenueChurnRate,
    netRevenueRetention,
  }
}

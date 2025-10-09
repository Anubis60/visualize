import { Membership, ChurnMetrics } from '@/lib/types/analytics'

/**
 * Calculates churn metrics for a given period
 */
export function calculateChurnMetrics(
  currentMemberships: Membership[],
  previousMemberships: Membership[]
): ChurnMetrics {
  const now = Date.now() / 1000

  // Helper to check if membership is active
  const isActive = (m: Membership) =>
    (m.status === 'active' || m.status === 'completed') &&
    m.canceledAt === null &&
    (!m.expiresAt || m.expiresAt > now)

  // Get churned users (in previous period but not in current)
  const currentUserIds = new Set(
    currentMemberships
      .filter(m => isActive(m) && m.member)
      .map(m => m.member!.id)
  )

  const previousActiveUsers = previousMemberships.filter(m => isActive(m) && m.member)

  const churnedUsers = previousActiveUsers.filter(
    m => !currentUserIds.has(m.member!.id)
  )

  // Calculate customer churn rate
  const previousActiveCount = previousActiveUsers.length
  const customerChurnRate = previousActiveCount > 0
    ? (churnedUsers.length / previousActiveCount) * 100
    : 0

  // Note: Revenue churn requires plan price data which we don't have yet
  const revenueChurnRate = 0
  const netRevenueRetention = 100

  return {
    customerChurnRate,
    revenueChurnRate,
    netRevenueRetention,
  }
}

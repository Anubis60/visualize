import { Membership, SubscriberMetrics } from '@/lib/types/analytics'

/**
 * Calculates subscriber counts by status
 */
export function calculateSubscriberMetrics(memberships: Membership[]): SubscriberMetrics {
  const metrics: SubscriberMetrics = {
    active: 0,
    cancelled: 0,
    past_due: 0,
    trialing: 0,
    total: 0,
  }

  const now = Date.now() / 1000 // Convert to seconds for Whop timestamps

  memberships.forEach(membership => {
    const isActive = (membership.status === 'active' || membership.status === 'completed') &&
                     membership.canceledAt === null &&
                     (!membership.expiresAt || membership.expiresAt > now)

    if (isActive) {
      metrics.active++
    } else if (membership.status === 'canceled' || membership.canceledAt !== null) {
      metrics.cancelled++
    } else if (membership.status === 'trialing') {
      metrics.trialing++
    } else if (membership.status === 'past_due') {
      metrics.past_due++
    }
  })

  metrics.total = metrics.active + metrics.cancelled + metrics.past_due + metrics.trialing

  return metrics
}

/**
 * Gets unique subscriber count (by member.id)
 */
export function getUniqueSubscriberCount(memberships: Membership[]): number {
  const uniqueUsers = new Set(memberships.filter(m => m.member).map(m => m.member!.id))
  return uniqueUsers.size
}

/**
 * Gets active unique subscribers
 */
export function getActiveUniqueSubscribers(memberships: Membership[]): number {
  const now = Date.now() / 1000

  const activeUsers = new Set(
    memberships
      .filter(m => {
        const isActive = (m.status === 'active' || m.status === 'completed') &&
                         m.canceledAt === null &&
                         (!m.expiresAt || m.expiresAt > now)
        return isActive && m.member
      })
      .map(m => m.member!.id)
  )
  return activeUsers.size
}

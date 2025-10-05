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

  memberships.forEach(membership => {
    if (membership.status === 'active' && membership.valid) {
      metrics.active++
    } else if (membership.status === 'cancelled') {
      metrics.cancelled++
    } else if (membership.status === 'past_due') {
      metrics.past_due++
    } else if (membership.status === 'trialing') {
      metrics.trialing++
    }
  })

  metrics.total = metrics.active + metrics.cancelled + metrics.past_due + metrics.trialing

  return metrics
}

/**
 * Gets unique subscriber count (by user_id)
 */
export function getUniqueSubscriberCount(memberships: Membership[]): number {
  const uniqueUsers = new Set(memberships.map(m => m.user_id))
  return uniqueUsers.size
}

/**
 * Gets active unique subscribers
 */
export function getActiveUniqueSubscribers(memberships: Membership[]): number {
  const activeUsers = new Set(
    memberships
      .filter(m => m.status === 'active' && m.valid)
      .map(m => m.user_id)
  )
  return activeUsers.size
}

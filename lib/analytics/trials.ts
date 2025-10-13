/**
 * Trial and Conversion Analytics
 * Tracks free trials, trial conversions, and sales cycle metrics
 */

import { Membership } from '@/lib/types/analytics'
import { Payment } from './transactions'

export interface TrialMetrics {
  totalTrials: number
  activeTrials: number
  convertedTrials: number
  conversionRate: number
}

export interface SalesCycleMetrics {
  averageDaysToConversion: number
  medianDaysToConversion: number
  shortestCycle: number
  longestCycle: number
}

/**
 * Calculate trial metrics from memberships
 */
export function calculateTrialMetrics(memberships: Membership[]): TrialMetrics {
  // Trials are memberships with status "trialing"
  const trials = memberships.filter(m => m.status === 'trialing')
  const totalTrials = trials.length
  const activeTrials = trials.filter(m => !m.canceledAt).length

  // Converted trials: memberships that were trialing and are now active/completed
  // We can infer this from memberships that have status active/completed and were created recently
  const convertedTrials = memberships.filter(m =>
    (m.status === 'active' || m.status === 'completed') &&
    m.totalSpend > 0
  ).length

  const conversionRate = totalTrials > 0 ? (convertedTrials / totalTrials) * 100 : 0

  return {
    totalTrials,
    activeTrials,
    convertedTrials,
    conversionRate,
  }
}

/**
 * Calculate average sales cycle length (time from signup to first payment)
 */
export function calculateSalesCycleLength(
  memberships: Membership[],
  payments: Payment[]
): SalesCycleMetrics {
  const cyclesInDays: number[] = []

  // For each membership, find their first payment
  memberships.forEach(membership => {
    const firstPayment = payments
      .filter(p => p.membership.id === membership.id && p.status === 'paid')
      .sort((a, b) => a.paid_at! - b.paid_at!)[0]

    if (firstPayment && firstPayment.paid_at) {
      // Calculate days between membership creation and first payment
      const daysToConversion = (firstPayment.paid_at - membership.createdAt) / (60 * 60 * 24)
      if (daysToConversion >= 0) {
        cyclesInDays.push(daysToConversion)
      }
    }
  })

  if (cyclesInDays.length === 0) {
    return {
      averageDaysToConversion: 0,
      medianDaysToConversion: 0,
      shortestCycle: 0,
      longestCycle: 0,
    }
  }

  // Sort for median calculation
  const sorted = cyclesInDays.sort((a, b) => a - b)
  const average = cyclesInDays.reduce((sum, val) => sum + val, 0) / cyclesInDays.length
  const median = sorted[Math.floor(sorted.length / 2)]

  return {
    averageDaysToConversion: Math.round(average * 10) / 10,
    medianDaysToConversion: Math.round(median * 10) / 10,
    shortestCycle: Math.round(sorted[0] * 10) / 10,
    longestCycle: Math.round(sorted[sorted.length - 1] * 10) / 10,
  }
}

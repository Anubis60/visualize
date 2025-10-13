/**
 * Customer Lifetime Value Analytics
 * Calculates CLV, average order value, and customer spending metrics
 */

import { Membership } from '@/lib/types/analytics'
import { Payment } from './transactions'

export interface CustomerLifetimeMetrics {
  averageCLV: number
  medianCLV: number
  totalCustomers: number
  totalLifetimeRevenue: number
}

export interface OrderMetrics {
  averageOrderValue: number
  totalOrders: number
  customersWithOrders: number
  averageOrdersPerCustomer: number
}

/**
 * Calculate Customer Lifetime Value metrics
 * CLV = total amount a customer has spent with the company
 */
export function calculateCustomerLifetimeValue(memberships: Membership[]): CustomerLifetimeMetrics {
  // Group memberships by customer (member.id)
  const customerSpending = new Map<string, number>()

  memberships.forEach(m => {
    if (m.member?.id) {
      const currentSpend = customerSpending.get(m.member.id) || 0
      customerSpending.set(m.member.id, currentSpend + m.totalSpend)
    }
  })

  const clvValues = Array.from(customerSpending.values()).filter(v => v > 0)

  if (clvValues.length === 0) {
    return {
      averageCLV: 0,
      medianCLV: 0,
      totalCustomers: 0,
      totalLifetimeRevenue: 0,
    }
  }

  const totalLifetimeRevenue = clvValues.reduce((sum, val) => sum + val, 0)
  const averageCLV = totalLifetimeRevenue / clvValues.length

  // Calculate median
  const sorted = clvValues.sort((a, b) => a - b)
  const medianCLV = sorted[Math.floor(sorted.length / 2)]

  return {
    averageCLV,
    medianCLV,
    totalCustomers: clvValues.length,
    totalLifetimeRevenue,
  }
}

/**
 * Calculate average order value and order metrics
 */
export function calculateOrderMetrics(
  payments: Payment[]
): OrderMetrics {
  const successfulPayments = payments.filter(p => p.status === 'paid' && p.substatus === 'succeeded')

  if (successfulPayments.length === 0) {
    return {
      averageOrderValue: 0,
      totalOrders: 0,
      customersWithOrders: 0,
      averageOrdersPerCustomer: 0,
    }
  }

  const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.total, 0)
  const averageOrderValue = totalRevenue / successfulPayments.length

  // Count unique customers with orders
  const customersWithOrders = new Set(successfulPayments.map(p => p.user.id)).size
  const averageOrdersPerCustomer = successfulPayments.length / customersWithOrders

  return {
    averageOrderValue,
    totalOrders: successfulPayments.length,
    customersWithOrders,
    averageOrdersPerCustomer,
  }
}

/**
 * Calculate average spend per customer (for non-subscription customers)
 */
export function calculateAverageSpendPerCustomer(
  payments: Payment[],
  oneTimeCustomers: Set<string>
): number {
  const oneTimePayments = payments.filter(p =>
    p.status === 'paid' &&
    p.substatus === 'succeeded' &&
    oneTimeCustomers.has(p.user.id)
  )

  if (oneTimePayments.length === 0) return 0

  const totalRevenue = oneTimePayments.reduce((sum, p) => sum + p.total, 0)
  return totalRevenue / oneTimeCustomers.size
}

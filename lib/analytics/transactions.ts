/**
 * Transaction and Payment Analytics
 * Calculates cash flow, payments, refunds, and other transaction metrics
 */

export interface Payment {
  id: string
  status: 'paid' | 'failed' | 'pending'
  substatus: 'succeeded' | 'refunded' | 'failed'
  created_at: number
  paid_at: number | null
  refunded_at: number | null
  total: number
  subtotal: number
  refunded_amount: number
  amount_after_fees: number
  billing_reason: string
  plan: { id: string }
  membership: { id: string; status: string }
  user: { id: string }
}

export interface CashFlowMetrics {
  grossCashFlow: number // Total revenue before fees
  netCashFlow: number // Revenue after fees
  nonRecurringCashFlow: number // One-time payment revenue
  recurringCashFlow: number // Subscription revenue
}

export interface PaymentMetrics {
  successfulPayments: number
  failedPayments: number
  totalPayments: number
  successRate: number
}

export interface RefundMetrics {
  totalRefunds: number
  refundedAmount: number
  refundRate: number
}

/**
 * Calculate cash flow metrics from payments
 */
export function calculateCashFlow(payments: Payment[]): CashFlowMetrics {
  const paidPayments = payments.filter(p => p.status === 'paid' && p.substatus === 'succeeded')

  const grossCashFlow = paidPayments.reduce((sum, p) => sum + p.total, 0)
  const netCashFlow = paidPayments.reduce((sum, p) => sum + p.amount_after_fees, 0)

  // Non-recurring = "Subscription creation" only
  const nonRecurringPayments = paidPayments.filter(p => p.billing_reason === 'Subscription creation')
  const nonRecurringCashFlow = nonRecurringPayments.reduce((sum, p) => sum + p.total, 0)

  // Recurring = "Subscription renewal"
  const recurringPayments = paidPayments.filter(p => p.billing_reason === 'Subscription renewal')
  const recurringCashFlow = recurringPayments.reduce((sum, p) => sum + p.total, 0)

  return {
    grossCashFlow,
    netCashFlow,
    nonRecurringCashFlow,
    recurringCashFlow,
  }
}

/**
 * Calculate payment success metrics
 */
export function calculatePaymentMetrics(payments: Payment[]): PaymentMetrics {
  const successfulPayments = payments.filter(p => p.status === 'paid' && p.substatus === 'succeeded').length
  const failedPayments = payments.filter(p => p.status === 'failed').length
  const totalPayments = payments.length

  const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0

  return {
    successfulPayments,
    failedPayments,
    totalPayments,
    successRate,
  }
}

/**
 * Calculate refund metrics
 */
export function calculateRefundMetrics(payments: Payment[]): RefundMetrics {
  const refundedPayments = payments.filter(p => p.refunded_amount > 0 || p.substatus === 'refunded')

  const totalRefunds = refundedPayments.length
  const refundedAmount = refundedPayments.reduce((sum, p) => sum + p.refunded_amount, 0)

  const totalPaidPayments = payments.filter(p => p.status === 'paid').length
  const refundRate = totalPaidPayments > 0 ? (totalRefunds / totalPaidPayments) * 100 : 0

  return {
    totalRefunds,
    refundedAmount,
    refundRate,
  }
}

/**
 * Calculate average sale price (average payment amount)
 */
export function calculateAverageSalePrice(payments: Payment[]): number {
  const paidPayments = payments.filter(p => p.status === 'paid' && p.substatus === 'succeeded')

  if (paidPayments.length === 0) return 0

  const totalRevenue = paidPayments.reduce((sum, p) => sum + p.total, 0)
  return totalRevenue / paidPayments.length
}

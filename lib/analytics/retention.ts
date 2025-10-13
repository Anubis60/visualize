/**
 * Retention and Churn Analytics for MRR
 * Calculates net/gross MRR churn rates and retention rates
 */

export interface HistoricalMRRData {
  date: string
  mrr: number
  newMRR: number
  churnedMRR: number
  expansionMRR: number
  contractionMRR: number
}

export interface MRRChurnMetrics {
  grossMRRChurnRate: number // % of MRR lost from cancellations
  netMRRChurnRate: number // Gross churn - expansion
  grossMRRRetention: number // % of MRR retained
  netMRRRetention: number // % including expansion
}

/**
 * Calculate MRR churn and retention rates
 * Requires historical MRR data to compare periods
 */
export function calculateMRRChurnMetrics(
  previousPeriodMRR: number,
  currentPeriodMRR: number,
  churnedMRR: number,
  expansionMRR: number,
  contractionMRR: number
): MRRChurnMetrics {
  if (previousPeriodMRR === 0) {
    return {
      grossMRRChurnRate: 0,
      netMRRChurnRate: 0,
      grossMRRRetention: 100,
      netMRRRetention: 100,
    }
  }

  // Gross churn = churned MRR / starting MRR
  const grossMRRChurnRate = (churnedMRR / previousPeriodMRR) * 100

  // Net churn = (churned + contraction - expansion) / starting MRR
  const netChurnAmount = churnedMRR + contractionMRR - expansionMRR
  const netMRRChurnRate = (netChurnAmount / previousPeriodMRR) * 100

  // Gross retention = 100% - gross churn rate
  const grossMRRRetention = 100 - grossMRRChurnRate

  // Net retention = (starting MRR - churned MRR + expansion - contraction) / starting MRR * 100
  const retainedMRR = previousPeriodMRR - churnedMRR + expansionMRR - contractionMRR
  const netMRRRetention = (retainedMRR / previousPeriodMRR) * 100

  return {
    grossMRRChurnRate: Math.max(0, grossMRRChurnRate),
    netMRRChurnRate,
    grossMRRRetention: Math.max(0, Math.min(100, grossMRRRetention)),
    netMRRRetention,
  }
}

/**
 * Calculate quantity churn rate (subscriber count churn)
 */
export function calculateQuantityChurnRate(
  previousPeriodSubscribers: number,
  currentPeriodSubscribers: number,
  churnedSubscribers: number
): number {
  if (previousPeriodSubscribers === 0) return 0

  return (churnedSubscribers / previousPeriodSubscribers) * 100
}

import { getDatabase } from '../mongodb'
import { MetricsSnapshot, DailyMetrics } from '../models/MetricsSnapshot'
import { historicalMetricsRepository } from './HistoricalMetricsRepository'

export class MetricsRepository {
  private async getCollection() {
    const db = await getDatabase()
    return db.collection<MetricsSnapshot>('metrics_snapshots')
  }

  /**
   * Store a new metrics snapshot
   */
  async createSnapshot(snapshot: Omit<MetricsSnapshot, '_id'>): Promise<MetricsSnapshot> {
    const collection = await this.getCollection()
    const result = await collection.insertOne(snapshot as MetricsSnapshot)

    return {
      ...snapshot,
      _id: result.insertedId,
    } as MetricsSnapshot
  }

  /**
   * Insert a snapshot with precise timestamp (for webhook-triggered snapshots)
   * Multiple snapshots can exist for the same day with different timestamps
   */
  async insertSnapshot(companyId: string, snapshot: Omit<MetricsSnapshot, '_id' | 'companyId' | 'date' | 'timestamp'>): Promise<void> {
    const collection = await this.getCollection()
    const now = new Date()

    await collection.insertOne({
      ...snapshot,
      companyId,
      date: now,
      timestamp: now,
    } as MetricsSnapshot)
  }

  /**
   * Upsert daily snapshot for backfilling (normalizes to midnight UTC)
   * Used only by backfill service to reconstruct historical data
   * If a snapshot already exists for a day, update it
   */
  async upsertDailySnapshotForBackfill(companyId: string, snapshot: Omit<MetricsSnapshot, '_id' | 'companyId' | 'date' | 'timestamp'>, snapshotDate?: Date): Promise<void> {
    const collection = await this.getCollection()

    // Use provided date or default to today
    const targetDate = snapshotDate ? new Date(snapshotDate) : new Date()
    targetDate.setUTCHours(0, 0, 0, 0)

    await collection.updateOne(
      {
        companyId,
        date: targetDate,
      },
      {
        $set: {
          ...snapshot,
          timestamp: new Date(),
        },
        $setOnInsert: {
          companyId,
          date: targetDate,
        }
      },
      { upsert: true }
    )
  }

  /**
   * Get historical snapshots for a date range
   */
  async getSnapshotsByDateRange(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MetricsSnapshot[]> {
    const collection = await this.getCollection()
    return collection
      .find({
        companyId,
        date: {
          $gte: startDate,
          $lte: endDate,
        }
      })
      .sort({ date: 1 })
      .toArray()
  }

  /**
   * Get daily aggregated snapshots (last snapshot of each day)
   * Used for chart display - handles multiple intraday snapshots
   */
  async getDailyAggregatedSnapshots(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MetricsSnapshot[]> {
    const collection = await this.getCollection()

    // MongoDB aggregation to get the last snapshot of each day
    const result = await collection.aggregate<MetricsSnapshot>([
      {
        $match: {
          companyId,
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $addFields: {
          dayOnly: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$date'
            }
          }
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: '$dayOnly',
          snapshot: { $first: '$$ROOT' }
        }
      },
      {
        $replaceRoot: { newRoot: '$snapshot' }
      },
      {
        $sort: { date: 1 }
      }
    ]).toArray()

    return result
  }

  /**
   * Get last N days of snapshots (daily aggregated - last snapshot per day)
   * Combines data from both live metrics_snapshots and historical_metrics_snapshots
   */
  async getRecentSnapshots(companyId: string, days: number = 30): Promise<MetricsSnapshot[]> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setUTCHours(0, 0, 0, 0)

    const endDate = new Date()
    endDate.setUTCHours(23, 59, 59, 999)

    // Fetch from both collections
    const [liveSnapshots, historicalSnapshots] = await Promise.all([
      this.getDailyAggregatedSnapshots(companyId, startDate, endDate),
      historicalMetricsRepository.getHistoricalSnapshots(companyId, startDate, endDate)
    ])

    // Merge and deduplicate by date (prefer live snapshots over historical for same date)
    const snapshotMap = new Map<string, MetricsSnapshot>()

    // Add historical first
    historicalSnapshots.forEach(snapshot => {
      const dateKey = new Date(snapshot.date).toISOString().split('T')[0]
      snapshotMap.set(dateKey, snapshot)
    })

    // Override with live snapshots (they're more up-to-date)
    liveSnapshots.forEach(snapshot => {
      const dateKey = new Date(snapshot.date).toISOString().split('T')[0]
      snapshotMap.set(dateKey, snapshot)
    })

    // Sort by date
    return Array.from(snapshotMap.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }

  /**
   * Get latest snapshot for a company
   */
  async getLatestSnapshot(companyId: string): Promise<MetricsSnapshot | null> {
    const collection = await this.getCollection()
    return collection
      .find({ companyId })
      .sort({ date: -1 })
      .limit(1)
      .next()
  }

  /**
   * Get the previous day's snapshot (for calculating MRR movements)
   * Returns the snapshot from yesterday (or most recent before today)
   */
  async getPreviousSnapshot(companyId: string): Promise<MetricsSnapshot | null> {
    const collection = await this.getCollection()

    // Get today's date at midnight UTC
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    // Find the most recent snapshot before today
    return collection
      .find({
        companyId,
        date: { $lt: today }
      })
      .sort({ date: -1 })
      .limit(1)
      .next()
  }

  /**
   * Get the most recent snapshot with raw data (for fast loading without API calls)
   * Returns null if no snapshot exists or if the snapshot doesn't have raw data
   */
  async getLatestSnapshotWithRawData(companyId: string): Promise<MetricsSnapshot | null> {
    const collection = await this.getCollection()
    return collection
      .find({
        companyId,
        'rawData': { $exists: true }
      })
      .sort({ date: -1 })
      .limit(1)
      .next()
  }

  /**
   * Check if a fresh snapshot exists (less than 24 hours old)
   */
  async hasFreshSnapshot(companyId: string): Promise<boolean> {
    const collection = await this.getCollection()
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const count = await collection.countDocuments({
      companyId,
      timestamp: { $gte: oneDayAgo }
    })

    return count > 0
  }

  /**
   * Get daily metrics formatted for charts with all available data points
   */
  async getDailyMetrics(companyId: string, days: number = 30): Promise<DailyMetrics[]> {
    const snapshots = await this.getRecentSnapshots(companyId, days)

    return snapshots.map(snapshot => ({
      date: snapshot.date.toISOString().split('T')[0], // YYYY-MM-DD
      mrr: snapshot.mrr.total,
      arr: snapshot.arr,
      activeSubscribers: snapshot.activeUniqueSubscribers,
      arpu: snapshot.arpu,
      revenue: snapshot.revenue?.total,
      netRevenue: snapshot.netRevenue?.total,
      newMRR: snapshot.newMRR?.total,
      expansionMRR: snapshot.expansionMRR?.total,
      contractionMRR: snapshot.contractionMRR?.total,
      churnedMRR: snapshot.churnedMRR?.total,
      activeCustomers: snapshot.activeCustomers?.total,
      newCustomers: snapshot.newCustomers?.total,
      upgrades: snapshot.upgrades?.total,
      downgrades: snapshot.downgrades?.total,
      reactivations: snapshot.reactivations?.total,
      cancellations: snapshot.cancellations?.total,
      trials: snapshot.trials?.total,
      clv: snapshot.clv?.average,
      cashFlow: snapshot.cashFlow?.net,
      successfulPayments: snapshot.payments?.successful,
      failedCharges: snapshot.failedCharges?.total,
      refunds: snapshot.refunds?.total,
      avgSalePrice: snapshot.avgSalePrice?.value,
      revenueChurnRate: snapshot.revenueChurnRate?.rate,
      customerChurnRate: snapshot.customerChurnRate?.rate,
      quickRatio: snapshot.quickRatio?.value,
    }))
  }

  /**
   * Get weekly aggregated metrics (averaged for each week)
   */
  async getWeeklyMetrics(companyId: string, weeks: number = 12): Promise<DailyMetrics[]> {
    const days = weeks * 7
    const snapshots = await this.getRecentSnapshots(companyId, days)

    // Group by week
    const weeklyGroups: Map<string, MetricsSnapshot[]> = new Map()

    snapshots.forEach(snapshot => {
      const date = new Date(snapshot.date)
      // Get Monday of the week
      const monday = new Date(date)
      monday.setDate(date.getDate() - date.getDay() + 1)
      const weekKey = monday.toISOString().split('T')[0]

      if (!weeklyGroups.has(weekKey)) {
        weeklyGroups.set(weekKey, [])
      }
      weeklyGroups.get(weekKey)!.push(snapshot)
    })

    // Average each week's metrics
    return Array.from(weeklyGroups.entries()).map(([weekStart, snapshots]) => {
      return {
        date: weekStart,
        mrr: this.avg(snapshots.map(s => s.mrr.total)),
        arr: this.avg(snapshots.map(s => s.arr)),
        activeSubscribers: Math.round(this.avg(snapshots.map(s => s.activeUniqueSubscribers))),
        arpu: this.avg(snapshots.map(s => s.arpu)),
        revenue: this.avg(snapshots.map(s => s.revenue?.total)),
        netRevenue: this.avg(snapshots.map(s => s.netRevenue?.total)),
        newMRR: this.avg(snapshots.map(s => s.newMRR?.total)),
        expansionMRR: this.avg(snapshots.map(s => s.expansionMRR?.total)),
        contractionMRR: this.avg(snapshots.map(s => s.contractionMRR?.total)),
        churnedMRR: this.avg(snapshots.map(s => s.churnedMRR?.total)),
        activeCustomers: Math.round(this.avg(snapshots.map(s => s.activeCustomers?.total)) || 0),
        newCustomers: Math.round(this.avg(snapshots.map(s => s.newCustomers?.total)) || 0),
        upgrades: this.sum(snapshots.map(s => s.upgrades?.total)),
        downgrades: this.sum(snapshots.map(s => s.downgrades?.total)),
        reactivations: this.sum(snapshots.map(s => s.reactivations?.total)),
        cancellations: this.sum(snapshots.map(s => s.cancellations?.total)),
        trials: Math.round(this.avg(snapshots.map(s => s.trials?.total)) || 0),
        clv: this.avg(snapshots.map(s => s.clv?.average)),
        cashFlow: this.sum(snapshots.map(s => s.cashFlow?.net)),
        successfulPayments: this.sum(snapshots.map(s => s.payments?.successful)),
        failedCharges: this.sum(snapshots.map(s => s.failedCharges?.total)),
        refunds: this.sum(snapshots.map(s => s.refunds?.total)),
        avgSalePrice: this.avg(snapshots.map(s => s.avgSalePrice?.value)),
        revenueChurnRate: this.avg(snapshots.map(s => s.revenueChurnRate?.rate)),
        customerChurnRate: this.avg(snapshots.map(s => s.customerChurnRate?.rate)),
        quickRatio: this.avg(snapshots.map(s => s.quickRatio?.value)),
      }
    }).sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * Get monthly aggregated metrics
   */
  async getMonthlyMetrics(companyId: string, months: number = 12): Promise<DailyMetrics[]> {
    const days = months * 31
    const snapshots = await this.getRecentSnapshots(companyId, days)

    // Group by month
    const monthlyGroups: Map<string, MetricsSnapshot[]> = new Map()

    snapshots.forEach(snapshot => {
      const date = new Date(snapshot.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`

      if (!monthlyGroups.has(monthKey)) {
        monthlyGroups.set(monthKey, [])
      }
      monthlyGroups.get(monthKey)!.push(snapshot)
    })

    // Average each month's metrics
    return Array.from(monthlyGroups.entries()).map(([monthStart, snapshots]) => ({
      date: monthStart,
      mrr: this.avg(snapshots.map(s => s.mrr.total)),
      arr: this.avg(snapshots.map(s => s.arr)),
      activeSubscribers: Math.round(this.avg(snapshots.map(s => s.activeUniqueSubscribers))),
      arpu: this.avg(snapshots.map(s => s.arpu)),
      revenue: this.sum(snapshots.map(s => s.revenue?.total)), // Sum for monthly total
      netRevenue: this.sum(snapshots.map(s => s.netRevenue?.total)),
      newMRR: this.avg(snapshots.map(s => s.newMRR?.total)),
      expansionMRR: this.avg(snapshots.map(s => s.expansionMRR?.total)),
      contractionMRR: this.avg(snapshots.map(s => s.contractionMRR?.total)),
      churnedMRR: this.avg(snapshots.map(s => s.churnedMRR?.total)),
      activeCustomers: Math.round(this.avg(snapshots.map(s => s.activeCustomers?.total)) || 0),
      newCustomers: this.sum(snapshots.map(s => s.newCustomers?.total)), // Sum for monthly total
      upgrades: this.sum(snapshots.map(s => s.upgrades?.total)),
      downgrades: this.sum(snapshots.map(s => s.downgrades?.total)),
      reactivations: this.sum(snapshots.map(s => s.reactivations?.total)),
      cancellations: this.sum(snapshots.map(s => s.cancellations?.total)),
      trials: Math.round(this.avg(snapshots.map(s => s.trials?.total)) || 0),
      clv: this.avg(snapshots.map(s => s.clv?.average)),
      cashFlow: this.sum(snapshots.map(s => s.cashFlow?.net)),
      successfulPayments: this.sum(snapshots.map(s => s.payments?.successful)),
      failedCharges: this.sum(snapshots.map(s => s.failedCharges?.total)),
      refunds: this.sum(snapshots.map(s => s.refunds?.total)),
      avgSalePrice: this.avg(snapshots.map(s => s.avgSalePrice?.value)),
      revenueChurnRate: this.avg(snapshots.map(s => s.revenueChurnRate?.rate)),
      customerChurnRate: this.avg(snapshots.map(s => s.customerChurnRate?.rate)),
      quickRatio: this.avg(snapshots.map(s => s.quickRatio?.value)),
    })).sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * Get quarterly aggregated metrics
   */
  async getQuarterlyMetrics(companyId: string, quarters: number = 4): Promise<DailyMetrics[]> {
    const days = quarters * 92
    const snapshots = await this.getRecentSnapshots(companyId, days)

    // Group by quarter
    const quarterlyGroups: Map<string, MetricsSnapshot[]> = new Map()

    snapshots.forEach(snapshot => {
      const date = new Date(snapshot.date)
      const quarter = Math.floor(date.getMonth() / 3) + 1
      const quarterStart = `${date.getFullYear()}-Q${quarter}`

      if (!quarterlyGroups.has(quarterStart)) {
        quarterlyGroups.set(quarterStart, [])
      }
      quarterlyGroups.get(quarterStart)!.push(snapshot)
    })

    // Average each quarter's metrics
    return Array.from(quarterlyGroups.entries()).map(([quarterKey, snapshots]) => ({
      date: quarterKey,
      mrr: this.avg(snapshots.map(s => s.mrr.total)),
      arr: this.avg(snapshots.map(s => s.arr)),
      activeSubscribers: Math.round(this.avg(snapshots.map(s => s.activeUniqueSubscribers))),
      arpu: this.avg(snapshots.map(s => s.arpu)),
      revenue: this.sum(snapshots.map(s => s.revenue?.total)), // Sum for quarterly total
      netRevenue: this.sum(snapshots.map(s => s.netRevenue?.total)),
      newMRR: this.avg(snapshots.map(s => s.newMRR?.total)),
      expansionMRR: this.avg(snapshots.map(s => s.expansionMRR?.total)),
      contractionMRR: this.avg(snapshots.map(s => s.contractionMRR?.total)),
      churnedMRR: this.avg(snapshots.map(s => s.churnedMRR?.total)),
      activeCustomers: Math.round(this.avg(snapshots.map(s => s.activeCustomers?.total)) || 0),
      newCustomers: this.sum(snapshots.map(s => s.newCustomers?.total)), // Sum for quarterly total
      upgrades: this.sum(snapshots.map(s => s.upgrades?.total)),
      downgrades: this.sum(snapshots.map(s => s.downgrades?.total)),
      reactivations: this.sum(snapshots.map(s => s.reactivations?.total)),
      cancellations: this.sum(snapshots.map(s => s.cancellations?.total)),
      trials: Math.round(this.avg(snapshots.map(s => s.trials?.total)) || 0),
      clv: this.avg(snapshots.map(s => s.clv?.average)),
      cashFlow: this.sum(snapshots.map(s => s.cashFlow?.net)),
      successfulPayments: this.sum(snapshots.map(s => s.payments?.successful)),
      failedCharges: this.sum(snapshots.map(s => s.failedCharges?.total)),
      refunds: this.sum(snapshots.map(s => s.refunds?.total)),
      avgSalePrice: this.avg(snapshots.map(s => s.avgSalePrice?.value)),
      revenueChurnRate: this.avg(snapshots.map(s => s.revenueChurnRate?.rate)),
      customerChurnRate: this.avg(snapshots.map(s => s.customerChurnRate?.rate)),
      quickRatio: this.avg(snapshots.map(s => s.quickRatio?.value)),
    })).sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * Helper: Calculate average of numbers (ignoring undefined)
   */
  private avg(values: (number | undefined)[]): number {
    const defined = values.filter((v): v is number => v !== undefined)
    if (defined.length === 0) return 0
    return defined.reduce((sum, v) => sum + v, 0) / defined.length
  }

  /**
   * Helper: Calculate sum of numbers (ignoring undefined)
   */
  private sum(values: (number | undefined)[]): number {
    const defined = values.filter((v): v is number => v !== undefined)
    return defined.reduce((sum, v) => sum + v, 0)
  }

  /**
   * Delete old snapshots (for data cleanup)
   */
  async deleteOldSnapshots(companyId: string, daysToKeep: number = 365): Promise<number> {
    const collection = await this.getCollection()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await collection.deleteMany({
      companyId,
      date: { $lt: cutoffDate }
    })

    return result.deletedCount
  }
}

export const metricsRepository = new MetricsRepository()

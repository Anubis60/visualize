import { getDatabase } from '../mongodb'
import { MetricsSnapshot } from '../models/MetricsSnapshot'

/**
 * Repository for historical/backfill metrics snapshots
 * Separate from live metrics_snapshots collection
 */
export class HistoricalMetricsRepository {
  private async getCollection() {
    const db = await getDatabase()
    const collection = db.collection<MetricsSnapshot>('historical_metrics_snapshots')

    // Ensure index exists for efficient queries
    await collection.createIndex({ companyId: 1, date: 1 })

    return collection
  }

  /**
   * Upsert a historical snapshot for a specific date (used by backfill)
   * Normalizes to midnight UTC for consistency
   */
  async upsertHistoricalSnapshot(
    companyId: string,
    snapshot: Omit<MetricsSnapshot, '_id' | 'companyId' | 'date' | 'timestamp'>,
    snapshotDate: Date
  ): Promise<void> {
    const collection = await this.getCollection()

    // Normalize to midnight UTC
    const targetDate = new Date(snapshotDate)
    targetDate.setUTCHours(0, 0, 0, 0)

    const startOfDay = new Date(targetDate)
    const endOfDay = new Date(targetDate)
    endOfDay.setUTCHours(23, 59, 59, 999)

    // Upsert: if snapshot for this day exists, replace it
    await collection.updateOne(
      {
        companyId,
        date: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      },
      {
        $set: {
          ...snapshot,
          companyId,
          date: targetDate,
          timestamp: targetDate,
        },
      },
      { upsert: true }
    )
  }

  /**
   * Check if backfill has been completed for a company
   * Returns true if any historical snapshots exist
   */
  async hasHistoricalData(companyId: string): Promise<boolean> {
    const collection = await this.getCollection()
    const count = await collection.countDocuments({ companyId }, { limit: 1 })
    return count > 0
  }

  /**
   * Get all historical snapshots for a company (for charts)
   * Returns one snapshot per day, sorted by date
   * Limited to 365 days to prevent memory issues
   */
  async getHistoricalSnapshots(
    companyId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<MetricsSnapshot[]> {
    const collection = await this.getCollection()

    const query: { companyId: string; date?: { $gte?: Date; $lte?: Date } } = { companyId }

    if (startDate || endDate) {
      query.date = {}
      if (startDate) query.date.$gte = startDate
      if (endDate) query.date.$lte = endDate
    }

    // Use indexed query with limit to prevent memory issues
    return collection
      .find(query)
      .sort({ date: 1 })
      .limit(365) // Max 1 year of data
      .toArray()
  }

  /**
   * Get the most recent historical snapshot for a company
   */
  async getLatestSnapshot(companyId: string): Promise<MetricsSnapshot | null> {
    const collection = await this.getCollection()
    return collection.findOne({ companyId }, { sort: { date: -1 } })
  }

  /**
   * Delete all historical snapshots for a company (for re-backfilling)
   */
  async deleteAllForCompany(companyId: string): Promise<number> {
    const collection = await this.getCollection()
    const result = await collection.deleteMany({ companyId })
    return result.deletedCount
  }
}

// Singleton instance
export const historicalMetricsRepository = new HistoricalMetricsRepository()

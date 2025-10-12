import { getDatabase } from '../mongodb'
import { MetricsSnapshot, DailyMetrics } from '../models/MetricsSnapshot'

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
   * Get or create today's snapshot
   * If a snapshot already exists for today, update it
   */
  async upsertDailySnapshot(companyId: string, snapshot: Omit<MetricsSnapshot, '_id' | 'companyId' | 'date' | 'timestamp'>): Promise<void> {
    const collection = await this.getCollection()

    // Get start of day in UTC
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    await collection.updateOne(
      {
        companyId,
        date: today,
      },
      {
        $set: {
          ...snapshot,
          timestamp: new Date(),
        },
        $setOnInsert: {
          companyId,
          date: today,
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
   * Get last N days of snapshots
   */
  async getRecentSnapshots(companyId: string, days: number = 30): Promise<MetricsSnapshot[]> {
    const collection = await this.getCollection()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setUTCHours(0, 0, 0, 0)

    return collection
      .find({
        companyId,
        date: { $gte: startDate }
      })
      .sort({ date: 1 })
      .toArray()
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
   * Get daily metrics formatted for charts
   */
  async getDailyMetrics(companyId: string, days: number = 30): Promise<DailyMetrics[]> {
    const snapshots = await this.getRecentSnapshots(companyId, days)

    return snapshots.map(snapshot => ({
      date: snapshot.date.toISOString().split('T')[0], // YYYY-MM-DD
      mrr: snapshot.mrr.total,
      arr: snapshot.arr,
      activeSubscribers: snapshot.activeUniqueSubscribers,
      arpu: snapshot.arpu,
    }))
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

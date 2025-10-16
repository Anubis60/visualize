import { getDatabase } from '../mongodb'
import { CompanyMetrics, DailySnapshot } from '../models/CompanyMetrics'

export class CompanyMetricsRepository {
  private async getCollection() {
    const db = await getDatabase()
    return db.collection<CompanyMetrics>('company_metrics')
  }

  /**
   * Get company metrics document
   */
  async getCompanyMetrics(companyId: string): Promise<CompanyMetrics | null> {
    const collection = await this.getCollection()
    const result = await collection.findOne({ companyId })

    if (result) {
    } else {
    }

    return result
  }

  /**
   * Store raw data from Whop API (happens once on first fetch)
   */
  async storeRawData(
    companyId: string,
    rawData: CompanyMetrics['rawData']
  ): Promise<void> {

    const collection = await this.getCollection()

    await collection.updateOne(
      { companyId },
      {
        $set: {
          rawData,
          lastUpdated: new Date()
        },
        $setOnInsert: {
          companyId,
          history: [],
          backfillCompleted: false
        }
      },
      { upsert: true }
    )

  }

  /**
   * Add or update a daily snapshot in the history array
   */
  async upsertDailySnapshot(
    companyId: string,
    snapshot: DailySnapshot
  ): Promise<void> {

    const collection = await this.getCollection()

    // Remove existing snapshot for this date, then add new one
    await collection.updateOne(
      { companyId },
      {
        $pull: { history: { date: snapshot.date } }
      }
    )

    await collection.updateOne(
      { companyId },
      {
        $push: {
          history: {
            $each: [snapshot],
            $sort: { date: 1 } // Sort chronologically (oldest to newest)
          }
        },
        $set: { lastUpdated: new Date() }
      },
      { upsert: true }
    )

  }

  /**
   * Add multiple historical snapshots at once (for backfill)
   */
  async bulkUpsertSnapshots(
    companyId: string,
    snapshots: DailySnapshot[]
  ): Promise<void> {

    const collection = await this.getCollection()

    // Get all dates we're about to insert
    const dates = snapshots.map(s => s.date)

    // Remove any existing snapshots for these dates
    await collection.updateOne(
      { companyId },
      {
        $pull: { history: { date: { $in: dates } } }
      }
    )

    // Add all new snapshots in chronological order
    await collection.updateOne(
      { companyId },
      {
        $push: {
          history: {
            $each: snapshots,
            $sort: { date: 1 } // Sort chronologically (oldest to newest)
          }
        },
        $set: { lastUpdated: new Date() }
      },
      { upsert: true }
    )

  }

  /**
   * Mark backfill as completed
   */
  async markBackfillCompleted(companyId: string): Promise<void> {

    const collection = await this.getCollection()

    await collection.updateOne(
      { companyId },
      {
        $set: {
          backfillCompleted: true,
          backfillCompletedAt: new Date()
        }
      }
    )

  }

  /**
   * Get historical snapshots for a date range
   */
  async getHistoricalSnapshots(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<DailySnapshot[]> {

    const collection = await this.getCollection()
    const doc = await collection.findOne(
      { companyId },
      {
        projection: {
          history: {
            $filter: {
              input: '$history',
              as: 'snapshot',
              cond: {
                $and: [
                  { $gte: ['$$snapshot.date', startDate] },
                  { $lte: ['$$snapshot.date', endDate] }
                ]
              }
            }
          }
        }
      }
    )

    const snapshots = doc?.history || []

    return snapshots
  }

  /**
   * Get today's snapshot
   */
  async getTodaySnapshot(companyId: string): Promise<DailySnapshot | null> {
    const today = new Date().toISOString().split('T')[0]

    const collection = await this.getCollection()
    const doc = await collection.findOne(
      { companyId, 'history.date': today },
      { projection: { 'history.$': 1 } }
    )

    const snapshot = doc?.history?.[0] || null

    if (snapshot) {
    } else {
    }

    return snapshot
  }
}

export const companyMetricsRepository = new CompanyMetricsRepository()

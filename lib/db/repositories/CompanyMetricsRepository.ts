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
    console.log(`[DB] Getting metrics for company: ${companyId}`)
    const collection = await this.getCollection()
    const result = await collection.findOne({ companyId })

    if (result) {
      console.log(`[DB] Found metrics document - Last updated: ${result.lastUpdated}, History entries: ${result.history?.length || 0}`)
    } else {
      console.log(`[DB] No metrics document found for company: ${companyId}`)
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
    console.log(`[DB] Storing raw data for company: ${companyId}`)
    console.log(`[DB] - Memberships: ${rawData.memberships.length}`)
    console.log(`[DB] - Transactions: ${rawData.transactions.length}`)
    console.log(`[DB] - Plans: ${rawData.plans.length}`)

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

    console.log(`[DB] Raw data stored successfully`)
  }

  /**
   * Add or update a daily snapshot in the history array
   */
  async upsertDailySnapshot(
    companyId: string,
    snapshot: DailySnapshot
  ): Promise<void> {
    console.log(`[DB] Upserting daily snapshot for ${companyId} on ${snapshot.date}`)

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
        $push: { history: snapshot },
        $set: { lastUpdated: new Date() }
      },
      { upsert: true }
    )

    console.log(`[DB] Snapshot for ${snapshot.date} upserted successfully`)
  }

  /**
   * Add multiple historical snapshots at once (for backfill)
   */
  async bulkUpsertSnapshots(
    companyId: string,
    snapshots: DailySnapshot[]
  ): Promise<void> {
    console.log(`[DB] Bulk upserting ${snapshots.length} snapshots for ${companyId}`)

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

    // Add all new snapshots
    await collection.updateOne(
      { companyId },
      {
        $push: { history: { $each: snapshots } },
        $set: { lastUpdated: new Date() }
      },
      { upsert: true }
    )

    console.log(`[DB] Bulk upsert completed - ${snapshots.length} snapshots added`)
  }

  /**
   * Mark backfill as completed
   */
  async markBackfillCompleted(companyId: string): Promise<void> {
    console.log(`[DB] Marking backfill completed for ${companyId}`)

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

    console.log(`[DB] Backfill marked as completed`)
  }

  /**
   * Get historical snapshots for a date range
   */
  async getHistoricalSnapshots(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<DailySnapshot[]> {
    console.log(`[DB] Getting historical snapshots for ${companyId} from ${startDate} to ${endDate}`)

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
    console.log(`[DB] Found ${snapshots.length} snapshots in date range`)

    return snapshots
  }

  /**
   * Get today's snapshot
   */
  async getTodaySnapshot(companyId: string): Promise<DailySnapshot | null> {
    const today = new Date().toISOString().split('T')[0]
    console.log(`[DB] Getting today's snapshot for ${companyId} (${today})`)

    const collection = await this.getCollection()
    const doc = await collection.findOne(
      { companyId, 'history.date': today },
      { projection: { 'history.$': 1 } }
    )

    const snapshot = doc?.history?.[0] || null

    if (snapshot) {
      console.log(`[DB] Found today's snapshot`)
    } else {
      console.log(`[DB] No snapshot found for today`)
    }

    return snapshot
  }
}

export const companyMetricsRepository = new CompanyMetricsRepository()

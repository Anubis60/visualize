import { companyRepository } from '@/lib/db/repositories/CompanyRepository'
import { backfillCompanyHistory } from './backfillService'
import { captureAllSnapshots } from './snapshotService'

/**
 * Run historical backfill for all companies that need it
 * This runs on startup to ensure all companies have historical data
 */
async function runHistoricalSnapshot(): Promise<void> {
  console.log('[HISTORICAL SNAPSHOT] Starting')

  try {
    const companies = await companyRepository.getCompaniesNeedingBackfill()

    if (companies.length === 0) {
      console.log('[HISTORICAL SNAPSHOT] No companies need backfill')
    } else {
      console.log(`[HISTORICAL SNAPSHOT] Processing ${companies.length} compan${companies.length === 1 ? 'y' : 'ies'}`)

      for (const company of companies) {
        await backfillCompanyHistory(company.companyId)
      }

      console.log('[HISTORICAL SNAPSHOT] Completed successfully')
    }
  } catch (error) {
    console.error('[HISTORICAL SNAPSHOT] Failed', error)
  }
}

/**
 * Run daily snapshot for all registered companies
 * This captures the current state of all companies
 */
async function runDailySnapshot(): Promise<void> {
  console.log('[DAILY SNAPSHOT] Starting')

  try {
    await captureAllSnapshots()
    console.log('[DAILY SNAPSHOT] Completed successfully')
  } catch (error) {
    console.error('[DAILY SNAPSHOT] Failed', error)
  }
}

/**
 * Initialize startup tasks
 * Runs historical backfill first, then daily snapshot
 */
export async function initializeStartupTasks(): Promise<void> {
  // Run historical snapshot first
  await runHistoricalSnapshot()

  // Then run daily snapshot
  await runDailySnapshot()
}

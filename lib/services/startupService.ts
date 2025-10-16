import { companyRepository } from '@/lib/db/repositories/CompanyRepository'
import { backfillCompanyHistory } from './backfillService'
import { captureAllSnapshots } from './snapshotService'

/**
 * Run historical backfill for all companies that need it
 * This runs on startup to ensure all companies have historical data
 */
async function runHistoricalSnapshot(): Promise<void> {

  try {
    const companies = await companyRepository.getCompaniesNeedingBackfill()

    if (companies.length === 0) {
    } else {

      for (const company of companies) {
        await backfillCompanyHistory(company.companyId)
      }

    }
  } catch (error) {
  }
}

/**
 * Run daily snapshot for all registered companies
 * This captures the current state of all companies
 */
async function runDailySnapshot(): Promise<void> {

  try {
    await captureAllSnapshots()
  } catch (error) {
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

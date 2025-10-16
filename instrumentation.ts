/**
 * Next.js Instrumentation
 * This file runs once when the Next.js server starts
 * Used to initialize cron jobs and other server-side setup
 */

export async function register() {
  // Only run on the server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeCronJobs } = await import('./lib/cron/scheduler')
    const { initializeStartupTasks } = await import('./lib/services/startupService')
    const { initializeIndexes } = await import('./lib/db/mongodb')

    // Initialize database indexes first
    await initializeIndexes()

    // Initialize and display cron job information
    initializeCronJobs()

    // Run historical snapshot first, then daily snapshot
    await initializeStartupTasks()
  }
}

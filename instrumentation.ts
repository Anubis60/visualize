/**
 * Next.js Instrumentation
 * This file runs once when the Next.js server starts
 * Used to initialize cron jobs and other server-side setup
 */

export async function register() {
  // Only run on the server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeCronJobs } = await import('./lib/cron/scheduler')

    // Initialize and display cron job information
    initializeCronJobs()
  }
}

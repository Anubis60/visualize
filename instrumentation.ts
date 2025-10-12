/**
 * Next.js Instrumentation
 * This file runs once when the Next.js server starts
 * Used to initialize cron jobs and other server-side setup
 */

export async function register() {
  // Only run on the server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeCronJobs } = await import('./lib/cron/scheduler')

    console.log('🚀 Initializing server instrumentation...')

    // Initialize cron jobs
    initializeCronJobs()

    console.log('✅ Server instrumentation complete')
  }
}

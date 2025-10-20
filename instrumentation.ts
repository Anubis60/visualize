/**
 * Next.js Instrumentation
 * This file runs once when the Next.js server starts
 * Used to initialize cron jobs and other server-side setup
 */

export async function register() {
  // Only run on the server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeIndexes } = await import('./lib/db/mongodb')

    // Initialize database indexes first
    await initializeIndexes()

    // Removed cron jobs and startup tasks - data is fetched on-demand and cached in MongoDB
  }
}

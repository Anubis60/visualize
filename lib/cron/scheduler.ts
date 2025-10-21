import cron, { ScheduledTask } from 'node-cron'

let snapshotJob: ScheduledTask | null = null

/**
 * Initialize the cron job scheduler
 *
 * For Vercel/Serverless:
 * - Daily snapshots handled by Vercel Cron (configured in vercel.json)
 * - Cron jobs persist across deployments automatically
 *
 * For Local Development:
 * - Uses internal node-cron for testing
 */
export function initializeCronJobs() {
  const isVercel = process.env.VERCEL === '1'


  if (isVercel) {
    // On Vercel - use Vercel Cron (persistent across deployments)
  } else {
    // Local development - use node-cron

    snapshotJob = cron.schedule('0 5 * * *', async () => {

      try {
        const { captureAllSnapshots } = await import('@/lib/services/snapshotService')
        await captureAllSnapshots()
      } catch {
        // Ignore errors in scheduled snapshot capture
      }
    }, {
      timezone: "America/New_York"
    })

  }

}

/**
 * Stop all cron jobs (useful for cleanup)
 */
export function stopCronJobs() {
  if (snapshotJob) {
    snapshotJob.stop()
    snapshotJob = null
  }
}

/**
 * Manually trigger the snapshot job (for testing)
 */
export async function triggerSnapshotNow() {

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const cronSecret = process.env.CRON_SECRET

  const response = await fetch(`${baseUrl}/api/cron/snapshot`, {
    method: 'GET',
    headers: cronSecret ? {
      'Authorization': `Bearer ${cronSecret}`
    } : {},
  })

  if (!response.ok) {
    throw new Error(`Manual trigger failed with status ${response.status}`)
  }

  return await response.json()
}

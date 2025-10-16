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

  console.log('[CRON] Cron System Initialization')
  console.log('[CRON] ================================')

  if (isVercel) {
    // On Vercel - use Vercel Cron (persistent across deployments)
    console.log('[CRON] Platform: Vercel')
    console.log('[CRON] Active Cron Jobs:')
    console.log('[CRON]   1. Daily Snapshot Capture')
    console.log('[CRON]      - Path: /api/cron/snapshot')
    console.log('[CRON]      - Schedule: 5:00 AM UTC daily (0 5 * * *)')
    console.log('[CRON]      - Persists: Yes (survives all deployments)')
    console.log('[CRON]      - Managed by: vercel.json configuration')
  } else {
    // Local development - use node-cron
    console.log('[CRON] Platform: Local Development')
    console.log('[CRON] Setting up node-cron for testing...')

    snapshotJob = cron.schedule('0 5 * * *', async () => {
      console.log('[CRON] Daily cron job triggered: Starting snapshot capture...')

      try {
        const { captureAllSnapshots } = await import('@/lib/services/snapshotService')
        await captureAllSnapshots()
        console.log('[CRON] Daily cron job completed successfully')
      } catch (error) {
        console.error('[CRON] Daily cron job failed:', error)
      }
    }, {
      timezone: "America/New_York"
    })

    console.log('[CRON] node-cron scheduled: 5:00 AM (America/New_York)')
  }

  console.log('[CRON] ================================')
}

/**
 * Stop all cron jobs (useful for cleanup)
 */
export function stopCronJobs() {
  if (snapshotJob) {
    snapshotJob.stop()
    snapshotJob = null
    console.log('[CRON] Cron jobs stopped')
  }
}

/**
 * Manually trigger the snapshot job (for testing)
 */
export async function triggerSnapshotNow() {
  console.log('[CRON] Manually triggering snapshot job...')

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

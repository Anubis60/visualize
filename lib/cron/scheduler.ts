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

  console.log('🚀 Cron System Initialization')
  console.log('================================')

  if (isVercel) {
    // On Vercel - use Vercel Cron (persistent across deployments)
    console.log('☁️  Platform: Vercel')
    console.log('📅 Active Cron Jobs:')
    console.log('   1. Daily Snapshot Capture')
    console.log('      - Path: /api/cron/snapshot')
    console.log('      - Schedule: 5:00 AM UTC daily (0 5 * * *)')
    console.log('      - Persists: ✅ Yes (survives all deployments)')
    console.log('      - Managed by: vercel.json configuration')
    console.log('')
    console.log('💡 Snapshots capture automatically when users first visit their dashboard')
    console.log('💡 Companies auto-register and are included in next daily snapshot')
  } else {
    // Local development - use node-cron
    console.log('💻 Platform: Local Development')
    console.log('📅 Setting up node-cron for testing...')

    snapshotJob = cron.schedule('0 5 * * *', async () => {
      console.log('🕐 Daily cron job triggered: Starting snapshot capture...')

      try {
        const { captureAllSnapshots } = await import('@/lib/services/snapshotService')
        await captureAllSnapshots()
        console.log('✅ Daily cron job completed successfully')
      } catch (error) {
        console.error('❌ Daily cron job failed:', error)
      }
    }, {
      timezone: "America/New_York"
    })

    console.log('✅ node-cron scheduled: 5:00 AM (America/New_York)')
  }

  console.log('================================')
  console.log('')
}

/**
 * Stop all cron jobs (useful for cleanup)
 */
export function stopCronJobs() {
  if (snapshotJob) {
    snapshotJob.stop()
    snapshotJob = null
    console.log('🛑 Cron jobs stopped')
  }
}

/**
 * Manually trigger the snapshot job (for testing)
 */
export async function triggerSnapshotNow() {
  console.log('🔄 Manually triggering snapshot job...')

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

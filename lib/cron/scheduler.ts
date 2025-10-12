import cron from 'node-cron'

let snapshotJob: cron.ScheduledTask | null = null

/**
 * Initialize the cron job scheduler
 *
 * For Vercel/Serverless:
 * - Initial snapshot runs 10 seconds after startup (for immediate data on cold start)
 * - Daily snapshots handled by Vercel Cron (configured in vercel.json)
 * - Internal node-cron disabled since serverless functions don't persist
 *
 * For Local Development:
 * - Uncomment the node-cron section to test locally
 */
export function initializeCronJobs() {
  const isVercel = process.env.VERCEL === '1'

  // For testing: Run 10 seconds after startup (works on both local and Vercel)
  console.log('🕐 Scheduling initial snapshot for 10 seconds from now...')

  setTimeout(async () => {
    console.log('🕐 Initial snapshot triggered (10 seconds after startup)...')

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const cronSecret = process.env.CRON_SECRET

      const response = await fetch(`${baseUrl}/api/cron/snapshot`, {
        method: 'GET',
        headers: cronSecret ? {
          'Authorization': `Bearer ${cronSecret}`
        } : {},
      })

      if (!response.ok) {
        throw new Error(`Initial snapshot failed with status ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Initial snapshot completed:', result)
    } catch (error) {
      console.error('❌ Initial snapshot failed:', error)
    }

    // Only schedule internal cron if NOT on Vercel
    // On Vercel, cron jobs are handled by vercel.json config
    if (!isVercel) {
      console.log('📋 Setting up internal node-cron for local development...')
      snapshotJob = cron.schedule('0 5 * * *', async () => {
        console.log('🕐 Daily cron job triggered: Starting snapshot capture...')

        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const cronSecret = process.env.CRON_SECRET

          const response = await fetch(`${baseUrl}/api/cron/snapshot`, {
            method: 'GET',
            headers: cronSecret ? {
              'Authorization': `Bearer ${cronSecret}`
            } : {},
          })

          if (!response.ok) {
            throw new Error(`Cron job failed with status ${response.status}`)
          }

          const result = await response.json()
          console.log('✅ Daily cron job completed:', result)
        } catch (error) {
          console.error('❌ Daily cron job failed:', error)
        }
      }, {
        scheduled: true,
        timezone: "America/New_York"
      })

      console.log('✅ Daily cron schedule activated: 5:00 AM (America/New_York)')
    } else {
      console.log('☁️  Running on Vercel - Daily snapshots handled by Vercel Cron (vercel.json)')
      console.log('   Schedule: 5:00 AM UTC daily')
    }
  }, 10000) // Run after 10 seconds

  console.log('✅ Cron jobs initialized successfully')
  console.log('   - Initial snapshot: 10 seconds after startup')
  if (isVercel) {
    console.log('   - Daily snapshot: Managed by Vercel Cron (persists across deployments)')
  } else {
    console.log('   - Daily snapshot: 5:00 AM (America/New_York) via node-cron')
  }
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

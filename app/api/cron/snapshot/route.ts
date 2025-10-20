import { NextRequest, NextResponse } from 'next/server'
import { captureAllSnapshots } from '@/lib/services/snapshotService'

/**
 * Cron endpoint for daily snapshot capture
 * Triggered by Vercel Cron at 5 AM UTC (configured in vercel.json)
 *
 * Security: Protected by CRON_SECRET environment variable
 *
 * Usage:
 * - Automatic: Vercel Cron calls this daily
 * - Manual: GET /api/cron/snapshot with Authorization header
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Unauthorized snapshot request - invalid secret')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[Cron] Starting daily snapshot capture...')
    const startTime = Date.now()

    // Capture snapshots for all registered companies
    await captureAllSnapshots()

    const duration = Date.now() - startTime
    console.log(`[Cron] ✓ Snapshot capture completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: 'Daily snapshots captured successfully',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Cron] Snapshot capture failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

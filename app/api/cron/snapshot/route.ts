import { NextRequest, NextResponse } from 'next/server'
import { captureAllSnapshots } from '@/lib/services/snapshotService'

/**
 * Cron job endpoint to capture daily snapshots
 * This endpoint should be called at 5am daily by a cron scheduler
 *
 * Can be triggered:
 * 1. By the internal node-cron scheduler (automatic)
 * 2. Manually via API call for testing: GET /api/cron/snapshot
 * 3. By external cron services (e.g., Vercel Cron, GitHub Actions)
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify the request is from an authorized source
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // If CRON_SECRET is set, require authorization
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🕐 Cron job triggered: Starting daily snapshot capture...')

    await captureAllSnapshots()

    return NextResponse.json({
      success: true,
      message: 'Snapshots captured successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Cron job failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to capture snapshots',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

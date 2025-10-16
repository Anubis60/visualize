import { NextRequest, NextResponse } from 'next/server'
import { captureCompanySnapshot } from '@/lib/services/snapshotService'

/**
 * Manual snapshot trigger endpoint for testing
 * Captures a snapshot for a specific company immediately
 *
 * Usage: GET /api/snapshot/trigger?company_id=biz_xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('company_id')

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required. Pass it as ?company_id=YOUR_ID' },
        { status: 400 }
      )
    }

    await captureCompanySnapshot(companyId)

    return NextResponse.json({
      success: true,
      message: `Snapshot captured successfully for ${companyId}`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to capture snapshot',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

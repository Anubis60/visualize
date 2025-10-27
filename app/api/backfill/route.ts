import { NextRequest, NextResponse } from 'next/server';
import { backfillCompanyHistory } from '@/lib/services/backfillService';
import { historicalMetricsRepository } from '@/lib/db/repositories/HistoricalMetricsRepository';

/**
 * Backfill Historical Data Endpoint
 * Triggers backfill of 365 days of historical snapshots for a company
 * Checks database first to avoid duplicate backfills
 * POST /api/backfill?company_id=xxx
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required. Pass it as ?company_id=YOUR_ID' },
        { status: 400 }
      );
    }

    console.log(`[Backfill API] Checking backfill status for company: ${companyId}`);

    // Check if backfill already exists in database
    const hasData = await historicalMetricsRepository.hasHistoricalData(companyId);

    if (hasData) {
      console.log(`[Backfill API] Company ${companyId} already has historical data`);
      return NextResponse.json({
        success: true,
        skipped: true,
        companyId,
        message: 'Historical data already exists',
      });
    }

    console.log(`[Backfill API] Starting backfill for company: ${companyId}`);

    // Trigger backfill (this will run and block until complete)
    await backfillCompanyHistory(companyId);

    console.log(`[Backfill API] ✓ Backfill completed for: ${companyId}`);

    return NextResponse.json({
      success: true,
      skipped: false,
      companyId,
      message: 'Historical data backfill completed successfully',
    });

  } catch (error) {
    console.error('[Backfill API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to backfill historical data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

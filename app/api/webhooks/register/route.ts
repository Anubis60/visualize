import { NextResponse } from 'next/server';
import { registerWebhookForCompany, isWebhookRegistered } from '@/lib/services/webhookRegistrationService';
import { backfillCompanyHistory } from '@/lib/services/backfillService';

/**
 * Webhook Registration Endpoint
 *
 * Called when a company first accesses their dashboard.
 * 1. Checks if webhook already registered
 * 2. If not, registers webhook with Whop for that company
 * 3. Triggers initial backfill (365 days of historical data)
 */

export async function POST(request: Request) {
  try {
    const { companyId } = await request.json();

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    console.log(`[Webhook Register API] Request for company: ${companyId}`);

    // Check if webhook already registered
    const alreadyRegistered = await isWebhookRegistered(companyId);

    if (alreadyRegistered) {
      console.log(`[Webhook Register API] Webhook already exists for: ${companyId}`);
      return NextResponse.json({
        success: true,
        alreadyRegistered: true,
        message: 'Webhook already registered for this company',
      });
    }

    // Register webhook with Whop
    const registrationResult = await registerWebhookForCompany(companyId);

    if (!registrationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: registrationResult.error || 'Failed to register webhook',
        },
        { status: 500 }
      );
    }

    console.log(`[Webhook Register API] ✓ Webhook registered for: ${companyId}`);

    // Trigger initial backfill (run in background)
    // Don't await - let it run asynchronously
    backfillCompanyHistory(companyId)
      .then(() => {
        console.log(`[Webhook Register API] ✓ Backfill completed for: ${companyId}`);
      })
      .catch((error) => {
        console.error(`[Webhook Register API] Backfill failed for ${companyId}:`, error);
      });

    return NextResponse.json({
      success: true,
      alreadyRegistered: false,
      webhookId: registrationResult.webhookId,
      message: 'Webhook registered successfully. Backfill in progress.',
    });
  } catch (error) {
    console.error('[Webhook Register API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

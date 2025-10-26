import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { captureCompanySnapshot } from '@/lib/services/snapshotService';

/**
 * Whop Business Webhook Handler
 *
 * Handles incoming webhooks from Whop for CUSTOMER'S business events:
 * - membership.activated: Customer's end-user subscribed
 * - membership.deactivated: Customer's end-user canceled/expired
 * - payment.succeeded: Payment processed successfully
 * - payment.failed: Payment attempt failed
 * - payment.pending: Payment is processing
 *
 * Each webhook triggers a fresh snapshot capture for that company's metrics.
 *
 * Documentation: https://docs.whop.com/webhooks
 */

export const runtime = 'nodejs';

interface WhopWebhookPayload {
  id: string;                    // msg_xxxxxxxxxxxxxxxxxxxxxxxx
  api_version: string;           // "v1"
  timestamp: string;             // ISO 8601: "2025-01-01T00:00:00.000Z"
  type: string;                  // Event type
  data: {
    id: string;
    status?: string;
    company?: {
      id: string;
      title?: string;
    };
    user?: {
      id: string;
      username?: string;
      name?: string;
    };
    plan?: {
      id: string;
    };
    total?: number;
    [key: string]: unknown;
  };
}

async function verifyWhopSignature(payload: string, signature: string | null): Promise<boolean> {
  const secret = process.env.WHOP_BUSINESS_WEBHOOK_SECRET;

  if (!secret) {
    console.warn('[Business Webhook] No WHOP_BUSINESS_WEBHOOK_SECRET configured - allowing in development');
    return true; // Allow in development
  }

  if (!signature) {
    return false;
  }

  try {
    // Whop uses Stripe-style signature format: t=timestamp,v1=signature
    const signatureParts = signature.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const timestamp = signatureParts.t;
    const receivedSignature = signatureParts.v1;

    if (!timestamp || !receivedSignature) {
      return false;
    }

    const signedPayload = `${timestamp}.${payload}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(signedPayload);
    const expectedSignature = hmac.digest('hex');

    return expectedSignature === receivedSignature;
  } catch (error) {
    console.error('[Business Webhook] Signature verification error:', error);
    return false;
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // 1. Get raw body for signature verification
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('x-whop-signature');

    // 2. Verify webhook signature for security
    const isValid = await verifyWhopSignature(body, signature);
    if (!isValid) {
      console.error('[Business Webhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // 3. Parse webhook payload
    const webhook: WhopWebhookPayload = JSON.parse(body);

    console.log(`[Business Webhook] Received: ${webhook.type} for company ${webhook.data.company?.id}`);

    // 4. Extract company ID from webhook data
    const companyId = webhook.data.company?.id;

    if (!companyId) {
      console.error('[Business Webhook] No company.id found in webhook payload');
      return NextResponse.json(
        { error: 'No company.id in payload' },
        { status: 400 }
      );
    }

    // 5. Handle different event types by triggering snapshot capture
    switch (webhook.type) {
      case 'membership.activated':
        // New subscription, trial started, or reactivation
        console.log(`[Business Webhook] Member activated: ${webhook.data.id}`);
        await captureCompanySnapshot(companyId);
        break;

      case 'membership.deactivated':
        // Cancellation, expiration, or payment failure
        console.log(`[Business Webhook] Member deactivated: ${webhook.data.id}`);
        await captureCompanySnapshot(companyId);
        break;

      case 'payment.succeeded':
        // Payment processed successfully (renewal, upgrade, etc.)
        console.log(`[Business Webhook] Payment succeeded: $${webhook.data.total || 0}`);
        await captureCompanySnapshot(companyId);
        break;

      case 'payment.failed':
        // Payment attempt failed
        console.log(`[Business Webhook] Payment failed: ${webhook.data.id}`);
        await captureCompanySnapshot(companyId);
        break;

      case 'payment.pending':
        // Payment is processing (ACH, wire transfer, etc.)
        console.log(`[Business Webhook] Payment pending: ${webhook.data.id}`);
        // Optional: You may skip snapshot for pending payments
        // await captureCompanySnapshot(companyId);
        break;

      default:
        console.log(`[Business Webhook] Unhandled event type: ${webhook.type}`);
        break;
    }

    const duration = Date.now() - startTime;
    console.log(`[Business Webhook] ✓ Processed in ${duration}ms`);

    return NextResponse.json({
      received: true,
      type: webhook.type,
      companyId,
      duration: `${duration}ms`
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Business Webhook] Processing failed:', error);

    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      },
      { status: 500 }
    );
  }
}

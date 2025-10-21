import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import clientPromise from '@/lib/db/mongodb';
import { Collections } from '@/lib/models';

/**
 * Whop Webhook Handler
 *
 * Handles incoming webhooks from Whop for subscription events:
 * - membership_went_valid: User's subscription became active (trial started or paid)
 * - membership_went_invalid: User's subscription expired or was cancelled
 * - membership_metadata_updated: Subscription details changed
 * - membership_cancel_at_period_end_changed: User scheduled/unscheduled cancellation
 * - payment_succeeded: Payment processed successfully
 * - payment_failed: Payment failed (for monitoring)
 *
 * More events: https://docs.whop.com/webhooks/events
 */

// Disable body parsing so we can verify the signature
export const runtime = 'nodejs';

interface WhopMembership {
  id: string;
  user?: string;
  user_id?: string;
  userId?: string;
  product?: string;
  product_id?: string;
  plan?: string;
  plan_id?: string;
  status?: string;
  metadata?: {
    email?: string;
    [key: string]: unknown;
  };
  renewal_period_start?: number;
  renewal_period_end?: number;
  valid_from?: number;
  expires_at?: number;
  cancel_at_period_end?: boolean;
  [key: string]: unknown;
}

async function verifyWhopSignature(payload: string, signature: string | null) {
  const secret = process.env.WHOP_WEBHOOK_SECRET;

  if (!secret) {
    return true; // Allow in development
  }

  if (!signature) {
    return false;
  }

  try {
    // Whop uses Stripe-style signature format: t=timestamp,v1=signature
    // Parse the signature header
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

    // Whop signs with full secret (including ws_ prefix) using timestamp.payload format
    const signedPayload = `${timestamp}.${payload}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(signedPayload);
    const expectedSignature = hmac.digest('hex');

    return expectedSignature === receivedSignature;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('x-whop-signature');

    // Verify webhook signature
    const isValid = await verifyWhopSignature(body, signature);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    const event = JSON.parse(body);

    // Handle different webhook events (support both dot and underscore notation)
    switch (event.action) {
      case 'membership_went_valid':
      case 'membership.went_valid':
        await handleMembershipWentValid(event.data);
        break;

      case 'membership_went_invalid':
      case 'membership.went_invalid':
        await handleMembershipWentInvalid(event.data);
        break;

      case 'membership_metadata_updated':
      case 'membership_cancel_at_period_end_changed':
      case 'membership.metadata_updated':
      case 'membership.cancel_at_period_end_changed':
        await handleMembershipUpdated(event.data);
        break;

      case 'payment_succeeded':
      case 'payment_failed':
      default:
        // Event received but not actively handled
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Handle membership_went_valid event
 * Fired when a user's subscription becomes active (trial started or payment succeeded)
 */
async function handleMembershipWentValid(membership: WhopMembership) {
  if (!clientPromise) {
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db('financier');
    const usersCollection = db.collection(Collections.USERS);
    const subscriptionsCollection = db.collection(Collections.SUBSCRIPTIONS);

    // Extract userId from different possible field names
    const userId = membership.user || membership.user_id || membership.userId;
    const companyId = membership.metadata?.company_id as string | undefined;
    const now = new Date();

    // Extract product and plan IDs
    const productId = membership.product || membership.product_id;
    const planId = membership.plan || membership.plan_id;

    // Determine subscription status
    // Whop uses "active" status for both trial and paid
    // Check if it's a trial by looking at metadata or trial period
    const isTrial = membership.metadata?.email === '' || membership.status === 'trialing';
    const status = isTrial ? 'trial' : 'active';

    // Calculate period dates using Whop's field names
    const currentPeriodStart = membership.renewal_period_start
      ? new Date(membership.renewal_period_start * 1000)
      : (membership.valid_from ? new Date(membership.valid_from * 1000) : now);

    const currentPeriodEnd = membership.renewal_period_end
      ? new Date(membership.renewal_period_end * 1000)
      : (membership.expires_at ? new Date(membership.expires_at * 1000) : null);

    const trialEndsAt = isTrial && currentPeriodEnd ? currentPeriodEnd : null;

    // Update user record
    await usersCollection.updateOne(
      { userId },
      {
        $set: {
          subscriptionStatus: status,
          trialEndsAt: trialEndsAt,
          subscriptionEndsAt: currentPeriodEnd,
          accessPassId: productId,
          updatedAt: now
        },
        $setOnInsert: {
          userId,
          createdAt: now
        }
      },
      { upsert: true }
    );

    // Update subscription record - use companyId as unique key since that's what checkout uses
    const subscriptionQuery = companyId ? { companyId } : { userId };
    await subscriptionsCollection.updateOne(
      subscriptionQuery,
      {
        $set: {
          membershipId: membership.id,
          userId: userId,
          companyId: companyId,
          accessPassId: productId,
          planId: planId,
          status: status,
          trialEndsAt: trialEndsAt,
          currentPeriodStart: currentPeriodStart,
          currentPeriodEnd: currentPeriodEnd,
          cancelAtPeriodEnd: membership.cancel_at_period_end || false,
          whopData: membership, // Store full Whop data for reference
          updatedAt: now
        },
        $setOnInsert: {
          createdAt: now
        }
      },
      { upsert: true }
    );
  } catch (error) {
    throw error;
  }
}

/**
 * Handle membership_went_invalid event
 * Fired when a user's subscription expires or is cancelled
 */
async function handleMembershipWentInvalid(membership: WhopMembership) {
  if (!clientPromise) {
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db('financier');
    const usersCollection = db.collection(Collections.USERS);
    const subscriptionsCollection = db.collection(Collections.SUBSCRIPTIONS);

    const userId = membership.user || membership.user_id || membership.userId;
    const companyId = membership.metadata?.company_id as string | undefined;
    const now = new Date();

    // Update user record
    await usersCollection.updateOne(
      { userId },
      {
        $set: {
          subscriptionStatus: 'expired',
          updatedAt: now
        }
      }
    );

    // Update subscription record - use companyId as unique key
    const subscriptionQuery = companyId ? { companyId } : { userId };
    await subscriptionsCollection.updateOne(
      subscriptionQuery,
      {
        $set: {
          status: 'expired',
          whopData: membership,
          updatedAt: now
        }
      }
    );
  } catch (error) {
    throw error;
  }
}

/**
 * Handle membership_metadata_updated and membership_cancel_at_period_end_changed events
 * Fired when membership details change (e.g., cancellation scheduled)
 */
async function handleMembershipUpdated(membership: WhopMembership) {
  if (!clientPromise) {
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db('financier');
    const subscriptionsCollection = db.collection(Collections.SUBSCRIPTIONS);

    const userId = membership.user || membership.user_id || membership.userId;
    const companyId = membership.metadata?.company_id as string | undefined;
    const now = new Date();

    // Update subscription record with latest data - use companyId as unique key
    const subscriptionQuery = companyId ? { companyId } : { userId };
    await subscriptionsCollection.updateOne(
      subscriptionQuery,
      {
        $set: {
          cancelAtPeriodEnd: membership.cancel_at_period_end || false,
          whopData: membership,
          updatedAt: now
        }
      }
    );
  } catch (error) {
    throw error;
  }
}

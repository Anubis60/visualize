import { whopClient } from '@/lib/whop/sdk';
import clientPromise from '@/lib/db/mongodb';

/**
 * Webhook Registration Service
 *
 * Manages programmatic webhook registration for each company that signs up.
 * When a company first accesses the dashboard, we register a webhook with Whop
 * to receive real-time events for their business.
 */

const WEBHOOK_ENDPOINT_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whop/business`
  : 'https://financier-xi.vercel.app/api/webhooks/whop/business';

const WEBHOOK_EVENTS = [
  'membership.activated',
  'membership.deactivated',
  'payment.succeeded',
  'payment.failed',
  // 'payment.pending', // Optional - uncomment if needed
] as const;

interface WebhookRegistration {
  companyId: string;
  webhookId: string;
  webhookSecret: string;
  webhookUrl: string;
  events: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Check if a webhook is already registered for a company
 */
export async function isWebhookRegistered(companyId: string): Promise<boolean> {
  try {
    const client = await clientPromise;
    if (!client) return false;
    const db = client.db('financier');
    const webhooksCollection = db.collection<WebhookRegistration>('webhook_registrations');

    const registration = await webhooksCollection.findOne({ companyId });
    return !!registration;
  } catch (error) {
    console.error('[Webhook Registration] Error checking webhook status:', error);
    return false;
  }
}

/**
 * Get webhook registration details for a company
 */
export async function getWebhookRegistration(companyId: string): Promise<WebhookRegistration | null> {
  try {
    const client = await clientPromise;
    if (!client) return null;
    const db = client.db('financier');
    const webhooksCollection = db.collection<WebhookRegistration>('webhook_registrations');

    return await webhooksCollection.findOne({ companyId });
  } catch (error) {
    console.error('[Webhook Registration] Error fetching webhook registration:', error);
    return null;
  }
}

/**
 * Register a webhook for a company with Whop
 * Called when a company first accesses their dashboard
 */
export async function registerWebhookForCompany(companyId: string): Promise<{
  success: boolean;
  webhookId?: string;
  error?: string;
}> {
  try {
    console.log(`[Webhook Registration] Starting registration for company: ${companyId}`);

    // Check if already registered
    const existing = await isWebhookRegistered(companyId);
    if (existing) {
      console.log(`[Webhook Registration] Webhook already registered for company: ${companyId}`);
      return { success: true };
    }

    // TODO: Uncomment when @whop/sdk is updated with createWebhook method
    // Waiting for Whop v1 API SDK release
    console.warn('[Webhook Registration] ⚠️  SDK method not available yet - manual webhook setup required');

    /* UNCOMMENT WHEN SDK IS UPDATED:

    // Create webhook via Whop SDK
    console.log(`[Webhook Registration] Calling Whop API to create webhook...`);
    const result = await whopClient.webhooks.createWebhook({
      apiVersion: 'v1',
      enabled: true,
      events: WEBHOOK_EVENTS as unknown as Array<string>,
      resourceId: companyId, // The company to monitor
      url: WEBHOOK_ENDPOINT_URL,
    });

    console.log(`[Webhook Registration] ✓ Webhook created: ${result.id}`);

    // Store webhook registration in database
    const client = await clientPromise;
    if (!client) throw new Error('MongoDB client not available');
    const db = client.db('financier');
    const webhooksCollection = db.collection<WebhookRegistration>('webhook_registrations');

    await webhooksCollection.insertOne({
      companyId,
      webhookId: result.id,
      webhookSecret: result.webhookSecret,
      webhookUrl: result.url,
      events: result.events,
      enabled: result.enabled,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`[Webhook Registration] ✓ Registration stored in database`);

    return {
      success: true,
      webhookId: result.id,
    };

    */

    // Temporary: Return success but indicate manual setup needed
    return {
      success: false,
      error: 'Webhook SDK method not available - please set up webhooks manually in Whop dashboard',
    };
  } catch (error) {
    console.error('[Webhook Registration] Failed to register webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Unregister a webhook for a company
 * Called when a company cancels their subscription or deletes their account
 */
export async function unregisterWebhookForCompany(companyId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log(`[Webhook Registration] Unregistering webhook for company: ${companyId}`);

    // Get webhook registration
    const registration = await getWebhookRegistration(companyId);
    if (!registration) {
      console.log(`[Webhook Registration] No webhook registered for company: ${companyId}`);
      return { success: true };
    }

    // TODO: Uncomment when @whop/sdk is updated with deleteWebhook method
    console.warn('[Webhook Registration] ⚠️  SDK method not available yet - manual webhook deletion required');

    /* UNCOMMENT WHEN SDK IS UPDATED:

    // Delete webhook via Whop SDK
    await whopClient.webhooks.deleteWebhook(registration.webhookId);
    console.log(`[Webhook Registration] ✓ Webhook deleted from Whop: ${registration.webhookId}`);

    // Remove from database
    const client = await clientPromise;
    if (!client) throw new Error('MongoDB client not available');
    const db = client.db('financier');
    const webhooksCollection = db.collection<WebhookRegistration>('webhook_registrations');

    await webhooksCollection.deleteOne({ companyId });
    console.log(`[Webhook Registration] ✓ Registration removed from database`);

    return { success: true };

    */

    // Temporary: Return error indicating manual action needed
    return {
      success: false,
      error: 'Webhook deletion not available - please delete manually in Whop dashboard'
    };
  } catch (error) {
    console.error('[Webhook Registration] Failed to unregister webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * List all registered webhooks (for admin/debugging)
 */
export async function listAllWebhookRegistrations(): Promise<WebhookRegistration[]> {
  try {
    const client = await clientPromise;
    if (!client) return [];
    const db = client.db('financier');
    const webhooksCollection = db.collection<WebhookRegistration>('webhook_registrations');

    return await webhooksCollection.find({}).toArray();
  } catch (error) {
    console.error('[Webhook Registration] Error listing webhooks:', error);
    return [];
  }
}

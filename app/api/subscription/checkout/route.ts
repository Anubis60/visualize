import { NextResponse } from 'next/server';
import clientPromise from '@/lib/db/mongodb';
import { Collections } from '@/lib/models';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, companyId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const planId = process.env.WHOP_PLAN_ID;
    const accessPassId = process.env.NEXT_PUBLIC_ACCESS_PASS_ID;

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan not configured. Please set WHOP_PLAN_ID in .env. See setup documentation for instructions.' },
        { status: 500 }
      );
    }

    if (!accessPassId) {
      return NextResponse.json(
        { error: 'Access pass not configured. Please set NEXT_PUBLIC_ACCESS_PASS_ID in .env' },
        { status: 500 }
      );
    }

    // Create checkout session using Whop REST API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Build redirect URL - include companyId if provided
    const redirectUrl = companyId
      ? `${baseUrl}/dashboard/${companyId}?checkout=success`
      : `${baseUrl}?checkout=success`;

    // Use REST API instead of SDK because SDK doesn't return purchase_url
    const response = await fetch('https://api.whop.com/api/v1/checkout_configurations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plan_id: planId,
        redirect_url: redirectUrl,
        affiliate_code: '',
        metadata: {
          user_id: userId,
          company_id: companyId,
          email: email
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Whop API error (${response.status}): ${errorText}`);
    }

    const checkoutData = await response.json();

    // Update user and create subscription in database (if MongoDB is configured)
    if (clientPromise) {
      try {
        const client = await clientPromise;
        const db = client.db('financier');
        const usersCollection = db.collection(Collections.USERS);
        const subscriptionsCollection = db.collection(Collections.SUBSCRIPTIONS);

        const now = new Date();
        const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from now

        // Update user
        await usersCollection.updateOne(
          { userId },
          {
            $set: {
              email,
              companyId,
              subscriptionStatus: 'trial',
              trialEndsAt,
              accessPassId,
              updatedAt: now
            },
            $setOnInsert: {
              createdAt: now
            }
          },
          { upsert: true }
        );

        // Create subscription object
        await subscriptionsCollection.updateOne(
          { userId },
          {
            $set: {
              companyId,
              accessPassId,
              planId,
              status: 'trial',
              trialEndsAt,
              currentPeriodStart: now,
              currentPeriodEnd: trialEndsAt,
              cancelAtPeriodEnd: false,
              checkoutConfigId: checkoutData.id,
              updatedAt: now
            },
            $setOnInsert: {
              createdAt: now
            }
          },
          { upsert: true }
        );
      } catch (dbError) {
      }
    }

    // REST API returns purchase_url which is the actual checkout link
    return NextResponse.json({
      checkoutUrl: checkoutData.purchase_url,
      configurationId: checkoutData.id,
      planId: checkoutData.plan?.id || planId
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import clientPromise from '@/lib/db/mongodb';
import { Collections, hasActiveSubscription, getSubscriptionInfo } from '@/lib/models';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    if (!clientPromise) {
      return NextResponse.json(
        { error: 'MongoDB not configured' },
        { status: 500 }
      );
    }

    // Check MongoDB only - webhooks keep it up to date in real-time
    const client = await clientPromise;
    const db = client.db('financier');
    const subscriptionsCollection = db.collection(Collections.SUBSCRIPTIONS);

    // Get subscription from database by companyId (stored in whopData.metadata)
    const subscription = await subscriptionsCollection.findOne({
      $or: [
        { companyId },
        { 'whopData.metadata.companyId': companyId }
      ]
    });

    // If no subscription exists, no access
    if (!subscription) {
      return NextResponse.json({
        hasAccess: false,
        subscription: null,
        subscriptionInfo: {
          hasAccess: false,
          status: 'none',
          isTrialing: false,
          trialDaysLeft: 0,
          daysUntilExpiry: 0
        }
      });
    }

    // Build user-like object from subscription data
    const dataSource = {
      subscriptionStatus: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      subscriptionEndsAt: subscription.currentPeriodEnd
    };

    // Get subscription info
    const hasAccess = hasActiveSubscription(dataSource);
    const subscriptionInfo = getSubscriptionInfo(dataSource);

    return NextResponse.json({
      hasAccess,
      subscription: {
        status: subscription.status,
        planId: subscription.planId,
        trialEndsAt: subscription.trialEndsAt,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
      },
      subscriptionInfo
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check subscription status' },
      { status: 500 }
    );
  }
}

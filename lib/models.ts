// Database models and helper functions

export const Collections = {
  USERS: 'users',
  COMPANIES: 'companies',
  SUBSCRIPTIONS: 'subscriptions'
};

/**
 * User Schema
 * {
 *   _id: ObjectId,
 *   userId: string (Whop user ID),
 *   email: string,
 *   name: string,
 *   accessPassId: string (optional),
 *   subscriptionStatus: 'active' | 'trial' | 'expired' | 'cancelled',
 *   trialEndsAt: Date,
 *   subscriptionEndsAt: Date,
 *   createdAt: Date,
 *   updatedAt: Date
 * }
 */

/**
 * Company Schema
 * {
 *   _id: ObjectId,
 *   companyId: string (Whop company ID),
 *   title: string,
 *   route: string,
 *   logo: object,
 *   industryType: string,
 *   businessType: string,
 *   userId: string (owner),
 *   createdAt: Date,
 *   updatedAt: Date
 * }
 */

/**
 * Subscription Schema
 * {
 *   _id: ObjectId,
 *   userId: string (Whop user ID),
 *   companyId: string,
 *   accessPassId: string,
 *   planId: string,
 *   membershipId: string,
 *   status: 'active' | 'trial' | 'expired' | 'cancelled',
 *   trialEndsAt: Date,
 *   currentPeriodStart: Date,
 *   currentPeriodEnd: Date,
 *   cancelAtPeriodEnd: boolean,
 *   whopData: object (full Whop membership data),
 *   createdAt: Date,
 *   updatedAt: Date
 * }
 */

interface SubscriptionData {
  subscriptionStatus?: string;
  trialEndsAt?: Date | string | null;
  subscriptionEndsAt?: Date | string | null;
}

/**
 * Check if user has active subscription
 */
export function hasActiveSubscription(user: SubscriptionData): boolean {
  if (!user) return false;

  const now = new Date();

  // Check if user has active subscription
  if (user.subscriptionStatus === 'active') {
    // If no end date (null), subscription is ongoing/lifetime
    if (!user.subscriptionEndsAt) return true;
    // If has end date, check if it's in the future
    if (new Date(user.subscriptionEndsAt) > now) return true;
  }

  // Check if user is in trial period
  if (user.subscriptionStatus === 'trial') {
    // If no end date (null), trial is ongoing
    if (!user.trialEndsAt) return true;
    // If has end date, check if it's in the future
    if (new Date(user.trialEndsAt) > now) return true;
  }

  return false;
}

/**
 * Get user subscription info
 */
export function getSubscriptionInfo(user: SubscriptionData): {
  hasAccess: boolean;
  status: string;
  isTrialing: boolean;
  trialDaysLeft: number;
  daysUntilExpiry: number;
} {
  const now = new Date();
  const hasAccess = hasActiveSubscription(user);

  const info = {
    hasAccess,
    status: user?.subscriptionStatus || 'none',
    isTrialing: false,
    trialDaysLeft: 0,
    daysUntilExpiry: 0
  };

  if (user?.subscriptionStatus === 'trial' && user.trialEndsAt) {
    info.isTrialing = true;
    const daysLeft = Math.ceil((new Date(user.trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    info.trialDaysLeft = Math.max(0, daysLeft);
  }

  if (user?.subscriptionEndsAt) {
    const daysLeft = Math.ceil((new Date(user.subscriptionEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    info.daysUntilExpiry = Math.max(0, daysLeft);
  }

  return info;
}

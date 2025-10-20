import { whopClient } from './sdk';
import type { Payment } from '../analytics/transactions';

/**
 * Fetch all memberships for a company using auto-pagination
 * Maps SDK MembershipListResponse to our Membership interface format
 */
export async function getAllMemberships(companyId: string) {
  console.log(`[Whop SDK] Fetching memberships for company: ${companyId}`);
  const memberships = [];
  let count = 0;
  for await (const membership of whopClient.memberships.list({
    company_id: companyId
  })) {
    count++;
    if (count % 100 === 0) {
      console.log(`[Whop SDK] Fetched ${count} memberships...`);
    }
    // Map SDK snake_case response to our camelCase Membership interface
    memberships.push({
      id: membership.id,
      status: membership.status as 'trialing' | 'active' | 'past_due' | 'canceled' | 'completed' | 'expired',
      createdAt: new Date(membership.created_at).getTime() / 1000,
      canceledAt: membership.canceled_at ? new Date(membership.canceled_at).getTime() / 1000 : null,
      expiresAt: membership.renewal_period_end ? new Date(membership.renewal_period_end).getTime() / 1000 : null,
      cancelationReason: membership.cancellation_reason || null,
      totalSpend: 0, // SDK doesn't provide this directly - would need to calculate from payments
      plan: membership.plan ? {
        id: membership.plan.id
      } : undefined,
      accessPass: undefined, // SDK doesn't include this in membership response
      member: membership.user ? {
        id: membership.user.id,
        email: '', // SDK doesn't provide email in memberships.list() response
        username: membership.user.username || '',
        name: membership.user.name,
      } : null,
      promoCode: membership.promo_code,
    });
  }
  console.log(`[Whop SDK] ✓ Fetched total ${count} memberships`);
  return memberships;
}

/**
 * Fetch all payments for a company using auto-pagination
 * Maps SDK PaymentListResponse to our Payment interface format
 */
export async function getAllPayments(companyId: string): Promise<Payment[]> {
  console.log(`[Whop SDK] Fetching payments for company: ${companyId}`);
  const payments: Payment[] = [];
  let count = 0;
  for await (const payment of whopClient.payments.list({
    company_id: companyId
  })) {
    count++;
    if (count % 100 === 0) {
      console.log(`[Whop SDK] Fetched ${count} payments...`);
    }
    // Map SDK snake_case response to our camelCase Payment interface
    payments.push({
      id: payment.id,
      status: (payment.status || 'pending') as 'paid' | 'failed' | 'pending',
      substatus: (payment.substatus || 'succeeded') as 'succeeded' | 'refunded' | 'failed',
      created_at: new Date(payment.created_at).getTime() / 1000,
      paid_at: payment.paid_at ? new Date(payment.paid_at).getTime() / 1000 : null,
      refunded_at: payment.refunded_at ? new Date(payment.refunded_at).getTime() / 1000 : null,
      total: payment.total ?? 0,
      subtotal: payment.subtotal ?? 0,
      refunded_amount: payment.refunded_amount ?? 0,
      amount_after_fees: payment.amount_after_fees,
      billing_reason: payment.billing_reason || '',
      plan: payment.plan ? { id: payment.plan.id } : { id: '' },
      membership: payment.membership ? {
        id: payment.membership.id,
        status: String(payment.membership.status)
      } : { id: '', status: '' },
      user: payment.user ? { id: payment.user.id } : { id: '' },
    });
  }
  console.log(`[Whop SDK] ✓ Fetched total ${count} payments`);
  return payments;
}

/**
 * Fetch all plans for a company using auto-pagination
 * Maps SDK PlanListResponse to our Plan interface format
 */
export async function getAllPlans(companyId: string) {
  console.log(`[Whop SDK] Fetching plans for company: ${companyId}`);
  const plans = [];
  let count = 0;
  for await (const plan of whopClient.plans.list({
    company_id: companyId
  })) {
    count++;
    // Map SDK response to our Plan interface
    plans.push({
      id: plan.id,
      rawRenewalPrice: plan.renewal_price,
      rawInitialPrice: plan.initial_price,
      billingPeriod: plan.billing_period,
      planType: (plan.plan_type === 'one_time' ? 'one_time' : 'renewal') as 'one_time' | 'renewal',
      baseCurrency: String(plan.currency),
      description: plan.description,
      accessPass: plan.product ? {
        id: plan.product.id,
        title: plan.product.title
      } : null,
      createdAt: new Date(plan.created_at).getTime() / 1000,
      updatedAt: new Date(plan.updated_at).getTime() / 1000,
      visibility: String(plan.visibility),
      releaseMethod: String(plan.release_method),
    });
  }
  console.log(`[Whop SDK] ✓ Fetched total ${count} plans`);
  return plans;
}

/**
 * Fetch all members for a company using auto-pagination
 * Returns raw member data from SDK
 */
export async function getAllMembers(companyId: string) {
  console.log(`[Whop SDK] Fetching members for company: ${companyId}`);
  const members = [];
  let count = 0;
  // @ts-expect-error - members endpoint exists in API but not typed in current SDK version
  for await (const member of whopClient.members.list({
    company_id: companyId
  })) {
    count++;
    if (count % 100 === 0) {
      console.log(`[Whop SDK] Fetched ${count} members...`);
    }
    members.push(member);
  }
  console.log(`[Whop SDK] ✓ Fetched total ${count} members`);
  return members;
}

/**
 * Get company details
 */
export async function getCompany(companyId: string) {
  console.log(`[Whop SDK] Fetching company details: ${companyId}`);
  const company = await whopClient.companies.retrieve(companyId);

  // Log the full raw response for planning/debugging
  console.log('[Whop SDK] Raw Company Response:', JSON.stringify({
    id: company.id,
    title: company.title,
    route: company.route,
    verified: company.verified,
    business_type: company.business_type,
    industry_type: company.industry_type,
    member_count: company.member_count,
    published_reviews_count: company.published_reviews_count,
    created_at: company.created_at,
    updated_at: company.updated_at,
    owner_user: company.owner_user,
    social_links: company.social_links,
    // Note: The SDK Company type does NOT include:
    // - logo (not available)
    // - bannerImage (not available)
    // - description (not available)
  }, null, 2));

  console.log(`[Whop SDK] ✓ Retrieved company: ${company.title}`);
  return company;
}

/**
 * Type definitions for Whop SDK responses
 * These extend or alias the SDK's built-in types for use throughout the app
 */

// Re-export common types from SDK for convenience
export type {
  Currency,
  MembershipStatus,
  ReceiptStatus,
  FriendlyReceiptStatus,
  PlanType,
  ReleaseMethod,
  Visibility,
  Company,
  BusinessTypes,
  IndustryTypes,
} from '@whop/sdk/resources/shared';

/**
 * The SDK Company type includes:
 * - id: string
 * - title: string
 * - route: string
 * - verified: boolean
 * - business_type: BusinessTypes | null
 * - industry_type: IndustryTypes | null
 * - member_count: number
 * - published_reviews_count: number
 * - created_at: string
 * - updated_at: string
 * - owner_user: { id, username, name }
 * - social_links: Array<{ platform, url }>
 *
 * NOT AVAILABLE in SDK:
 * - logo (use placeholder or fetch separately)
 * - bannerImage (not provided)
 * - description (not provided)
 */

// Payment type alias for our analytics
export interface Payment {
  id: string;
  amount_after_fees: number;
  auto_refunded: boolean;
  billing_address: {
    city: string | null;
    country: string | null;
    line1: string | null;
    line2: string | null;
    name: string | null;
    postal_code: string | null;
    state: string | null;
  } | null;
  billing_reason: string | null;
  card_brand: string | null;
  card_last4: string | null;
  company: {
    id: string;
    route: string;
    title: string;
  } | null;
  created_at: string;
  currency: string | null;
  dispute_alerted_at: string | null;
  failure_message: string | null;
  last_payment_attempt: string | null;
  member: {
    id: string;
    phone: string | null;
  } | null;
  membership: {
    id: string;
    status: string;
  } | null;
  paid_at: string | null;
  payment_method_type: string | null;
  plan: {
    id: string;
  } | null;
  product: {
    id: string;
    route: string;
    title: string;
  } | null;
  promo_code: {
    id: string;
    amount_off: number;
    base_currency: string;
    code: string | null;
    number_of_intervals: number | null;
    promo_type: string;
  } | null;
  refundable: boolean;
  refunded_amount: number | null;
  refunded_at: string | null;
  retryable: boolean;
  status: string | null;
  substatus: string;
  subtotal: number | null;
  total: number | null;
  usd_total: number | null;
  user: {
    id: string;
    email: string | null;
    name: string | null;
    username: string;
  } | null;
  voidable: boolean;
}

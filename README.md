# SaaS Metrics Explained: Plain English + Whop SDK Mapping

A comprehensive guide to understanding SaaS metrics and implementing them with the Whop SDK.

**SDK:** `@whop/sdk` (current version with cursor-based pagination)  
**API:** REST API with GraphQL-style cursors  
**Response Structure:** `{ data: [...], page_info: { end_cursor, start_cursor, has_next_page, has_previous_page } }`

---

## 📊 Recurring Revenue Metrics

### **MRR (Monthly Recurring Revenue)**

**Plain English:** The predictable revenue your business earns each month from subscriptions based on what customers are currently committed to paying you monthly.

**Whop SDK Implementation:**
```typescript
import Whop from '@whop/sdk';

const client = new Whop({
  appID: 'app_xxxxxxxxxxxxxx',
  apiKey: 'My API Key',
});

async function calculateMRR(companyId: string) {
  let totalMRR = 0;
  
  // Step 1: Load all plans into a Map for lookups
  const planCache = new Map();
  for await (const plan of client.plans.list({ company_id: companyId })) {
    planCache.set(plan.id, plan);
  }
  
  // Step 2: Iterate through active memberships
  // SDK automatically handles cursor pagination with for await
  for await (const membership of client.memberships.list({ 
    company_id: companyId,
    statuses: ['active'] // Filter for active status
  })) {
    const plan = planCache.get(membership.plan.id);
    
    if (plan) {
      // Normalize to monthly based on billing_period (in days)
      const monthlyAmount = normalizeToMonthly(
        plan.renewal_price,
        plan.billing_period
      );
      totalMRR += monthlyAmount;
    }
  }
  
  return totalMRR;
}

function normalizeToMonthly(price: number, billingPeriodDays: number): number {
  // billing_period is in days
  if (billingPeriodDays === 30) return price; // Monthly
  if (billingPeriodDays === 365) return price / 12; // Annual
  if (billingPeriodDays === 90) return price / 3; // Quarterly
  // Custom periods: convert days to months
  return (price / billingPeriodDays) * 30;
}
```

**Key Fields:**
- **Membership:** `status` ("trialing" | "active" | "past_due" | "completed" | "canceled" | "expired" | "unresolved" | "drafted"), `plan.id`, `user.id`, `created_at`, `cancel_at_period_end`, `canceled_at`
- **Plan:** `renewal_price`, `billing_period` (in days), `initial_price`, `plan_type` ("renewal" | "one_time")

**Note:** 
- Memberships return `plan.id` (just the ID string), you must fetch full Plan objects separately
- The SDK's `for await` automatically handles cursor pagination using `page_info.has_next_page`
- Dates are ISO 8601 strings: `"2023-12-01T05:00:00.401Z"`

**API Reference:**  
- [List Memberships](https://docs.whop.com/api-reference/memberships/list-memberships)
- [List Plans](https://docs.whop.com/api-reference/plans/list-plans)

---

### **ARR (Annual Run Rate)**

**Plain English:** Your current MRR multiplied by 12.

```typescript
async function calculateARR(companyId: string) {
  const mrr = await calculateMRR(companyId);
  return mrr * 12;
}
```

---

### **New MRR**

**Plain English:** Monthly recurring revenue added from brand new customers who just signed up this period.

**Whop SDK Implementation:**
```typescript
async function calculateNewMRR(
  companyId: string, 
  startDate: Date, 
  endDate: Date
) {
  const client = new Whop({ appID: 'app_xxx', apiKey: 'key' });
  let newMRR = 0;
  const processedUsers = new Set<string>();
  
  // Load all plans
  const planCache = new Map();
  for await (const plan of client.plans.list({ company_id: companyId })) {
    planCache.set(plan.id, plan);
  }
  
  // Get memberships created in the target period
  for await (const membership of client.memberships.list({ 
    company_id: companyId,
    created_after: startDate.toISOString(),
    created_before: endDate.toISOString()
  })) {
    const userId = membership.user.id;
    
    if (!processedUsers.has(userId) && membership.status === 'active') {
      // Check if this is user's FIRST membership (not a reactivation)
      const userMemberships = [];
      for await (const m of client.memberships.list({ company_id: companyId })) {
        if (m.user.id === userId) {
          userMemberships.push(m);
        }
      }
      
      // Sort by created_at to find first membership
      userMemberships.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      // Only count if this is truly the first membership
      if (userMemberships[0].id === membership.id) {
        const plan = planCache.get(membership.plan.id);
        if (plan) {
          newMRR += normalizeToMonthly(plan.renewal_price, plan.billing_period);
        }
      }
      
      processedUsers.add(userId);
    }
  }
  
  return newMRR;
}
```

**Key Insight:** Must verify this is the user's FIRST membership ever to distinguish from reactivations.

**Filter Parameters:** Use `created_after` and `created_before` to filter memberships by creation date.

---

### **Expansion MRR**

**Plain English:** Additional monthly revenue from existing customers who upgraded their plan or increased what they're paying.

**Whop SDK Implementation:**
```typescript
// CRITICAL: You MUST store historical snapshots to calculate this!
// The Whop SDK only returns current state

interface MembershipSnapshot {
  membership_id: string;
  user_id: string;
  plan_id: string;
  monthly_amount: number;
  snapshot_date: Date;
  status: string;
}

async function calculateExpansionMRR(
  companyId: string, 
  startDate: Date, 
  endDate: Date
) {
  const client = new Whop({ appID: 'app_xxx', apiKey: 'key' });
  
  // 1. Get snapshots from start of period (from YOUR database)
  const startSnapshots = await getSnapshotsFromDB(companyId, startDate);
  
  // 2. Get current state from Whop SDK
  const currentSnapshots = new Map<string, number>();
  const planCache = new Map();
  
  // Load all plans
  for await (const plan of client.plans.list({ company_id: companyId })) {
    planCache.set(plan.id, plan);
  }
  
  // Get current membership states
  for await (const membership of client.memberships.list({ 
    company_id: companyId,
    statuses: ['active']
  })) {
    const plan = planCache.get(membership.plan.id);
    if (plan) {
      const monthlyAmount = normalizeToMonthly(plan.renewal_price, plan.billing_period);
      currentSnapshots.set(membership.id, monthlyAmount);
    }
  }
  
  // 3. Calculate expansion (positive changes only)
  let expansionMRR = 0;
  
  for (const startSnapshot of startSnapshots) {
    const currentAmount = currentSnapshots.get(startSnapshot.membership_id);
    
    // If membership still exists and is paying MORE
    if (currentAmount && currentAmount > startSnapshot.monthly_amount) {
      expansionMRR += (currentAmount - startSnapshot.monthly_amount);
    }
  }
  
  return expansionMRR;
}

// Daily cron job to store snapshots
async function storeSnapshotsDaily(companyId: string) {
  const client = new Whop({ appID: 'app_xxx', apiKey: 'key' });
  const snapshots: MembershipSnapshot[] = [];
  const planCache = new Map();
  
  // Load all plans
  for await (const plan of client.plans.list({ company_id: companyId })) {
    planCache.set(plan.id, plan);
  }
  
  // Snapshot all memberships
  for await (const membership of client.memberships.list({ 
    company_id: companyId 
  })) {
    const plan = planCache.get(membership.plan.id);
    if (plan) {
      snapshots.push({
        membership_id: membership.id,
        user_id: membership.user.id,
        plan_id: membership.plan.id,
        monthly_amount: normalizeToMonthly(plan.renewal_price, plan.billing_period),
        snapshot_date: new Date(),
        status: membership.status
      });
    }
  }
  
  await saveSnapshotsToDB(snapshots);
}
```

**Critical:** The Whop SDK only shows current state. You MUST implement daily snapshots to track changes over time.

---

### **Contraction MRR**

**Plain English:** Lost monthly revenue from existing customers who downgraded to a cheaper plan (but didn't cancel entirely).

**Whop SDK Implementation:**
```typescript
async function calculateContractionMRR(
  companyId: string, 
  startDate: Date, 
  endDate: Date
) {
  const client = new Whop({ appID: 'app_xxx', apiKey: 'key' });
  
  // 1. Get snapshots from start of period (from YOUR database)
  const startSnapshots = await getSnapshotsFromDB(companyId, startDate);
  
  // 2. Get current state
  const currentSnapshots = new Map<string, number>();
  const planCache = new Map();
  
  for await (const plan of client.plans.list({ company_id: companyId })) {
    planCache.set(plan.id, plan);
  }
  
  for await (const membership of client.memberships.list({ 
    company_id: companyId,
    statuses: ['active'] // Key: membership must still be active
  })) {
    const plan = planCache.get(membership.plan.id);
    if (plan) {
      const monthlyAmount = normalizeToMonthly(plan.renewal_price, plan.billing_period);
      currentSnapshots.set(membership.id, monthlyAmount);
    }
  }
  
  // 3. Calculate contraction (negative changes for still-active memberships)
  let contractionMRR = 0;
  
  for (const startSnapshot of startSnapshots) {
    const currentAmount = currentSnapshots.get(startSnapshot.membership_id);
    
    // If membership still exists (active) but paying LESS
    if (currentAmount && currentAmount < startSnapshot.monthly_amount) {
      contractionMRR += (startSnapshot.monthly_amount - currentAmount);
    }
  }
  
  return contractionMRR;
}
```

**Key Distinction:** 
- Membership `status: 'active'` - customer is still here, just paying less
- This is NOT churn

---

### **Churned MRR**

**Plain English:** Monthly recurring revenue lost from customers who completely canceled their subscriptions.

**Whop SDK Implementation:**
```typescript
async function calculateChurnedMRR(
  companyId: string, 
  startDate: Date, 
  endDate: Date
) {
  const client = new Whop({ appID: 'app_xxx', apiKey: 'key' });
  
  // 1. Get memberships that were active at start of period (from YOUR database)
  const startSnapshots = await getSnapshotsFromDB(companyId, startDate);
  const activeAtStart = startSnapshots.filter(s => s.status === 'active');
  
  // 2. Get current active memberships
  const currentActiveMembershipIds = new Set<string>();
  
  for await (const membership of client.memberships.list({ 
    company_id: companyId,
    statuses: ['active', 'trialing']
  })) {
    currentActiveMembershipIds.add(membership.id);
  }
  
  // 3. Calculate churned MRR (memberships that are no longer active)
  let churnedMRR = 0;
  
  for (const startSnapshot of activeAtStart) {
    // If membership is no longer active
    if (!currentActiveMembershipIds.has(startSnapshot.membership_id)) {
      churnedMRR += startSnapshot.monthly_amount;
    }
  }
  
  return churnedMRR;
}
```

**Key Fields:**
- **Membership:** `status`, `cancel_at_period_end`, `canceled_at`, `cancellation_reason`

**Membership Status Values:**
- `"trialing"` - In trial period
- `"active"` - Active subscription (count in MRR)
- `"past_due"` - Payment failed
- `"completed"` - One-time purchase completed
- `"canceled"` - User canceled (churned)
- `"expired"` - Subscription expired (churned)
- `"unresolved"` - Payment issue unresolved
- `"drafted"` - Draft state

**Detection Methods:**
1. `status: 'canceled'` or `status: 'expired'`
2. `cancel_at_period_end: true` - scheduled for cancellation
3. `canceled_at` is set (ISO date string)
4. Missing from current active list

---

### **Reactivation MRR**

**Plain English:** Monthly revenue regained from customers who previously canceled but came back and subscribed again.

**Whop SDK Implementation:**
```typescript
async function calculateReactivationMRR(
  companyId: string, 
  startDate: Date, 
  endDate: Date
) {
  const client = new Whop({ appID: 'app_xxx', apiKey: 'key' });
  let reactivationMRR = 0;
  const processedUsers = new Set<string>();
  
  // Load all plans
  const planCache = new Map();
  for await (const plan of client.plans.list({ company_id: companyId })) {
    planCache.set(plan.id, plan);
  }
  
  // Get memberships created in the target period
  for await (const membership of client.memberships.list({ 
    company_id: companyId,
    created_after: startDate.toISOString(),
    created_before: endDate.toISOString(),
    statuses: ['active']
  })) {
    const userId = membership.user.id;
    
    if (!processedUsers.has(userId)) {
      // Get all memberships for this user
      const userMemberships = [];
      for await (const m of client.memberships.list({ 
        company_id: companyId 
      })) {
        if (m.user.id === userId) {
          userMemberships.push(m);
        }
      }
      
      // Sort by created_at
      userMemberships.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      // Check if there was a previous membership
      const currentIndex = userMemberships.findIndex(m => m.id === membership.id);
      const hasPreviousMembership = currentIndex > 0;
      
      // If they had a previous membership, this is a reactivation
      if (hasPreviousMembership) {
        const plan = planCache.get(membership.plan.id);
        if (plan) {
          reactivationMRR += normalizeToMonthly(plan.renewal_price, plan.billing_period);
        }
      }
      
      processedUsers.add(userId);
    }
  }
  
  return reactivationMRR;
}
```

---

### **Net New MRR**

**Plain English:** The bottom line: New + Expansion + Reactivation - Contraction - Churn

**Formula:** `(New MRR + Expansion MRR + Reactivation MRR) - (Contraction MRR + Churned MRR)`

**The fundamental equation:**
```
End MRR = Start MRR + New MRR + Expansion MRR + Reactivation MRR 
          - Contraction MRR - Churned MRR
```

---

## 🔄 Churn & Retention Metrics

### **Customer Churn Rate**

**Plain English:** The percentage of customers who canceled in a given period.

**Formula:** `(Churned customers / Total customers at start) × 100`

---

### **MRR Churn Rate**

**Plain English:** The percentage of revenue (not customers) you lost.

**Formulas:**
- **Gross MRR Churn:** `(Churned MRR + Contraction MRR) / MRR at period start`
- **Net MRR Churn:** `(Churned + Contraction - Expansion - Reactivation) / MRR at start`

---

### **ARPU (Average Revenue Per User)**

**Plain English:** How much money, on average, each customer pays you per month.

**Formula:** `Total MRR / Number of active customers`

```typescript
async function calculateARPU(companyId: string) {
  const mrr = await calculateMRR(companyId);
  
  // Count unique active users
  const client = new Whop({ appID: 'app_xxx', apiKey: 'key' });
  const activeUsers = new Set<string>();
  
  for await (const membership of client.memberships.list({ 
    company_id: companyId,
    statuses: ['active']
  })) {
    activeUsers.add(membership.user.id);
  }
  
  return mrr / activeUsers.size;
}
```

---

### **LTV (Lifetime Value)**

**Plain English:** The total revenue you expect from a customer over their entire relationship.

**Formula:** `ARPA / Customer Churn Rate`

---

## 🎯 Leads & Conversions

### **Leads (Active Trials)**

**Plain English:** People currently testing your product before committing to pay.

```typescript
async function countActiveTrials(companyId: string) {
  const client = new Whop({ appID: 'app_xxx', apiKey: 'key' });
  let trialCount = 0;
  
  for await (const membership of client.memberships.list({ 
    company_id: companyId,
    statuses: ['trialing']
  })) {
    trialCount++;
  }
  
  return trialCount;
}
```

---

### **Trial → Paid Conversion**

**Plain English:** The percentage of trial users who become paying customers.

**Formula:** `(Trials that became paid / Total trials started) × 100`

**Note:** This requires tracking status history to know which memberships started as trials.

---

## 🔑 Key Whop SDK Objects

### **Membership Object**

```typescript
{
  id: "mem_xxxxxxxxxxxxxx",
  status: "trialing" | "active" | "past_due" | "completed" | "canceled" | "expired" | "unresolved" | "drafted",
  created_at: "2023-12-01T05:00:00.401Z",
  updated_at: "2023-12-01T05:00:00.401Z",
  manage_url: string,
  member: {
    id: "mber_xxxxxxxxxxxxx"
  },
  user: {
    id: "user_xxxxxxxxxxxxx",
    username: string,
    name: string
  },
  renewal_period_start: "2023-12-01T05:00:00.401Z",
  renewal_period_end: "2023-12-01T05:00:00.401Z",
  cancel_at_period_end: boolean,
  cancellation_reason: string,
  canceled_at: "2023-12-01T05:00:00.401Z" | null,
  currency: "usd",
  company: {
    id: "biz_xxxxxxxxxxxxxx",
    title: string
  },
  plan: {
    id: "plan_xxxxxxxxxxxxx"
  },
  promo_code: {
    id: "promo_xxxxxxxxxxxx"
  },
  license_key: string,
  metadata: {},
  payment_collection_paused: boolean
}
```

**API Reference:** [List Memberships](https://docs.whop.com/api-reference/memberships/list-memberships)

---

### **Plan Object**

```typescript
{
  id: "plan_xxxxxxxxxxxxx",
  created_at: "2023-12-01T05:00:00.401Z",
  updated_at: "2023-12-01T05:00:00.401Z",
  visibility: "visible" | "hidden",
  plan_type: "renewal" | "one_time",
  release_method: "buy_now",
  currency: "usd",
  company: {
    id: "biz_xxxxxxxxxxxxxx",
    title: string
  },
  product: {
    id: "prod_xxxxxxxxxxxxx",
    title: string
  },
  invoice: {
    id: "inv_xxxxxxxxxxxxxx"
  },
  billing_period: 30, // in DAYS (30 = monthly, 365 = annual)
  description: string,
  purchase_url: string,
  expiration_days: number,
  initial_price: 9.99, // First charge
  renewal_price: 19.99, // Recurring charges (USE THIS FOR MRR!)
  trial_period_days: 7,
  member_count: 42,
  internal_notes: string
}
```

**Critical for MRR:**
- Use `renewal_price` (not `initial_price`)
- `billing_period` is in DAYS
- Only count plans where `plan_type: "renewal"`

**API Reference:** [List Plans](https://docs.whop.com/api-reference/plans/list-plans)

---

### **Payment Object**

```typescript
{
  id: "pay_xxxxxxxxxxxxxx",
  status: "draft" | "open" | "paid" | "pending" | "uncollectible" | "unresolved" | "void",
  substatus: "auto_refunded" | "refunded" | "partially_refunded" | "dispute_warning" | "open_resolution" | "open_dispute" | "failed" | "price_too_low" | "succeeded" | "drafted" | "uncollectible" | "unresolved" | "past_due" | "pending" | "incomplete" | "canceled",
  refundable: boolean,
  retryable: boolean,
  created_at: "2023-12-01T05:00:00.401Z",
  paid_at: "2023-12-01T05:00:00.401Z" | null,
  last_payment_attempt: "2023-12-01T05:00:00.401Z" | null,
  dispute_alerted_at: "2023-12-01T05:00:00.401Z" | null,
  refunded_at: "2023-12-01T05:00:00.401Z" | null,
  plan: {
    id: "plan_xxxxxxxxxxxxx"
  } | null,
  product: {
    id: "prod_xxxxxxxxxxxxx",
    title: string,
    route: string
  } | null,
  user: {
    id: "user_xxxxxxxxxxxxx",
    name: string,
    username: string,
    email: string
  } | null,
  membership: {
    id: "mem_xxxxxxxxxxxxxx",
    status: "trialing" | "active" | ...
  } | null,
  member: {
    id: string,
    phone: string | null
  } | null,
  company: {
    id: "biz_xxxxxxxxxxxxxx",
    title: string,
    route: string
  } | null,
  promo_code: {
    id: "promo_xxxxxxxxxxxx",
    code: string,
    amount_off: number,
    base_currency: "usd",
    promo_type: "percentage" | "flat_amount",
    number_of_intervals: number | null
  } | null,
  voidable: boolean,
  currency: "usd" | null,
  total: number | null,
  subtotal: number | null,
  usd_total: number | null,
  refunded_amount: number | null,
  auto_refunded: boolean,
  amount_after_fees: number,
  card_brand: string | null,
  card_last4: string | null,
  billing_address: {
    name: string | null,
    line1: string | null,
    line2: string | null,
    city: string | null,
    state: string | null,
    postal_code: string | null,
    country: string | null
  } | null,
  payment_method_type: string | null,
  billing_reason: string | null,
  failure_message: string | null
}
```

**Note:** Payments are historical transactions. Use Memberships + Plans for MRR calculations, not Payments.

**API Reference:** [List Payments](https://docs.whop.com/api-reference/payments/list-payments)

---

## 📈 Implementation Strategy

### 1. **SDK Iteration with Cursor Pagination**

The SDK handles cursor pagination automatically:

```typescript
// The SDK's for await automatically fetches all pages
for await (const membership of client.memberships.list({ 
  company_id: companyId 
})) {
  // Process each membership
  // SDK handles page_info.has_next_page internally
}
```

**Pagination Structure:**
```typescript
{
  data: Array<T>,
  page_info: {
    end_cursor: string | null,
    start_cursor: string | null,
    has_next_page: boolean,
    has_previous_page: boolean
  }
}
```

---

### 2. **Daily Snapshot Strategy**

**Why:** The Whop API only shows current state. You need historical data to calculate Expansion, Contraction, and Churned MRR.

**What to Store:**
```typescript
interface DailySnapshot {
  snapshot_date: Date,
  company_id: string,
  memberships: Array<{
    membership_id: string,
    user_id: string,
    plan_id: string,
    status: string,
    monthly_amount: number,
    cancel_at_period_end: boolean,
    canceled_at: string | null
  }>
}
```

**When:** Run daily via cron job at midnight UTC

---

### 3. **Query Filters Available**

**Memberships:**
- `statuses`: Array of status strings to filter by
- `created_after`: ISO date string
- `created_before`: ISO date string
- `plan_ids`: Array of plan IDs
- `cancel_options`: Filter by cancellation status
- `direction`: "asc" | "desc"
- `order`: "id" | "created_at" | "status" | "canceled_at" | "date_joined" | "total_spend"

**Plans:**
- `release_methods`: Filter by release method
- `visibilities`: Filter by visibility
- `plan_types`: Filter by plan type
- `product_ids`: Filter by product

**Payments:**
- `statuses`: Array of payment statuses
- `billing_reasons`: Why payment was charged
- `currencies`: Filter by currency
- `created_after` / `created_before`: Date filters

---

### 4. **Pro Tips**

1. **Use `renewal_price`, not `initial_price`** for MRR calculations

2. **Only count `plan_type: "renewal"`** plans for recurring revenue

3. **Normalize all pricing to monthly** using `billing_period` (days)

4. **Cache plan data** to reduce API calls:
   ```typescript
   const planCache = new Map();
   for await (const plan of client.plans.list({ company_id })) {
     planCache.set(plan.id, plan);
   }
   ```

5. **Handle date filters properly**:
   ```typescript
   created_after: startDate.toISOString(), // "2023-12-01T00:00:00.000Z"
   created_before: endDate.toISOString()
   ```

6. **Filter by status arrays**:
   ```typescript
   statuses: ['active', 'trialing'] // Multiple statuses
   ```

7. **The fundamental MRR equation must balance:**
   ```
   End MRR = Start MRR + New MRR + Expansion MRR + Reactivation MRR 
             - Contraction MRR - Churned MRR
   ```

8. **Monitor webhooks** for real-time updates (optional but recommended)

---

## 📊 Quick Reference Table

| Metric | Primary Objects | Key Fields | Data Source |
|--------|----------------|------------|-------------|
| MRR | Membership, Plan | `status: 'active'`, `plan.id`, `renewal_price`, `billing_period` | Current API state |
| ARR | Membership, Plan | (MRR × 12) | Calculated |
| New MRR | Membership, Plan | `created_at`, `user.id`, `status` | API + user history |
| Expansion MRR | Membership, Plan, Snapshots | `plan.id`, historical pricing | **Requires snapshots** |
| Contraction MRR | Membership, Plan, Snapshots | `status: 'active'`, historical pricing | **Requires snapshots** |
| Churned MRR | Membership, Snapshots | `status`, `canceled_at`, historical pricing | **Requires snapshots** |
| Reactivation MRR | Membership, Plan | `user.id`, `created_at`, user history | API + user history |
| Customer Churn Rate | Membership, Snapshots | `status`, user count changes | **Requires snapshots** |
| ARPU/ARPA | Membership, Plan | `renewal_price`, unique `user.id` count | Current API state |
| LTV | Churn Rate, ARPA | ARPA / Churn Rate | Calculated |
| Active Trials | Membership | `status: 'trialing'` | Current API state |
| Trial Conversion | Membership, Snapshots | Status transitions | **Requires snapshots** |

---

## 💡 Critical Reminders

1. **MRR = Active Memberships × Plan Prices** (normalized to monthly), NOT payment history

2. **You MUST store daily snapshots** - the API doesn't provide historical state

3. **Use `renewal_price`** not `initial_price` for recurring revenue

4. **`billing_period` is in DAYS** - normalize to monthly by dividing by 30 (or more precisely by period length)

5. **The SDK handles pagination automatically** with `for await` - don't manually paginate

6. **Dates are ISO 8601 strings** - use `.toISOString()` for filters

7. **Filter by `statuses` array** for multiple status filtering

8. **Movement metrics require snapshots:** Expansion, Contraction, Churn all need historical data

---

**Document Version:** 2.0  
**Last Updated:** October 2025  
**API Version:** Current Whop SDK with cursor-based pagination
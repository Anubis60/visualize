# SaaS Metrics Analytics for Whop

A comprehensive analytics platform that tracks and visualizes SaaS metrics for Whop-powered businesses.

**Live App:** https://financier-xi.vercel.app/
**Architecture:** Webhook-based real-time updates with initial 365-day backfill
**SDK:** `@whop/sdk` (cursor-based pagination)
**API:** Whop REST API with GraphQL-style cursors

---

## 📋 Table of Contents

1. [How It Works (User Journey)](#-how-it-works-user-journey)
2. [Step 1: User Signup & Initial Backfill](#-step-1-user-signup--initial-backfill)
3. [Step 2: Webhook Setup for Real-Time Updates](#-step-2-webhook-setup-for-real-time-updates)
4. [Step 3: Ongoing Operation](#-step-3-ongoing-operation)
5. [SaaS Metrics Reference](#-saas-metrics-reference)
6. [Whop API Reference](#-whop-api-reference)

---

## 🚀 How It Works (User Journey)

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: USER SIGNUP                                        │
└─────────────────────────────────────────────────────────────┘
    ↓
User navigates to /dashboard/[company-id]
    ↓
Dashboard calls /api/webhooks/register
    ↓
Check: Is webhook already registered for this company?
    ↓
┌─────────────────────────────────────────────────────────────┐
│  AUTOMATIC WEBHOOK REGISTRATION (First Visit Only)          │
└─────────────────────────────────────────────────────────────┘
    ↓
[Register webhook via Whop SDK]
  • Create webhook for specific company (resourceId)
  • Subscribe to events:
    - membership.activated
    - membership.deactivated
    - payment.succeeded
    - payment.failed
  • Endpoint: /api/webhooks/whop/business
    ↓
[Store webhook registration in MongoDB]
  • webhookId, webhookSecret, companyId
    ↓
┌─────────────────────────────────────────────────────────────┐
│  INITIAL BACKFILL (One-Time, ~2-5 minutes)                  │
└─────────────────────────────────────────────────────────────┘
    ↓
[Fetch ALL Data from Whop API]
  • Memberships (all subscriptions ever)
  • Plans (all pricing tiers)
  • Payments (all transactions)
    ↓
[Generate 365 Days of Historical Snapshots]
  • Filter data by timestamps for each day
  • Calculate metrics (MRR, ARR, churn, etc.)
  • Store in MongoDB
    ↓
Result: 366 snapshots (today + 365 past days)
    ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: ONGOING OPERATION (Real-Time)                      │
└─────────────────────────────────────────────────────────────┘
    ↓
[Business Event Occurs]
  Customer subscribes, cancels, upgrades, etc.
    ↓
[Whop Sends Webhook] → /api/webhooks/whop
    ↓
[Trigger Fresh Snapshot]
  • Fetch current data from Whop API
  • Compare with previous snapshot
  • Calculate metrics + movements
  • Store new snapshot
    ↓
[Dashboard Updates in Real-Time]
```

---

## 📥 Step 1: User Signup & Initial Backfill

### What Happens When a User Signs Up

**Goal:** Register webhook with Whop for this company, then fetch all historical data and reconstruct 365 days of metrics.

### 1.0 Automatic Webhook Registration

When a user first visits their dashboard (`/dashboard/[companyId]`), the system automatically registers a webhook with Whop to listen for events specific to that company's business.

**Flow:**
```typescript
// Dashboard calls webhook registration endpoint
fetch('/api/webhooks/register', {
  method: 'POST',
  body: JSON.stringify({ companyId: 'biz_abc123' })
})

// Backend checks if webhook already exists
const isRegistered = await isWebhookRegistered(companyId);

if (!isRegistered) {
  // Register webhook with Whop SDK
  const result = await whopClient.webhooks.createWebhook({
    apiVersion: 'v1',
    enabled: true,
    events: [
      'membership.activated',
      'membership.deactivated',
      'payment.succeeded',
      'payment.failed'
    ],
    resourceId: companyId,  // The company to monitor
    url: 'https://financier-xi.vercel.app/api/webhooks/whop/business'
  });

  // Store webhook registration in database
  await db.collection('webhook_registrations').insertOne({
    companyId,
    webhookId: result.id,
    webhookSecret: result.webhookSecret,
    webhookUrl: result.url,
    events: result.events,
    enabled: true,
    createdAt: new Date()
  });

  // Trigger initial backfill (runs in background)
  await backfillCompanyHistory(companyId);
}
```

**Webhook Registration Details:**
- **Endpoint URL:** `https://financier-xi.vercel.app/api/webhooks/whop/business`
- **Events Subscribed:**
  - `membership.activated` - [docs](https://docs.whop.com/api-reference/memberships/membership-activated)
  - `membership.deactivated` - [docs](https://docs.whop.com/api-reference/memberships/membership-deactivated)
  - `payment.succeeded` - [docs](https://docs.whop.com/api-reference/payments/payment-succeeded)
  - `payment.failed` - [docs](https://docs.whop.com/api-reference/payments/payment-failed)
- **Resource ID:** The specific company ID (e.g., `biz_abc123`)
- **API Version:** v1

**Database Storage:**
```typescript
{
  companyId: "biz_abc123",
  webhookId: "wh_xxxxxxxxxx",          // Whop's webhook ID
  webhookSecret: "ws_xxxxxxxxxx",      // Unique secret for this webhook
  webhookUrl: "https://...",           // Our endpoint URL
  events: ["membership.activated", ...],
  enabled: true,
  createdAt: "2025-01-15T10:00:00Z"
}
```

**Why Per-Company Webhooks?**
- Each company gets its own dedicated webhook
- Whop only sends events for THAT specific company's business
- More secure (each webhook has its own secret)
- Easier to manage and debug

### 1.1 Data Fetching

```typescript
import Whop from '@whop/sdk';

const client = new Whop({
  appID: 'app_xxxxxxxxxxxxxx',
  apiKey: 'My API Key',
});

// Fetch ALL data from Whop API
async function fetchAllData(companyId: string) {
  console.log('Starting backfill for company:', companyId);

  // 1. Fetch all memberships (subscriptions)
  // Source: https://docs.whop.com/api-reference/memberships/list-memberships
  const memberships = [];
  for await (const membership of client.memberships.list({ company_id: companyId })) {
    memberships.push(membership);
  }

  // 2. Fetch all plans (pricing tiers)
  // Source: https://docs.whop.com/api-reference/plans/list-plans
  const plans = [];
  for await (const plan of client.plans.list({ company_id: companyId })) {
    plans.push(plan);
  }

  // 3. Fetch all payments (transactions)
  // Source: https://docs.whop.com/api-reference/payments/list-payments
  const payments = [];
  for await (const payment of client.payments.list({ company_id: companyId })) {
    payments.push(payment);
  }

  console.log(`✓ Fetched ${memberships.length} memberships`);
  console.log(`✓ Fetched ${plans.length} plans`);
  console.log(`✓ Fetched ${payments.length} payments`);

  return { memberships, plans, payments };
}
```

**Key Points:**
- The SDK's `for await` automatically handles cursor pagination
- We fetch ALL data, not just recent data
- Each object contains timestamps: `created_at`, `canceled_at`, `paid_at`, etc.

### 1.2 Reconstructing Historical Data

**How it works:** Use timestamps to determine what existed on each past date.

```typescript
async function generateHistoricalSnapshots(companyId: string) {
  // Fetch all current data
  const { memberships, plans, payments } = await fetchAllData(companyId);

  // Create plan lookup map
  const planMap = new Map();
  plans.forEach(plan => planMap.set(plan.id, plan));

  // Generate snapshots for past 365 days
  const now = new Date();

  for (let daysAgo = 365; daysAgo >= 0; daysAgo--) {
    const snapshotDate = new Date(now);
    snapshotDate.setDate(now.getDate() - daysAgo);
    snapshotDate.setHours(0, 0, 0, 0); // Midnight UTC

    const snapshotTimestamp = snapshotDate.getTime() / 1000; // Unix seconds

    // Filter memberships that existed on this date
    const membershipsOnDate = memberships.filter(m => {
      const createdAt = new Date(m.created_at).getTime() / 1000;
      const canceledAt = m.canceled_at ? new Date(m.canceled_at).getTime() / 1000 : Infinity;
      const expiresAt = m.renewal_period_end ? new Date(m.renewal_period_end).getTime() / 1000 : Infinity;

      return createdAt <= snapshotTimestamp &&           // Was created by then
             canceledAt > snapshotTimestamp &&           // Not canceled yet
             expiresAt > snapshotTimestamp;              // Not expired yet
    });

    // Filter payments that occurred by this date
    const paymentsOnDate = payments.filter(p => {
      const paidAt = p.paid_at ? new Date(p.paid_at).getTime() / 1000 : 0;
      return paidAt <= snapshotTimestamp;
    });

    // Calculate metrics for this specific date
    const snapshot = await calculateSnapshotMetrics({
      date: snapshotDate,
      memberships: membershipsOnDate,
      plans,
      payments: paymentsOnDate,
      companyId
    });

    // Store in database
    await saveSnapshot(snapshot);
  }

  console.log('✓ Backfill complete: 366 snapshots generated');
}
```

**Key Insight:** We're "time traveling" by filtering data based on timestamps to see what the business looked like on each historical date.

### 1.3 Calculate Metrics for Each Snapshot

```typescript
async function calculateSnapshotMetrics({ date, memberships, plans, payments, companyId }) {
  // Create plan lookup
  const planMap = new Map(plans.map(p => [p.id, p]));

  // Calculate MRR (Monthly Recurring Revenue)
  let totalMRR = 0;
  const activeMemberships = memberships.filter(m =>
    m.status === 'active' || m.status === 'trialing'
  );

  activeMemberships.forEach(membership => {
    const plan = planMap.get(membership.plan.id);
    if (plan && plan.plan_type === 'renewal') {
      // Normalize to monthly based on billing_period (in days)
      const monthlyAmount = (plan.renewal_price / plan.billing_period) * 30;
      totalMRR += monthlyAmount;
    }
  });

  // Calculate ARR (Annual Run Rate)
  const arr = totalMRR * 12;

  // Calculate ARPU (Average Revenue Per User)
  const uniqueUsers = new Set(activeMemberships.map(m => m.user.id));
  const arpu = totalMRR / uniqueUsers.size;

  // Calculate revenue
  const totalRevenue = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.total, 0);

  // Store snapshot
  return {
    companyId,
    date,
    mrr: {
      total: totalMRR,
      breakdown: {
        monthly: 0, // Calculate by billing_period
        annual: 0,
        quarterly: 0
      }
    },
    arr,
    arpu,
    activeCustomers: uniqueUsers.size,
    revenue: {
      total: totalRevenue,
      recurring: totalMRR * 30, // Approximate monthly
      nonRecurring: totalRevenue - (totalMRR * 30)
    },
    metadata: {
      totalMemberships: memberships.length,
      activeMemberships: activeMemberships.length,
      totalPayments: payments.length
    },
    rawData: {
      memberships,
      plans,
      payments
    }
  };
}
```

**Result:** After backfill, you have 366 snapshots showing historical metrics for every day over the past year.

---

## 🔔 Step 2: Real-Time Webhook Events

### How Webhooks Work After Registration

Once the webhook is registered (Step 1), Whop automatically sends events to your endpoint whenever something happens in the customer's business.

### 2.1 Webhook Payload Structure

```typescript
// All Whop webhooks follow this structure
interface WhopWebhookPayload {
  id: string;                // "msg_xxxxxxxxxxxxxxxxxxxxxxxx"
  api_version: string;       // "v1"
  timestamp: string;         // ISO 8601: "2025-01-01T00:00:00.000Z"
  type: string;              // Event type (see below)
  data: Membership | Payment; // Full object matching API response
}

// Example: membership.activated webhook
{
  "id": "msg_abc123...",
  "api_version": "v1",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "type": "membership.activated",
  "data": {
    "id": "mem_xyz789",
    "status": "active",
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-15T10:30:00.000Z",
    "user": {
      "id": "user_john123",
      "username": "john",
      "name": "John Doe"
    },
    "company": {
      "id": "biz_abc123",
      "title": "My SaaS Business"
    },
    "plan": {
      "id": "plan_50_monthly"
    },
    "canceled_at": null,
    "cancel_at_period_end": false
  }
}
```

### 2.2 Webhook Handler Implementation

```typescript
// app/api/webhooks/whop/business/route.ts

import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    // 1. Get raw body and signature
    const body = await request.text();
    const signature = request.headers.get('x-whop-signature');

    // 2. Verify webhook signature for security
    if (!verifyWhopSignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 3. Parse webhook payload
    const webhook: WhopWebhookPayload = JSON.parse(body);

    // 4. Extract company ID from webhook data
    const companyId = webhook.data.company.id;

    // 5. Handle different event types
    switch (webhook.type) {
      case 'membership.activated':
        // New subscription, trial started, or reactivation
        console.log(`[Webhook] New member activated: ${webhook.data.id}`);
        await captureCompanySnapshot(companyId);
        break;

      case 'membership.deactivated':
        // Cancellation, expiration, or payment failure
        console.log(`[Webhook] Member deactivated: ${webhook.data.id}`);
        await captureCompanySnapshot(companyId);
        break;

      case 'payment.succeeded':
        // Payment processed successfully (renewal, upgrade, etc.)
        console.log(`[Webhook] Payment succeeded: $${webhook.data.total}`);
        await captureCompanySnapshot(companyId);
        break;

      case 'payment.failed':
        // Payment attempt failed
        console.log(`[Webhook] Payment failed: ${webhook.data.id}`);
        await captureCompanySnapshot(companyId);
        break;

      case 'payment.pending':
        // Payment is processing (ACH, wire transfer, etc.)
        // Optional: You may skip snapshot for pending payments
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Verify Whop webhook signature
function verifyWhopSignature(payload: string, signature: string | null): boolean {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  // Whop uses Stripe-style signature format: t=timestamp,v1=signature
  const parts = signature.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  const signedPayload = `${parts.t}.${payload}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signedPayload);
  const expectedSignature = hmac.digest('hex');

  return expectedSignature === parts.v1;
}
```

**Key Points:**
- Webhooks are triggered by real business events (not on a schedule)
- Each webhook contains the full object (membership or payment)
- Always verify signatures to prevent unauthorized requests
- Extract `company.id` to know which customer's data changed

---

## 🔄 Step 3: Ongoing Operation

### What Happens When a Webhook is Received

Every time a webhook arrives, we capture a fresh snapshot of the company's metrics.

### 3.1 Snapshot Capture Process

```typescript
async function captureCompanySnapshot(companyId: string) {
  console.log(`[Snapshot] Starting capture for company: ${companyId}`);

  // 1. Fetch CURRENT data from Whop API (fresh state)
  const memberships = await getAllMemberships(companyId);
  const plans = await getAllPlans(companyId);
  const payments = await getAllPayments(companyId);

  // 2. Calculate current metrics
  const mrrData = calculateMRR(memberships, plans);
  const arr = calculateARR(mrrData.total);
  const arpu = calculateARPU(mrrData.total, memberships);

  // 3. Get previous snapshot for comparison (to detect movements)
  const previousSnapshot = await getPreviousSnapshot(companyId);

  // 4. Calculate MRR movements by comparing snapshots
  if (previousSnapshot) {
    const newMRR = calculateNewMRR(previousSnapshot, memberships, plans);
    const expansionMRR = calculateExpansionMRR(previousSnapshot, memberships, plans);
    const contractionMRR = calculateContractionMRR(previousSnapshot, memberships, plans);
    const churnedMRR = calculateChurnedMRR(previousSnapshot, memberships, plans);

    // Log the changes
    console.log(`[Snapshot] MRR Movement:`);
    console.log(`  New MRR: +$${newMRR.total}`);
    console.log(`  Expansion: +$${expansionMRR.total}`);
    console.log(`  Contraction: -$${contractionMRR.total}`);
    console.log(`  Churned: -$${churnedMRR.total}`);
  }

  // 5. Store new snapshot with current timestamp
  await saveSnapshot({
    companyId,
    timestamp: new Date(),
    mrr: mrrData,
    arr,
    arpu,
    // ... all other metrics
    rawData: { memberships, plans, payments }
  });

  console.log(`[Snapshot] ✓ Capture complete`);
}
```

### 3.2 Real-Time Movement Detection

**How we detect changes:**

```typescript
// Compare previous snapshot with current data to detect movements

function calculateExpansionMRR(previousSnapshot, currentMemberships, plans) {
  const planMap = new Map(plans.map(p => [p.id, p]));
  let expansionTotal = 0;
  let expansionCount = 0;

  // Build map of previous membership MRR
  const previousMRR = new Map();
  previousSnapshot.rawData.memberships.forEach(m => {
    const plan = planMap.get(m.plan.id);
    if (plan) {
      const monthlyAmount = (plan.renewal_price / plan.billing_period) * 30;
      previousMRR.set(m.id, monthlyAmount);
    }
  });

  // Compare with current memberships
  currentMemberships.forEach(m => {
    if (m.status !== 'active') return;

    const plan = planMap.get(m.plan.id);
    if (!plan) return;

    const currentAmount = (plan.renewal_price / plan.billing_period) * 30;
    const previousAmount = previousMRR.get(m.id) || 0;

    // If they're paying MORE now, that's expansion
    if (previousAmount > 0 && currentAmount > previousAmount) {
      expansionTotal += (currentAmount - previousAmount);
      expansionCount++;
    }
  });

  return { total: expansionTotal, customers: expansionCount };
}

function calculateChurnedMRR(previousSnapshot, currentMemberships) {
  let churnedTotal = 0;
  let churnedCount = 0;

  // IDs of currently active memberships
  const currentActiveIds = new Set(
    currentMemberships
      .filter(m => m.status === 'active')
      .map(m => m.id)
  );

  // Find memberships that WERE active but are NO LONGER
  previousSnapshot.rawData.memberships.forEach(m => {
    if (m.status === 'active' && !currentActiveIds.has(m.id)) {
      // This membership churned!
      const plan = planMap.get(m.plan.id);
      if (plan) {
        const monthlyAmount = (plan.renewal_price / plan.billing_period) * 30;
        churnedTotal += monthlyAmount;
        churnedCount++;
      }
    }
  });

  return { total: churnedTotal, customers: churnedCount };
}
```

**The fundamental equation:**
```
End MRR = Start MRR + New MRR + Expansion MRR - Contraction MRR - Churned MRR
```

### 3.3 Timeline Example

**Day 0: User signs up**
- Backfill creates 366 snapshots (past 365 days + today)

**Day 1, 10:30 AM: Customer subscribes to $50/month plan**
- Whop sends `membership.activated` webhook
- Your handler captures fresh snapshot
- MRR increases from $5,000 → $5,050
- New MRR: +$50

**Day 1, 2:15 PM: Different customer upgrades from $10 to $50**
- Whop sends `membership.activated` webhook (plan changed)
- Handler captures snapshot
- MRR increases from $5,050 → $5,090
- Expansion MRR: +$40

**Day 1, 5:45 PM: Customer cancels $30/month subscription**
- Whop sends `membership.deactivated` webhook
- Handler captures snapshot
- MRR decreases from $5,090 → $5,060
- Churned MRR: +$30

**Result:** Three snapshots created on Day 1, each triggered by a real event.

---

### 3.4 Handling Multiple Webhooks Per Day

**Question:** What happens when multiple business events occur in the same day?

**Answer:** Each webhook creates a separate snapshot with its own timestamp.

**Example - January 15, 2025:**

```
Database snapshots for this company:
[
  { timestamp: "2025-01-14T05:00:00Z", mrr: 5000 },  // Previous day
  { timestamp: "2025-01-15T10:30:00Z", mrr: 5050 },  // Event 1: New customer
  { timestamp: "2025-01-15T14:15:00Z", mrr: 5090 },  // Event 2: Upgrade
  { timestamp: "2025-01-15T17:45:00Z", mrr: 5060 },  // Event 3: Cancellation
  { timestamp: "2025-01-16T05:00:00Z", mrr: 5060 }   // Next day
]
```

### 3.5 How Charts Display Historical Data

**For Daily/Weekly/Monthly Views:** Charts use **daily aggregation** - one data point per day.

**Logic:** Show the **last snapshot of each day** (end-of-day value).

**Query Example:**
```typescript
// Aggregate snapshots by day, taking the latest snapshot from each day
db.snapshots.aggregate([
  {
    $match: {
      companyId: 'biz_abc123',
      timestamp: { $gte: startDate, $lte: endDate }
    }
  },
  {
    $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
      mrr: { $last: "$mrr.total" },        // Take last value of the day
      arr: { $last: "$arr" },
      activeCustomers: { $last: "$activeCustomers" },
      timestamp: { $max: "$timestamp" }    // Latest timestamp of that day
    }
  },
  { $sort: { _id: 1 } }
])
```

**Result for January 15:**
```javascript
[
  { date: "2025-01-14", mrr: 5000, timestamp: "2025-01-14T05:00:00Z" },
  { date: "2025-01-15", mrr: 5060, timestamp: "2025-01-15T17:45:00Z" },  // Last snapshot of Jan 15
  { date: "2025-01-16", mrr: 5060, timestamp: "2025-01-16T05:00:00Z" }
]
```

**Chart Display:**
```
MRR Trend (Last 7 Days)

5090 |            ╭─╮
5060 |          ╭─╯ ╰─────
5030 |        ╭─╯
5000 | ─────╯
     +─────────────────────
       1/14  1/15  1/16  1/17
```

**Why last snapshot of the day?**
- Represents the **end-of-day state** after all events
- Clean daily chart (not cluttered with intraday changes)
- Consistent with standard SaaS metrics reporting

**For Intraday/Hourly Views:** Show all snapshots with precise timestamps (useful for "Last 24 Hours" view).

### 3.6 How Users See Updated Data

**Important:** Webhooks update the database, but **charts don't automatically refresh** in the browser.

**User Experience:**

```
10:30 AM - User opens dashboard → Sees latest snapshot (MRR: $5,000)
10:35 AM - Webhook creates new snapshot (MRR: $5,050)
         - User's browser still shows $5,000 (stale)
10:40 AM - User refreshes page (F5) → Now sees $5,050 (fresh)
```

**To See Updated Data, Users Must:**
1. **Refresh the page** (manual F5)
2. Or implement **auto-refresh** (frontend polls API every X seconds)
3. Or implement **WebSockets/SSE** (server pushes updates to browser)

**Current Implementation:** Manual refresh required.

**Database State vs Browser State:**
- Database is updated in real-time by webhooks ✅
- Browser shows whatever was loaded at page load ⏸️
- User must refresh to see new data 🔄

---

## 📊 SaaS Metrics Reference

### Core Metrics

#### MRR (Monthly Recurring Revenue)

**Plain English:** The predictable revenue your business earns each month from active subscriptions.

**Formula:**
```
MRR = Σ (active memberships × normalized monthly price)
```

**Implementation:**
```typescript
function calculateMRR(memberships, plans) {
  const planMap = new Map(plans.map(p => [p.id, p]));
  let totalMRR = 0;

  memberships
    .filter(m => m.status === 'active' || m.status === 'trialing')
    .forEach(membership => {
      const plan = planMap.get(membership.plan.id);

      if (plan && plan.plan_type === 'renewal') {
        // Normalize to monthly based on billing_period (in days)
        const monthlyAmount = (plan.renewal_price / plan.billing_period) * 30;
        totalMRR += monthlyAmount;
      }
    });

  return totalMRR;
}
```

**Key Points:**
- Only count `plan_type: "renewal"` (not one-time purchases)
- Use `renewal_price`, not `initial_price`
- Normalize all billing periods to monthly (30 days)

---

#### ARR (Annual Run Rate)

**Plain English:** Your current MRR multiplied by 12.

**Formula:**
```
ARR = MRR × 12
```

**Implementation:**
```typescript
function calculateARR(mrr) {
  return mrr * 12;
}
```

---

#### ARPU (Average Revenue Per User)

**Plain English:** How much money, on average, each customer pays you per month.

**Formula:**
```
ARPU = Total MRR / Number of active unique customers
```

**Implementation:**
```typescript
function calculateARPU(mrr, memberships) {
  const activeUserIds = new Set(
    memberships
      .filter(m => m.status === 'active')
      .map(m => m.user.id)
  );

  return mrr / activeUserIds.size;
}
```

---

### Movement Metrics

#### New MRR

**Plain English:** Monthly recurring revenue added from brand new customers this period.

**Detection:** Compare with previous snapshot to find first-time memberships.

---

#### Expansion MRR

**Plain English:** Additional monthly revenue from existing customers who upgraded.

**Detection:** Compare membership plan prices between snapshots; find increases.

---

#### Contraction MRR

**Plain English:** Lost monthly revenue from existing customers who downgraded.

**Detection:** Compare membership plan prices between snapshots; find decreases.

---

#### Churned MRR

**Plain English:** Monthly recurring revenue lost from customers who completely canceled.

**Detection:** Find memberships that were `active` in previous snapshot but no longer exist or are `canceled`.

---

#### Reactivation MRR

**Plain English:** Monthly revenue regained from customers who previously canceled but came back.

**Detection:** Find users whose new membership was created after a previous membership was canceled.

---

### Churn & Retention

#### Customer Churn Rate

**Formula:**
```
Customer Churn Rate = (Customers Lost / Total Customers at Start) × 100
```

---

#### MRR Churn Rate

**Formulas:**
- **Gross MRR Churn:** `(Churned MRR + Contraction MRR) / MRR at period start`
- **Net MRR Churn:** `(Churned + Contraction - Expansion - Reactivation) / MRR at start`

---

## 🔑 Whop API Reference

### Membership Object

**Source:** https://docs.whop.com/api-reference/memberships/list-memberships

```typescript
{
  id: "mem_xxxxxxxxxxxxxx",
  status: "trialing" | "active" | "past_due" | "completed" | "canceled" | "expired",
  created_at: "2023-12-01T05:00:00.401Z",
  updated_at: "2023-12-01T05:00:00.401Z",
  canceled_at: "2023-12-01T05:00:00.401Z" | null,
  renewal_period_start: "2023-12-01T05:00:00.401Z",
  renewal_period_end: "2023-12-01T05:00:00.401Z",
  cancel_at_period_end: boolean,
  cancellation_reason: string | null,
  user: {
    id: "user_xxxxxxxxxxxxx",
    username: string,
    name: string
  },
  company: {
    id: "biz_xxxxxxxxxxxxxx",
    title: string
  },
  plan: {
    id: "plan_xxxxxxxxxxxxx"
  },
  product: {
    id: "prod_xxxxxxxxxxxxx",
    title: string
  },
  metadata: {}
}
```

**Key Fields for Metrics:**
- `status` - Current subscription state
- `created_at` - When subscription started
- `canceled_at` - When subscription was canceled (null if active)
- `renewal_period_end` - When subscription expires
- `plan.id` - Which pricing tier the customer is on

---

### Plan Object

**Source:** https://docs.whop.com/api-reference/plans/list-plans

```typescript
{
  id: "plan_xxxxxxxxxxxxx",
  created_at: "2023-12-01T05:00:00.401Z",
  updated_at: "2023-12-01T05:00:00.401Z",
  plan_type: "renewal" | "one_time",
  billing_period: number, // Days (30 = monthly, 365 = annual)
  initial_price: number,  // First charge
  renewal_price: number,  // Recurring charges (USE THIS FOR MRR!)
  trial_period_days: number,
  currency: "usd",
  visibility: "visible" | "hidden",
  product: {
    id: "prod_xxxxxxxxxxxxx",
    title: string
  },
  company: {
    id: "biz_xxxxxxxxxxxxxx",
    title: string
  }
}
```

**Critical for MRR:**
- Use `renewal_price` (not `initial_price`) for recurring revenue
- `billing_period` is in DAYS (30 = monthly, 365 = annual)
- Only count `plan_type: "renewal"` (ignore one-time purchases)

---

### Payment Object

**Source:** https://docs.whop.com/api-reference/payments/list-payments

```typescript
{
  id: "pay_xxxxxxxxxxxxxx",
  status: "paid" | "failed" | "pending",
  substatus: "succeeded" | "refunded" | "failed",
  created_at: "2023-12-01T05:00:00.401Z",
  paid_at: "2023-12-01T05:00:00.401Z" | null,
  refunded_at: "2023-12-01T05:00:00.401Z" | null,
  total: number,
  subtotal: number,
  refunded_amount: number,
  amount_after_fees: number,
  currency: "usd",
  plan: {
    id: "plan_xxxxxxxxxxxxx"
  },
  membership: {
    id: "mem_xxxxxxxxxxxxxx",
    status: string
  },
  user: {
    id: "user_xxxxxxxxxxxxx",
    name: string,
    email: string
  },
  company: {
    id: "biz_xxxxxxxxxxxxxx",
    title: string
  },
  billing_reason: "subscription_create" | "subscription_renewal" | ...,
  failure_message: string | null
}
```

**Note:** Payments are historical transactions. Use Memberships + Plans for MRR calculations, not Payments.

---

### Webhook Events

**Source:** https://docs.whop.com/webhooks

#### membership.activated
**Fired when:** New subscription, trial started, or reactivation
**Docs:** https://docs.whop.com/api-reference/memberships/membership-activated
**Payload:** Full Membership object

#### membership.deactivated
**Fired when:** Subscription canceled, expired, or payment failed
**Docs:** https://docs.whop.com/api-reference/memberships/membership-deactivated
**Payload:** Full Membership object

#### payment.succeeded
**Fired when:** Payment processed successfully (renewal, upgrade, etc.)
**Docs:** https://docs.whop.com/api-reference/payments/payment-succeeded
**Payload:** Full Payment object

#### payment.failed
**Fired when:** Payment attempt failed
**Docs:** https://docs.whop.com/api-reference/payments/payment-failed
**Payload:** Full Payment object

#### payment.pending
**Fired when:** Payment is processing (ACH, wire transfer, etc.)
**Docs:** https://docs.whop.com/api-reference/payments/payment-pending
**Payload:** Full Payment object

---

## 💡 Implementation Best Practices

### 1. SDK Pagination
The SDK handles cursor pagination automatically:
```typescript
for await (const item of client.memberships.list({ company_id })) {
  // SDK automatically fetches next pages
}
```

### 2. Plan Caching
Cache plan data to reduce API calls:
```typescript
const planMap = new Map();
for await (const plan of client.plans.list({ company_id })) {
  planMap.set(plan.id, plan);
}
```

### 3. MRR Calculation Rules
- Use `renewal_price`, not `initial_price`
- Only count `plan_type: "renewal"`
- Normalize to monthly: `(renewal_price / billing_period) * 30`

### 4. Date Handling
- Whop API returns ISO 8601 strings
- Convert to Unix timestamps for comparisons: `new Date(str).getTime() / 1000`

### 5. Webhook Security
- Always verify `x-whop-signature` header
- Use HMAC SHA-256 with your webhook secret
- Return 401 for invalid signatures

### 6. Snapshot Storage
Store raw data in each snapshot for future recalculations:
```typescript
{
  timestamp: Date,
  metrics: { mrr, arr, ... },
  rawData: {
    memberships: [...],  // Full objects
    plans: [...],
    payments: [...]
  }
}
```

### 7. No Cron Jobs
After initial backfill, webhooks handle ALL updates. No scheduled tasks needed!

---

## 📈 Quick Reference

| Metric | Calculation | Data Source |
|--------|------------|-------------|
| MRR | Sum of active membership monthly amounts | Memberships + Plans |
| ARR | MRR × 12 | Calculated |
| ARPU | MRR / Active unique users | Memberships |
| New MRR | Revenue from first-time customers | Snapshot comparison |
| Expansion MRR | Revenue increase from upgrades | Snapshot comparison |
| Contraction MRR | Revenue loss from downgrades | Snapshot comparison |
| Churned MRR | Revenue loss from cancellations | Snapshot comparison |
| Customer Churn | % of customers who canceled | Snapshot comparison |

---

**Document Version:** 3.0
**Last Updated:** January 2025
**Architecture:** Webhook-based real-time updates with initial 365-day backfill

**API Documentation:**
- [Whop Memberships API](https://docs.whop.com/api-reference/memberships/list-memberships)
- [Whop Plans API](https://docs.whop.com/api-reference/plans/list-plans)
- [Whop Payments API](https://docs.whop.com/api-reference/payments/list-payments)
- [Whop Webhooks](https://docs.whop.com/webhooks)

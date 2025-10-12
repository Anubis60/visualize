# Automated Snapshot System

This application includes an automated snapshot system that captures company data, memberships, transactions, and calculated metrics at 5:00 AM daily. This significantly improves performance by serving cached data from MongoDB instead of making API calls every time.

## How It Works

### 1. **Daily Snapshot Capture (5:00 AM)**
- A cron job runs automatically at 5:00 AM every day
- Captures complete data for all configured companies:
  - Company information (name, logo, banner)
  - All memberships with pagination
  - All plans
  - All transactions/payments
  - Calculated metrics (MRR, ARR, ARPU, subscribers)

### 2. **Fast Data Loading**
- API endpoints check for cached snapshots first
- If a recent snapshot exists, data is served from MongoDB (much faster!)
- If no snapshot exists, data is fetched from the Whop API
- Use `?force_refresh=true` to bypass cache and fetch fresh data

### 3. **Automatic Startup**
- The cron scheduler initializes when the Next.js app starts
- Uses Next.js instrumentation hook for reliable initialization
- No manual setup needed once configured

## Setup Instructions

### 1. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

Required variables:
- `COMPANY_IDS` - Comma-separated list of company IDs to snapshot
- `MONGODB_URI` - Your MongoDB connection string
- `WHOP_API_KEY` - Your Whop API key
- `NEXT_PUBLIC_APP_URL` - Your app URL (for cron job callbacks)
- `CRON_SECRET` - (Optional) Secret token for cron job authentication

Example:
```env
COMPANY_IDS=biz_xxxxxxxxxxxxx,biz_yyyyyyyyyyyyy
MONGODB_URI=mongodb://localhost:27017/myapp
WHOP_API_KEY=your_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=my-secret-token-123
```

### 2. Start the Application

```bash
npm run dev
# or
npm run build && npm start
```

The cron job will automatically initialize on startup.

### 3. Verify Setup

Check the console logs for:
```
✅ Cron jobs initialized successfully
   - Daily snapshot: 5:00 AM (America/New_York)
```

## Manual Testing

### Trigger Snapshot Manually

You can manually trigger a snapshot capture:

```bash
# Without authentication
curl http://localhost:3000/api/cron/snapshot

# With authentication (if CRON_SECRET is set)
curl -H "Authorization: Bearer your-cron-secret" http://localhost:3000/api/cron/snapshot
```

### Force Refresh Data

Bypass cache and fetch fresh data from API:

```bash
# Force refresh analytics
curl "http://localhost:3000/api/analytics?company_id=biz_xxx&force_refresh=true"

# Force refresh company
curl "http://localhost:3000/api/company?company_id=biz_xxx&force_refresh=true"

# Force refresh memberships
curl "http://localhost:3000/api/memberships?company_id=biz_xxx&force_refresh=true"

# Force refresh transactions
curl "http://localhost:3000/api/transactions?company_id=biz_xxx&force_refresh=true"
```

## API Endpoints

### Snapshot Endpoints

- `GET /api/cron/snapshot` - Trigger snapshot capture (runs automatically at 5am)
  - Optional: `Authorization: Bearer <CRON_SECRET>` header

### Data Endpoints (with caching)

All data endpoints now support:
- Automatic caching from snapshots
- `?force_refresh=true` to bypass cache
- `cached: true/false` in response to indicate data source

#### Analytics
```bash
GET /api/analytics?company_id=biz_xxx
GET /api/analytics?company_id=biz_xxx&force_refresh=true
```

#### Company
```bash
GET /api/company?company_id=biz_xxx
GET /api/company?company_id=biz_xxx&force_refresh=true
```

#### Memberships
```bash
GET /api/memberships?company_id=biz_xxx
GET /api/memberships?company_id=biz_xxx&force_refresh=true
```

#### Transactions
```bash
GET /api/transactions?company_id=biz_xxx
GET /api/transactions?company_id=biz_xxx&force_refresh=true
```

## Database Schema

### MetricsSnapshot Collection

```typescript
{
  _id: ObjectId
  companyId: string              // biz_xxx
  date: Date                     // Start of day UTC
  timestamp: Date                // When snapshot was taken

  // Calculated Metrics
  mrr: {
    total: number
    breakdown: {
      monthly: number
      annual: number
      quarterly: number
      other: number
    }
  }
  arr: number
  arpu: number
  subscribers: {
    active: number
    cancelled: number
    past_due: number
    trialing: number
    total: number
  }
  activeUniqueSubscribers: number

  // Raw cached data (for fast loading)
  rawData: {
    company: { id, title, logo, bannerImage }
    memberships: Array<Membership>
    plans: Array<Plan>
    transactions: Array<Transaction>
  }

  metadata: {
    totalMemberships: number
    activeMemberships: number
    plansCount: number
  }
}
```

## Cron Schedule

Default schedule: **5:00 AM daily** (America/New_York timezone)

To change the schedule, edit [lib/cron/scheduler.ts](lib/cron/scheduler.ts):

```typescript
// Cron format: minute hour day month weekday
snapshotJob = cron.schedule('0 5 * * *', async () => {
  // ... snapshot logic
}, {
  timezone: "America/New_York"  // Change timezone here
})
```

### Common Cron Patterns

- `0 5 * * *` - 5:00 AM daily
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Midnight daily
- `0 12 * * 1` - Noon every Monday

## Performance Benefits

### Before (API calls every time)
- ~5-10 seconds to load analytics
- Multiple API requests with pagination
- Rate limit concerns

### After (cached snapshots)
- ~100-300ms to load analytics
- Single MongoDB query
- No rate limit concerns
- Fresh data captured daily at 5am

## Monitoring

Check the logs for snapshot activity:

```
📸 Starting snapshot capture for company biz_xxx
  Fetching company data...
  Fetching memberships...
  Fetching plans...
  Fetching transactions...
  Calculating metrics...
  Storing snapshot...
✅ Snapshot captured successfully for biz_xxx
  - Memberships: 150
  - Plans: 5
  - Transactions: 320
  - MRR: $12,450.00
  - ARR: $149,400.00
```

When loading cached data:
```
📦 Using cached snapshot from 2025-10-11T05:00:00.000Z
```

## Troubleshooting

### Cron job not running
1. Check that `COMPANY_IDS` is set in your environment
2. Verify the app is running (cron only works while app is running)
3. Check console for initialization messages
4. For production, consider using external cron services (Vercel Cron, GitHub Actions)

### No cached data available
1. Wait for 5am or trigger manual snapshot
2. Check MongoDB connection
3. Verify `MONGODB_URI` is correct
4. Check console for snapshot errors

### Stale data
1. Snapshots update once daily at 5am
2. Use `?force_refresh=true` to get real-time data
3. Or manually trigger snapshot: `GET /api/cron/snapshot`

## Production Deployment

For production environments (Vercel, AWS, etc.):

### Option 1: Use External Cron Service

Many serverless platforms don't support long-running processes. Use external cron:

**Vercel Cron:**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/snapshot",
    "schedule": "0 5 * * *"
  }]
}
```

**GitHub Actions:**
```yaml
# .github/workflows/snapshot.yml
name: Daily Snapshot
on:
  schedule:
    - cron: '0 5 * * *'
jobs:
  snapshot:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger snapshot
        run: |
          curl -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
               https://yourdomain.com/api/cron/snapshot
```

### Option 2: Dedicated Server

If using a dedicated server (EC2, DigitalOcean, etc.), the built-in node-cron will work as-is.

## Files Created

- [lib/db/models/MetricsSnapshot.ts](lib/db/models/MetricsSnapshot.ts) - Extended with rawData field
- [lib/services/snapshotService.ts](lib/services/snapshotService.ts) - Snapshot capture logic
- [lib/cron/scheduler.ts](lib/cron/scheduler.ts) - Cron job scheduler
- [app/api/cron/snapshot/route.ts](app/api/cron/snapshot/route.ts) - Cron endpoint
- [instrumentation.ts](instrumentation.ts) - Next.js instrumentation hook
- Updated API routes with caching logic

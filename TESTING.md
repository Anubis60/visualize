# Testing the Snapshot System

## Overview
The snapshot system has been configured for testing in production:
- **Initial Snapshot**: Runs 10 seconds after the app starts
- **Dashboard Loading**: Shows cache status when using snapshot data
- **Daily Schedule**: After initial test, runs daily at 5:00 AM

> **📘 Deploying to Vercel?** See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for the complete guide including persistent cron jobs that survive deployments.

## Setup for Testing

### 1. Set Environment Variables

Create a `.env.local` file with:

```env
# Required
WHOP_API_KEY=your_whop_api_key
WHOP_APP_CLIENT_ID=your_client_id
WHOP_APP_CLIENT_SECRET=your_client_secret
MONGODB_URI=your_mongodb_connection_string
COMPANY_IDS=biz_xxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=https://your-production-url.com

# Optional
CRON_SECRET=your_secret_token
```

**Important**: `COMPANY_IDS` should be a comma-separated list of company IDs to capture snapshots for.

### 2. Deploy to Production

Deploy the application to your production environment (Vercel, AWS, etc.)

## Testing Flow

### Step 1: Start the Application
When the app starts, you'll see in the logs:
```
🚀 Initializing server instrumentation...
✅ Cron jobs initialized successfully
   - Initial snapshot: 10 seconds after startup
   - Daily snapshot: 5:00 AM (America/New_York)
🕐 Scheduling snapshot for 10 seconds from now...
```

### Step 2: Initial Load (No Cache)
1. Navigate to your dashboard: `/dashboard/biz_xxxxxxxxxxxxx`
2. The page will load data from the Whop API
3. You'll see "Loading analytics..." briefly
4. **No cache indicator** will show (this is expected - first load)

### Step 3: Wait 10 Seconds
After 10 seconds, the cron job will trigger:
```
🕐 Initial snapshot triggered (10 seconds after startup)...
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
✅ Initial snapshot completed
✅ Daily cron schedule activated: 5:00 AM (America/New_York)
```

### Step 4: Reload Dashboard (Using Cache)
1. Refresh the dashboard page
2. The page will load **much faster** (from MongoDB cache)
3. You'll see a **green badge** in the top-right:
   ```
   ● Using Cached Data
     [date] snapshot
   ```
4. Check the browser console logs:
   ```
   📦 Using cached snapshot from 2025-10-11T05:00:00.000Z
   ```

## Expected Performance

### Before Snapshot (API calls)
- Load time: ~5-10 seconds
- Multiple API requests with pagination
- Console shows: "📡 No cached snapshot available, fetching from API..."

### After Snapshot (Cached)
- Load time: ~100-300ms
- Single MongoDB query
- Console shows: "📦 Using cached snapshot from..."
- Green cache badge visible

## Manual Testing Endpoints

### Trigger Snapshot Manually
```bash
# Without auth
curl https://your-domain.com/api/snapshot/trigger?company_id=biz_xxx

# With auth (if CRON_SECRET is set)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://your-domain.com/api/cron/snapshot
```

### Force Refresh (Bypass Cache)
```bash
# Force fresh data from API
curl "https://your-domain.com/api/analytics?company_id=biz_xxx&force_refresh=true"
```

### Check Historical Data
```bash
# Get historical snapshots (last 30 days)
curl "https://your-domain.com/api/analytics/historical?company_id=biz_xxx&days=30"
```

## Troubleshooting

### Snapshot Not Running
1. Check logs for initialization messages
2. Verify `COMPANY_IDS` is set in environment variables
3. Verify `NEXT_PUBLIC_APP_URL` is correct
4. Check MongoDB connection

### Cache Not Working
1. Wait for the 10-second snapshot to complete
2. Check MongoDB for `metrics_snapshots` collection
3. Look for "rawData" field in snapshot documents
4. Verify company ID matches

### Still Using API After Snapshot
1. Check browser console for cache logs
2. Verify the response has `"cached": true`
3. Try force refresh: `?force_refresh=true`
4. Check if snapshot has `rawData` field

## Verifying in MongoDB

Connect to your MongoDB and check:

```javascript
// Find recent snapshots
db.metrics_snapshots.find({
  companyId: "biz_xxxxxxxxxxxxx"
}).sort({ date: -1 }).limit(1)

// Check if rawData exists
db.metrics_snapshots.findOne({
  companyId: "biz_xxxxxxxxxxxxx",
  "rawData": { $exists: true }
})
```

You should see:
- `rawData.company` - Company info
- `rawData.memberships` - Array of memberships
- `rawData.plans` - Array of plans
- `rawData.transactions` - Array of transactions

## What Success Looks Like

✅ **Initial Load (0-10 seconds)**
- Dashboard loads data from API
- Takes 5-10 seconds
- No cache badge

✅ **After 10 Seconds**
- Console shows snapshot capture started
- Snapshot completes successfully
- MongoDB has new snapshot with rawData

✅ **Second Load (10+ seconds)**
- Dashboard loads instantly (~300ms)
- Green "Using Cached Data" badge visible
- Console shows: "📦 Using cached snapshot..."

✅ **Daily Schedule**
- New snapshots captured at 5:00 AM daily
- No manual intervention needed
- Fresh data every day

## Going to Production

After testing is successful:

### For Vercel (Recommended)
✅ **Already configured!** The system automatically detects Vercel and uses Vercel Cron (configured in `vercel.json`).

- Cron jobs persist across deployments
- Initial snapshot still runs on cold starts
- Daily snapshots at 5:00 AM UTC via Vercel Cron

See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for details.

### For Dedicated Servers (EC2, DigitalOcean, etc.)
✅ **Already configured!** The built-in node-cron will handle daily snapshots.

- 10-second initial snapshot on startup
- Daily snapshots at 5:00 AM (America/New_York timezone)
- No external configuration needed

## Support

If you encounter issues:
1. Check the logs in your production environment
2. Verify all environment variables are set
3. Test the snapshot endpoint manually
4. Check MongoDB connection and data

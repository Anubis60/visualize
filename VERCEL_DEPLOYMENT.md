# Vercel Deployment Guide

## Overview

The snapshot system is configured to work seamlessly on Vercel with **persistent cron jobs** that survive deployments. Here's how it works:

### Architecture

1. **Initial Snapshot** - Runs 10 seconds after deployment/cold start
2. **Daily Snapshots** - Managed by Vercel Cron (configured in `vercel.json`)
3. **Cache-First Loading** - All API endpoints serve from MongoDB when available

### Why This Works on Vercel

- ❌ **Internal node-cron**: Doesn't persist across deployments (stateless)
- ✅ **Vercel Cron**: Persists across deployments (external scheduler)
- ✅ **Initial snapshot**: Ensures data is available immediately on cold starts

## Setup Steps

### 1. Configure Environment Variables

In your Vercel project dashboard, add these environment variables:

**Required:**
```
WHOP_API_KEY=your_whop_api_key
WHOP_APP_CLIENT_ID=your_client_id
WHOP_APP_CLIENT_SECRET=your_client_secret
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
COMPANY_IDS=biz_xxxxxxxxxxxxx,biz_yyyyyyyyyyyyy
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

**Optional:**
```
CRON_SECRET=your_random_secret_token_here
```

### 2. Deploy to Vercel

```bash
# Using Vercel CLI
vercel deploy

# Or push to GitHub (if connected)
git push origin main
```

### 3. Verify Vercel Cron Setup

After deployment, check your Vercel dashboard:

1. Go to your project
2. Click on "Cron Jobs" tab
3. You should see:
   - **Path**: `/api/cron/snapshot`
   - **Schedule**: `0 5 * * *` (5:00 AM UTC daily)
   - **Status**: Active ✓

## How It Works

### On Deployment (0 seconds)

```
🚀 Deploying to Vercel...
✅ Build successful
✅ Functions deployed
🕐 Scheduling initial snapshot for 10 seconds from now...
✅ Cron jobs initialized successfully
   - Initial snapshot: 10 seconds after startup
   - Daily snapshot: Managed by Vercel Cron (persists across deployments)
```

### Initial Snapshot (10 seconds)

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
✅ Initial snapshot completed
```

### Daily Snapshots (5:00 AM UTC)

Vercel automatically calls `/api/cron/snapshot` at 5:00 AM UTC daily:

```
🕐 Cron job triggered by Vercel
📸 Starting snapshot capture for all companies...
✅ All snapshots captured successfully
```

## Testing on Vercel

### 1. Check Deployment Logs

After deployment, view the Function logs:

```
Vercel Dashboard → Your Project → Deployments → Latest → View Function Logs
```

Look for:
- ✅ Initial snapshot scheduled
- ✅ Initial snapshot completed
- ✅ Vercel Cron detected

### 2. Load the Dashboard

Navigate to: `https://your-project.vercel.app/dashboard/biz_xxx`

**First Load (0-10 seconds):**
- Normal load time (5-10 seconds)
- No cache badge
- Console: "📡 No cached snapshot available, fetching from API..."

**After 10 Seconds:**
- Reload the page
- Fast load time (~300ms)
- Green "Using Cached Data" badge
- Console: "📦 Using cached snapshot from..."

### 3. Verify Cron Job Execution

In Vercel dashboard:

1. Go to "Cron Jobs" tab
2. Click on the snapshot job
3. View "Recent Executions"
4. Check logs for successful runs

### 4. Manual Trigger (Testing)

Trigger a snapshot manually via URL:

```bash
# Without auth
curl https://your-project.vercel.app/api/cron/snapshot

# With auth (if CRON_SECRET is set)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://your-project.vercel.app/api/cron/snapshot
```

## Vercel Cron Configuration

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/snapshot",
      "schedule": "0 5 * * *"
    }
  ]
}
```

### Schedule Format

Uses standard cron syntax:

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday = 0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

**Examples:**
- `0 5 * * *` - 5:00 AM UTC daily (current)
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Midnight UTC daily
- `0 12 * * 1` - Noon UTC every Monday

### Timezone Note

Vercel Cron runs in **UTC timezone**. To adjust:

- **5:00 AM EST** = `0 10 * * *` (UTC)
- **5:00 AM PST** = `0 13 * * *` (UTC)
- **5:00 AM GMT** = `0 5 * * *` (UTC)

## Deployment Persistence

### What Persists

✅ **Vercel Cron Jobs** - Configured in `vercel.json`, persists across deployments
✅ **MongoDB Data** - All snapshots stored in database
✅ **Environment Variables** - Set in Vercel dashboard
✅ **API Endpoints** - All cache-enabled endpoints

### What Resets

❌ **Internal node-cron** - Would reset on deployment (not used on Vercel)
❌ **In-memory state** - Serverless is stateless (not used)
❌ **Local timers** - Reset on cold starts (except initial 10-second snapshot)

## Benefits for Vercel

### 1. Survives Deployments
- Cron schedule persists even if you deploy 10 times a day
- No need to reconfigure after each deployment

### 2. No Cold Start Issues
- Initial 10-second snapshot ensures data is ready quickly
- Subsequent loads use cached data

### 3. Cost Efficient
- Reduces Whop API calls (one per day instead of per page load)
- Fewer function invocations (cache hits are faster)

### 4. Automatic Scaling
- Vercel manages the cron execution
- No need to worry about server uptime

## Monitoring

### Check Cron Status

```bash
# Vercel CLI
vercel env ls
vercel logs --follow
```

### MongoDB Check

Verify snapshots are being created:

```javascript
// Connect to MongoDB
db.metrics_snapshots.find({
  companyId: "biz_xxxxxxxxxxxxx"
}).sort({ date: -1 }).limit(5)

// Should show daily snapshots with rawData
```

### Response Headers

Check if data is cached:

```bash
curl -I "https://your-project.vercel.app/api/analytics?company_id=biz_xxx"
```

Response includes `"cached": true` in JSON body when using snapshot.

## Troubleshooting

### Cron Not Running

**Check Vercel Dashboard:**
1. Go to Cron Jobs tab
2. Verify job is listed and active
3. Check recent executions for errors

**Check vercel.json:**
```json
{
  "crons": [
    {
      "path": "/api/cron/snapshot",
      "schedule": "0 5 * * *"
    }
  ]
}
```

### Initial Snapshot Not Working

**Check Function Logs:**
- Look for "Initial snapshot triggered"
- Verify NEXT_PUBLIC_APP_URL is set correctly
- Check COMPANY_IDS environment variable

### Cache Not Working

**Verify:**
1. Initial snapshot completed (check logs)
2. MongoDB connection is working
3. Snapshot has `rawData` field
4. Company ID matches

## Local Development

For local testing, the system automatically uses internal node-cron instead of Vercel Cron:

```bash
npm run dev
```

You'll see:
```
✅ Cron jobs initialized successfully
   - Initial snapshot: 10 seconds after startup
   - Daily snapshot: 5:00 AM (America/New_York) via node-cron
```

## Production Checklist

Before deploying to production:

- [ ] All environment variables set in Vercel dashboard
- [ ] COMPANY_IDS contains all company IDs to snapshot
- [ ] MONGODB_URI points to production database
- [ ] NEXT_PUBLIC_APP_URL set to production domain
- [ ] CRON_SECRET set (optional but recommended)
- [ ] vercel.json committed to repository
- [ ] Tested initial snapshot on staging
- [ ] Verified MongoDB connection

## Support

### Vercel Cron Documentation
https://vercel.com/docs/cron-jobs

### Viewing Logs
```bash
# Via CLI
vercel logs --follow

# Via Dashboard
Vercel Dashboard → Your Project → Deployments → View Function Logs
```

### Debugging
1. Check Vercel function logs for errors
2. Verify environment variables are set
3. Test cron endpoint manually
4. Check MongoDB for snapshot data
5. Review browser console for cache status

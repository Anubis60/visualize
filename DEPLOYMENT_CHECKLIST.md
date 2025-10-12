# Vercel Deployment Checklist

Use this checklist to ensure your snapshot system is properly configured for Vercel.

## ✅ Pre-Deployment Checklist

### 1. Environment Variables Setup

In your Vercel project dashboard (Settings → Environment Variables), add:

- [ ] `WHOP_API_KEY` - Your Whop API key
- [ ] `WHOP_APP_CLIENT_ID` - Your Whop app client ID
- [ ] `WHOP_APP_CLIENT_SECRET` - Your Whop app client secret
- [ ] `MONGODB_URI` - MongoDB connection string (e.g., `mongodb+srv://...`)
- [ ] `COMPANY_IDS` - Comma-separated company IDs (e.g., `biz_xxx,biz_yyy`)
- [ ] `NEXT_PUBLIC_APP_URL` - Your Vercel app URL (e.g., `https://your-project.vercel.app`)
- [ ] `CRON_SECRET` - Random secret token for cron job authorization (⚠️ **IMPORTANT for security**)

**Generate a secure CRON_SECRET:**
```bash
# Option 1: Using openssl
openssl rand -hex 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 3: Use a password generator
# Example: dj8$kL2mN9pQ4rT6vX8yZ0aB2cD4eF6g
```

### 2. Code Configuration

Verify these files exist and are correct:

- [ ] `vercel.json` exists with cron configuration
  ```json
  {
    "crons": [{
      "path": "/api/cron/snapshot",
      "schedule": "0 5 * * *"
    }]
  }
  ```

- [ ] `instrumentation.ts` exists in project root
- [ ] `next.config.ts` has `instrumentationHook: true`
- [ ] All snapshot-related files are committed to git

### 3. MongoDB Setup

- [ ] MongoDB database is accessible from the internet (Vercel functions need access)
- [ ] MongoDB connection string includes authentication
- [ ] MongoDB Atlas: Whitelist IP `0.0.0.0/0` (all IPs) or Vercel's IP ranges
- [ ] Test connection string locally before deploying

## 🚀 Deployment

### Step 1: Deploy to Vercel

```bash
# Option A: Push to GitHub (if connected to Vercel)
git add .
git commit -m "Add snapshot system with Vercel Cron"
git push origin main

# Option B: Deploy directly with Vercel CLI
vercel deploy --prod
```

### Step 2: Verify Deployment

- [ ] Deployment successful (no build errors)
- [ ] All environment variables show in deployment
- [ ] Functions deployed successfully

### Step 3: Enable Vercel Cron

1. [ ] Go to Vercel Dashboard → Your Project
2. [ ] Click on "Cron Jobs" tab
3. [ ] Verify "Enabled" toggle is ON
4. [ ] Confirm job is listed:
   - **Path**: `/api/cron/snapshot`
   - **Schedule**: `0 5 * * *`
   - **Status**: Active ✓

## 🧪 Testing (10 Seconds After Deployment)

### Immediate Verification (0-10 seconds)

1. [ ] View deployment logs:
   ```
   Vercel Dashboard → Deployments → Latest → View Function Logs
   ```

2. [ ] Look for initialization messages:
   ```
   ✅ Cron jobs initialized successfully
      - Initial snapshot: 10 seconds after startup
      - Daily snapshot: Managed by Vercel Cron
   🕐 Scheduling initial snapshot for 10 seconds from now...
   ```

### After 10 Seconds

3. [ ] Check logs for snapshot trigger:
   ```
   🕐 Initial snapshot triggered (10 seconds after startup)...
   📸 Starting snapshot capture for company biz_xxx
   ✅ Snapshot captured successfully
   ```

4. [ ] Verify MongoDB has snapshot:
   ```javascript
   db.metrics_snapshots.findOne({
     companyId: "biz_xxx",
     "rawData": { $exists: true }
   })
   ```

### Dashboard Testing

5. [ ] Navigate to: `https://your-project.vercel.app/dashboard/biz_xxx`

6. [ ] **First load** (before 10 seconds):
   - [ ] Page loads (5-10 seconds)
   - [ ] No green cache badge
   - [ ] Console: "📡 No cached snapshot available..."

7. [ ] **Reload page** (after 10+ seconds):
   - [ ] Page loads fast (~300ms)
   - [ ] Green "Using Cached Data" badge visible
   - [ ] Console: "📦 Using cached snapshot..."

## 🔒 Security Verification

### CRON_SECRET Setup

1. [ ] `CRON_SECRET` environment variable is set in Vercel
2. [ ] Secret is long and random (32+ characters)
3. [ ] Test unauthorized access fails:
   ```bash
   # This should return 401 Unauthorized
   curl https://your-project.vercel.app/api/cron/snapshot
   ```

4. [ ] Test authorized access works (optional, will run automatically):
   ```bash
   # This should return 200 OK
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
        https://your-project.vercel.app/api/cron/snapshot
   ```

⚠️ **Note**: Vercel Cron automatically adds the `CRON_SECRET` to the Authorization header, so manual testing is optional.

## 📊 Monitor First Daily Cron Run

### Next Morning (5:00 AM UTC)

1. [ ] Check Vercel Cron Jobs tab for execution:
   - Go to: Vercel Dashboard → Cron Jobs → View Executions
   - Look for execution at ~5:00 AM UTC

2. [ ] Check function logs for success:
   ```
   🕐 Cron job triggered by Vercel
   📸 Starting snapshot capture for all companies...
   ✅ All snapshots captured successfully
   ```

3. [ ] Verify new snapshot in MongoDB:
   ```javascript
   db.metrics_snapshots.find({
     companyId: "biz_xxx"
   }).sort({ date: -1 }).limit(2)
   // Should show today's snapshot + yesterday's
   ```

## 🔄 Test Deployment Persistence

### Deploy a New Change

1. [ ] Make a small change (e.g., update README)
2. [ ] Deploy to Vercel
3. [ ] Check Cron Jobs tab - job should still be there
4. [ ] Verify schedule didn't change
5. [ ] Check next scheduled execution time

This confirms cron jobs persist across deployments! ✅

## 🎯 Success Criteria

All of these should be true:

- ✅ Dashboard loads in ~300ms with green cache badge
- ✅ Vercel Cron tab shows active job scheduled at 5:00 AM UTC
- ✅ MongoDB contains snapshots with `rawData` field
- ✅ Unauthorized requests to cron endpoint return 401
- ✅ Console logs show cache hits: "📦 Using cached snapshot..."
- ✅ After new deployment, cron job still exists
- ✅ Next morning, new snapshot appears in database

## 🐛 Troubleshooting

### Issue: Cron job not showing in Vercel dashboard

**Solutions:**
- [ ] Check `vercel.json` is in project root
- [ ] Verify JSON syntax is valid
- [ ] Redeploy after adding `vercel.json`
- [ ] Check Vercel Cron feature is enabled (toggle in Cron Jobs tab)

### Issue: Initial snapshot not running

**Solutions:**
- [ ] Check function logs for errors
- [ ] Verify `COMPANY_IDS` environment variable is set
- [ ] Verify `NEXT_PUBLIC_APP_URL` is correct
- [ ] Check MongoDB connection string

### Issue: Unauthorized errors (401)

**Solutions:**
- [ ] Verify `CRON_SECRET` is set in Vercel environment variables
- [ ] Check secret doesn't have extra spaces or quotes
- [ ] Redeploy after setting the secret

### Issue: MongoDB connection failed

**Solutions:**
- [ ] Check MongoDB Atlas network access allows `0.0.0.0/0`
- [ ] Verify connection string includes username and password
- [ ] Test connection string locally first
- [ ] Check database user has read/write permissions

### Issue: Cache not working

**Solutions:**
- [ ] Wait at least 10 seconds after deployment
- [ ] Check MongoDB for snapshot with `rawData` field
- [ ] Verify company ID in URL matches `COMPANY_IDS`
- [ ] Check function logs for snapshot success message

## 📖 Additional Resources

- [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) - Detailed Vercel deployment guide
- [TESTING.md](TESTING.md) - Testing instructions and flow
- [SNAPSHOT_SYSTEM.md](SNAPSHOT_SYSTEM.md) - System architecture
- [SUMMARY.md](SUMMARY.md) - Quick reference guide
- [Vercel Cron Jobs Docs](https://vercel.com/docs/cron-jobs)

## 🎉 You're Done!

If all checkboxes are ✅, your snapshot system is fully operational on Vercel!

**What happens now:**
- ⏰ Daily snapshots at 5:00 AM UTC
- ⚡ Fast page loads from cache
- 🔄 Persists across all deployments
- 🔒 Secured with CRON_SECRET
- 📊 Automatic data updates

**Enjoy your lightning-fast analytics dashboard!** 🚀

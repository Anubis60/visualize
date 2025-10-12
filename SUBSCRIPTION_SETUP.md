# Subscription System Setup Guide

This application uses Whop as the payment processor with a 14-day free trial system. The subscription system is fully integrated with webhooks for real-time updates.

## Architecture Overview

### Components

1. **SubscriptionModal** - Beautiful modal that prompts unpaid users to start their trial
2. **Database Models** - MongoDB collections for users, subscriptions, and companies
3. **API Endpoints**:
   - `/api/auth/user` - Verifies Whop user authentication
   - `/api/subscription/check` - Checks subscription status by companyId
   - `/api/subscription/checkout` - Creates Whop checkout session
   - `/api/webhooks/whop` - Receives real-time updates from Whop
4. **Dashboard Integration** - Automatically checks subscription on load and shows modal if needed

### Flow

1. User visits dashboard → Auth check → Subscription check
2. If no subscription → Show SubscriptionModal (dashboard blurred)
3. User clicks "Start Trial" → Creates checkout session → Redirects to Whop
4. User completes checkout → Whop sends webhook → Database updated
5. User returns to app → Has access for 14 days

## Setup Instructions

### 1. Whop Configuration

#### Create Product and Plan
1. Log into [Whop Dashboard](https://dash.whop.com)
2. Go to Products → Create New Product
3. Choose "Access Pass" type
4. Create a pricing plan with:
   - 14-day free trial
   - Recurring billing (monthly/yearly)
   - Set your price (e.g., $9.99/month)
5. Copy the following IDs:
   - **Plan ID** (starts with `plan_`)
   - **Access Pass ID** (starts with `pass_`)

#### Configure Webhook
1. In Whop Dashboard, go to Developers → Webhooks
2. Click "Create Webhook"
3. Set URL to: `https://yourdomain.com/api/webhooks/whop`
4. Subscribe to these events:
   - `membership.went_valid`
   - `membership.went_invalid`
   - `membership.metadata_updated`
   - `membership.cancel_at_period_end_changed`
   - `payment.succeeded` (optional, for monitoring)
   - `payment.failed` (optional, for monitoring)
5. Copy the **Webhook Secret** (starts with `whsec_`)

### 2. Environment Variables

Add these to your `.env` or `.env.local` file:

```bash
# Whop API Keys (already configured)
WHOP_API_KEY=your_whop_api_key
NEXT_PUBLIC_WHOP_APP_ID=your_app_id

# NEW: Subscription Configuration
WHOP_PLAN_ID=plan_xxxxxxxxxxxxx
NEXT_PUBLIC_ACCESS_PASS_ID=pass_xxxxxxxxxxxxx
WHOP_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# MongoDB (already configured)
MONGO_URI=mongodb://localhost:27017/financier
# or use MongoDB Atlas

# App URL (already configured)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 3. Database Collections

The system will automatically create these collections in MongoDB:

- **users** - Stores user data and subscription status
- **subscriptions** - Detailed subscription records
- **companies** - Company/tenant data (already exists)

No manual setup needed - collections are created on first use.

### 4. Testing

#### Test Locally

1. Start your dev server: `npm run dev`
2. Access dashboard without subscription
3. You should see the SubscriptionModal
4. Click "Start 14-Day Free Trial"
5. Complete checkout on Whop
6. Return to dashboard → Should have access

#### Test Webhooks

For local development, use [ngrok](https://ngrok.com/) or similar:

```bash
ngrok http 3000
```

Then update your Whop webhook URL to the ngrok URL:
```
https://your-ngrok-id.ngrok.io/api/webhooks/whop
```

#### Verify Webhook Processing

Check your server logs for:
```
Webhook request received: { hasSignature: true, ... }
Processing membership_went_valid: mem_xxxxx
Updated subscription for user user_xxxxx to trial
```

## Subscription States

| Status | Description | Has Access |
|--------|-------------|------------|
| `trial` | In 14-day free trial | ✅ Yes |
| `active` | Paid subscription active | ✅ Yes |
| `expired` | Subscription ended | ❌ No |
| `cancelled` | Cancelled but may have access until period end | Depends on `cancelAtPeriodEnd` |

## User Experience

### First Time User
1. Visits dashboard
2. Sees beautiful modal with:
   - "Start Your 14-Day Free Trial"
   - Feature highlights
   - "No credit card required"
3. Clicks button → Redirected to Whop
4. Completes sign-up
5. Returns with full access

### During Trial
- Full access to all features
- Trial days remaining shown (optional, can add to UI)
- No payment required

### After Trial
- If paid: Continues with full access
- If not paid: Modal appears again with payment prompt

### Webhook Events

The system handles these automatically:

- `membership_went_valid` → Grant access (trial or paid)
- `membership_went_invalid` → Revoke access
- `membership_cancel_at_period_end_changed` → Update cancellation status

## Customization

### Change Trial Length

Edit [/api/subscription/checkout/route.ts](app/api/subscription/checkout/route.ts):

```typescript
const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days
// Change to: 7 * 24 * 60 * 60 * 1000 for 7 days
```

Also update the plan in Whop Dashboard to match.

### Customize Modal

Edit [components/SubscriptionModal.tsx](components/SubscriptionModal.tsx):

- Change features listed
- Update colors (purple/indigo gradient)
- Modify pricing text
- Add/remove trust badges

### Disable Subscription Checks

To test without subscription checks, comment out in [app/dashboard/[companyId]/layout.tsx](app/dashboard/[companyId]/layout.tsx):

```typescript
// if (!subscriptionData.hasAccess) {
//   setShowSubscriptionModal(true)
// }
```

## Troubleshooting

### Modal doesn't appear
- Check console for errors
- Verify `/api/subscription/check` returns `hasAccess: false`
- Ensure MongoDB is running
- Check that subscription collection is empty for that company

### Webhook not working
- Verify webhook URL is publicly accessible
- Check webhook secret is correct
- Look for signature verification errors in logs
- Test with Whop's webhook test feature

### User stuck without access after payment
- Check MongoDB subscriptions collection
- Verify webhook was received (check logs)
- Manually check subscription status via Whop API
- Look for errors in webhook processing logs

### Database errors
- Ensure MONGO_URI is correct
- Check MongoDB is running
- Verify database name matches in code
- Check MongoDB connection logs

## Security Notes

1. **Webhook Signature Verification** - Always verify webhook signatures in production
2. **Environment Variables** - Never commit `.env` files with real credentials
3. **MongoDB Access** - Use strong passwords and restrict network access
4. **API Keys** - Rotate keys regularly and use different keys for dev/prod

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test webhook delivery in Whop dashboard
4. Check MongoDB collections for data consistency

## Future Enhancements

Potential improvements:
- Add subscription management UI (cancel, update payment)
- Show trial days remaining in dashboard
- Add email notifications for trial ending
- Implement grace period after trial
- Add usage-based billing
- Support multiple subscription tiers

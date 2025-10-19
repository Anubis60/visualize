import Whop from '@whop/sdk';

// Main SDK client for Whop API
export const whopClient = new Whop({
  appID: process.env.NEXT_PUBLIC_WHOP_APP_ID ?? "",
  apiKey: process.env.WHOP_API_KEY ?? "",
});

// Legacy export for backwards compatibility during migration
export const whopSdk = whopClient;

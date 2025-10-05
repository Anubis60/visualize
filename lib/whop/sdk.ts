import { WhopServerSdk } from "@whop/api";

export const whopSdk = WhopServerSdk({
  // Add your app id here - this is required.
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID ?? "",

  // Add your app api key here - this is required.
  appApiKey: process.env.WHOP_API_KEY ?? "",

  // DO NOT add companyId or onBehalfOfUserId for dashboard apps
  // These will be set dynamically per request
});

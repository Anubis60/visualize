import { WhopServerSdk } from "@whop/api";

export const whopSdk = WhopServerSdk({
  // App ID from environment
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID ?? "",

  // App API key from environment
  appApiKey: process.env.WHOP_API_KEY ?? "",

  // Agent user ID for making requests on behalf of
  onBehalfOfUserId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,

  // Default company ID
  companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
});

import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect to dashboard with default company ID from environment
  const companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || 'biz_EnCHQTdnwHWi19'
  redirect(`/dashboard/${companyId}`)
}

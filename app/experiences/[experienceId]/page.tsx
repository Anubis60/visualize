import { redirect } from 'next/navigation'

export default async function ExperiencePage() {
  // Redirect experiences to dashboard
  const companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || 'biz_EnCHQTdnwHWi19'
  redirect(`/dashboard/${companyId}`)
}

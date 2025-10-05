import { Sidebar } from '@/components/Sidebar'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ companyId: string }>
}) {
  const { companyId } = await params

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar companyId={companyId} />
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  )
}

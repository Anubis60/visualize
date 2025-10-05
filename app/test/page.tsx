export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4">✅ Financier App is Working!</h1>
        <p className="text-gray-600">If you can see this, the app is deployed correctly.</p>
        <div className="mt-4 space-y-2">
          <p className="text-sm"><strong>App ID:</strong> {process.env.NEXT_PUBLIC_WHOP_APP_ID || 'Not set'}</p>
          <p className="text-sm"><strong>Company ID:</strong> {process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || 'Not set'}</p>
        </div>
        <div className="mt-6">
          <a href={`/dashboard/${process.env.NEXT_PUBLIC_WHOP_COMPANY_ID}`} className="text-blue-600 hover:underline">
            → Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}

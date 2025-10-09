export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Financier Analytics</h1>
        <p className="text-gray-600 mb-8">
          Access your dashboard through Whop or navigate directly to:<br />
          <code className="text-sm bg-gray-100 px-2 py-1 rounded">/dashboard/[your-company-id]</code>
        </p>
      </div>
    </div>
  )
}

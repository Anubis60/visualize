'use client'

interface DataTableProps {
  data: Array<{ date: string; value: number }>
  label?: string
}

export function DataTable({ data, label = 'Value' }: DataTableProps) {
  if (data.length === 0) {
    return null
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Breakdown</h3>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider sticky left-0 bg-gradient-to-r from-gray-50 to-gray-100 z-10">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                {label}
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Change
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                % Change
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => {
              const prevItem = index > 0 ? data[index - 1] : null
              const change = prevItem ? item.value - prevItem.value : 0
              const percentChange = prevItem && prevItem.value !== 0
                ? ((item.value - prevItem.value) / prevItem.value) * 100
                : 0

              return (
                <tr key={item.date} className="hover:bg-purple-50/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                    {item.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                    ${item.value.toFixed(2)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                    change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {change > 0 ? '+' : ''}{change.toFixed(2)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                    percentChange > 0 ? 'text-green-600' : percentChange < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {index > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        {percentChange > 0 ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : percentChange < 0 ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : null}
                        {percentChange.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-100">
          <div className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-1">
            Average
          </div>
          <div className="text-xl font-bold text-purple-900">
            ${(data.reduce((sum, item) => sum + item.value, 0) / data.length).toFixed(2)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
          <div className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">
            Highest
          </div>
          <div className="text-xl font-bold text-green-900">
            ${Math.max(...data.map(d => d.value)).toFixed(2)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 border border-orange-100">
          <div className="text-xs font-semibold text-orange-700 uppercase tracking-wider mb-1">
            Lowest
          </div>
          <div className="text-xl font-bold text-orange-900">
            ${Math.min(...data.map(d => d.value)).toFixed(2)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-100">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
            Total Growth
          </div>
          <div className="text-xl font-bold text-blue-900">
            {data.length > 1 && data[0].value !== 0
              ? `${(((data[data.length - 1].value - data[0].value) / data[0].value) * 100).toFixed(2)}%`
              : '0%'
            }
          </div>
        </div>
      </div>
    </div>
  )
}

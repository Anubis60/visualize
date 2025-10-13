'use client'

interface DataTableProps {
  data: Array<{ date: string; value: number; fullDate?: string }>
  label?: string
}

export function DataTable({ data, label = 'Value' }: DataTableProps) {
  if (data.length === 0) {
    return null
  }

  // Limit to most recent 5 months
  const displayData = data.slice(-5)

  // Calculate statistics for each month
  const getRowData = (dataKey: 'value' | 'change' | 'percentChange') => {
    return displayData.map((item, index) => {
      if (dataKey === 'value') {
        return item.value
      } else if (dataKey === 'change') {
        const prevItem = index > 0 ? displayData[index - 1] : null
        return prevItem ? item.value - prevItem.value : null
      } else {
        const prevItem = index > 0 ? displayData[index - 1] : null
        if (!prevItem || prevItem.value === 0) return null
        return ((item.value - prevItem.value) / prevItem.value) * 100
      }
    })
  }

  const values = getRowData('value')
  const changes = getRowData('change')
  const percentChanges = getRowData('percentChange')

  // Format date to show month name
  const formatMonthName = (item: { date: string; fullDate?: string }) => {
    try {
      // Use fullDate if available (ISO format like "2025-10-13"), otherwise fall back to date
      const dateStr = item.fullDate || item.date
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    } catch {
      return item.date
    }
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Breakdown</h3>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider sticky left-0 bg-gradient-to-r from-gray-50 to-gray-100 z-10">
                Metric
              </th>
              {displayData.map((item) => (
                <th key={item.date} className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  {formatMonthName(item)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Value Row */}
            <tr className="hover:bg-purple-50/30 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                {label}
              </td>
              {values.map((value, index) => (
                <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                  {value !== null ? `$${value.toFixed(2)}` : '-'}
                </td>
              ))}
            </tr>

            {/* Change Row */}
            <tr className="hover:bg-purple-50/30 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                Change
              </td>
              {changes.map((change, index) => (
                <td
                  key={index}
                  className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                    change === null ? 'text-gray-400' : change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}
                >
                  {change !== null ? `${change > 0 ? '+' : ''}${change.toFixed(2)}` : '-'}
                </td>
              ))}
            </tr>

            {/* % Change Row */}
            <tr className="hover:bg-purple-50/30 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                % Change
              </td>
              {percentChanges.map((percentChange, index) => (
                <td
                  key={index}
                  className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                    percentChange === null ? 'text-gray-400' : percentChange > 0 ? 'text-green-600' : percentChange < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}
                >
                  {percentChange !== null ? (
                    <span className="inline-flex items-center justify-end gap-1">
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
                    '-'
                  )}
                </td>
              ))}
            </tr>
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
            ${(displayData.reduce((sum, item) => sum + item.value, 0) / displayData.length).toFixed(2)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
          <div className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">
            Highest
          </div>
          <div className="text-xl font-bold text-green-900">
            ${Math.max(...displayData.map(d => d.value)).toFixed(2)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 border border-orange-100">
          <div className="text-xs font-semibold text-orange-700 uppercase tracking-wider mb-1">
            Lowest
          </div>
          <div className="text-xl font-bold text-orange-900">
            ${Math.min(...displayData.map(d => d.value)).toFixed(2)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-100">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
            Total Growth
          </div>
          <div className="text-xl font-bold text-blue-900">
            {displayData.length > 1 && displayData[0].value !== 0
              ? `${(((displayData[displayData.length - 1].value - displayData[0].value) / displayData[0].value) * 100).toFixed(2)}%`
              : '0%'
            }
          </div>
        </div>
      </div>
    </div>
  )
}

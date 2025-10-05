import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: MetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-gray-500" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
        {trend && (
          <p
            className={cn(
              "text-xs font-medium mt-2",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}
          >
            {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            <span className="text-gray-500 ml-1">from last period</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}

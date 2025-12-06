"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

// Dummy data for top 5 most frequently occurring issues
const TOP_ISSUES = [
  {
    id: 1,
    name: "Missing Required Fields",
    count: 1247,
    percentage: 32,
    color: "bg-rose-400/70",
    lightColor: "bg-rose-400/20",
    description: "Empty or null values in mandatory columns"
  },
  {
    id: 2,
    name: "Invalid Date Format",
    count: 892,
    percentage: 23,
    color: "bg-amber-400/70",
    lightColor: "bg-amber-400/20",
    description: "Dates not matching expected format"
  },
  {
    id: 3,
    name: "Duplicate Records",
    count: 654,
    percentage: 17,
    color: "bg-violet-400/70",
    lightColor: "bg-violet-400/20",
    description: "Identical rows detected in dataset"
  },
  {
    id: 4,
    name: "Data Type Mismatch",
    count: 521,
    percentage: 14,
    color: "bg-sky-400/70",
    lightColor: "bg-sky-400/20",
    description: "Values don't match column data type"
  },
  {
    id: 5,
    name: "Out of Range Values",
    count: 398,
    percentage: 10,
    color: "bg-teal-400/70",
    lightColor: "bg-teal-400/20",
    description: "Numeric values outside acceptable bounds"
  }
]

export function TopIssuesChart() {
  const totalIssues = TOP_ISSUES.reduce((sum, issue) => sum + issue.count, 0)

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Top Data Quality Issues
          </CardTitle>
          <div className="text-right">
            <span className="text-lg font-bold">{totalIssues.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground ml-1">total</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-4">
        {/* Compact treemap-style visualization */}
        <div className="grid grid-cols-12 gap-1 h-20 mb-4">
          {TOP_ISSUES.map((issue, index) => (
            <div
              key={issue.id}
              className={cn(
                "rounded-md flex items-center justify-center text-white font-semibold text-xs transition-all hover:opacity-90 cursor-default",
                issue.color,
                index === 0 ? "col-span-4 row-span-2" : 
                index === 1 ? "col-span-4 row-span-2" :
                index === 2 ? "col-span-4 row-span-1" :
                index === 3 ? "col-span-2 row-span-1" :
                "col-span-2 row-span-1"
              )}
              title={`${issue.name}: ${issue.count} issues (${issue.percentage}%)`}
            >
              <span className="text-center">
                <span className="block text-sm font-bold">{issue.percentage}%</span>
              </span>
            </div>
          ))}
        </div>

        {/* Compact detailed list */}
        <div className="space-y-2">
          {TOP_ISSUES.map((issue, index) => (
            <div key={issue.id} className="flex items-center gap-2">
              <span className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                issue.color
              )}>
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">{issue.name}</span>
                  <span className="text-xs font-semibold tabular-nums shrink-0">
                    {issue.count.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                  <div
                    className={cn("h-full rounded-full", issue.color)}
                    style={{ width: `${issue.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

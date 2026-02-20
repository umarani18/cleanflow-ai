/**
 * dq-charts.tsx — Barrel file
 *
 * This file re-exports all chart components so that existing consumer imports
 * (`from '@/components/dashboard/dq-charts'`) continue working unchanged.
 *
 * New code should import directly from the focused modules:
 *   - chart-constants           — shared colors, config, DqChartsProps
 *   - professional-charts-carousel — carousel of analytics charts
 *   - monthly-trends-compact    — compact trends sidebar widget
 *   - processing-summary        — processing summary card
 */

"use client";

import { useEffect, useState, useMemo, memo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  OverallDqReportResponse,
  fileManagementAPI,
} from "@/lib/api/file-management-api";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Loader2,
  TrendingUp,
  FileText,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { CHART_COLORS, chartConfig, type DqChartsProps } from "./chart-constants";
import { ProfessionalChartsCarousel } from "./professional-charts-carousel";

// Re-export sub-components for backwards compatibility
export { MonthlyTrendsCompact } from "./monthly-trends-compact";
export { ProcessingSummary } from "./processing-summary";
export { ProfessionalChartsCarousel } from "./professional-charts-carousel";
export type { DqChartsProps } from "./chart-constants";

function DqChartsComponent({ files }: DqChartsProps) {
  const { idToken } = useAuth();
  const [overallReport, setOverallReport] =
    useState<OverallDqReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    const loadOverallReport = async () => {
      if (!idToken) return;
      try {
        const report = await fileManagementAPI.downloadOverallDqReport(idToken);
        setOverallReport(report);
      } catch (error: any) {
        const message = (error?.message || "").toLowerCase();
        if (!message.includes("permission denied") && !message.includes("organization membership required")) {
          console.error("Error loading overall DQ report:", error);
        }
        // Use file data as fallback
      } finally {
        setLoading(false);
      }
    };
    loadOverallReport();
  }, [idToken]);

  // Memoize file categorization to avoid filtering on every render
  const { completedFiles, processingFiles, failedFiles } = useMemo(() => ({
    completedFiles: files.filter((f) => f.status === "DQ_FIXED"),
    processingFiles: files.filter((f) =>
      ["DQ_RUNNING", "NORMALIZING", "QUEUED", "UPLOADING"].includes(f.status)
    ),
    failedFiles: files.filter((f) =>
      ["DQ_FAILED", "UPLOAD_FAILED"].includes(f.status)
    ),
  }), [files]);

  // Memoize row calculations
  const { totalRowsIn, totalRowsFixed, totalRowsQuarantined, totalRowsOut, avgDqScore } = useMemo(() => {
    const rowsIn = completedFiles.reduce((sum, f) => sum + (f.rows_in || 0), 0);
    const rowsFixed = completedFiles.reduce((sum, f) => sum + (f.rows_fixed || 0), 0);
    const rowsQuarantined = completedFiles.reduce((sum, f) => sum + (f.rows_quarantined || 0), 0);
    const avgScore = completedFiles.length > 0
      ? completedFiles.reduce((sum, f) => sum + (f.dq_score || 0), 0) / completedFiles.length
      : 0;
    return {
      totalRowsIn: rowsIn,
      totalRowsFixed: rowsFixed,
      totalRowsQuarantined: rowsQuarantined,
      totalRowsOut: rowsIn - rowsQuarantined,
      avgDqScore: avgScore,
    };
  }, [completedFiles]);

  // Memoize data quality distribution pie chart data
  const dqDistributionData = useMemo(() => [
    {
      name: "Validated",
      value: totalRowsOut - totalRowsFixed,
      fill: CHART_COLORS.green,
    },
    { name: "Fixed", value: totalRowsFixed, fill: CHART_COLORS.yellow },
    {
      name: "Quarantined",
      value: totalRowsQuarantined,
      fill: CHART_COLORS.red,
    },
  ].filter((d) => d.value > 0), [totalRowsOut, totalRowsFixed, totalRowsQuarantined]);

  // Memoize file status distribution
  const fileStatusData = useMemo(() => [
    {
      name: "Completed",
      value: completedFiles.length,
      fill: CHART_COLORS.greenSoft,
    },
    {
      name: "Processing",
      value: processingFiles.length,
      fill: CHART_COLORS.blueSoft,
    },
    { name: "Failed", value: failedFiles.length, fill: CHART_COLORS.redSoft },
  ].filter((d) => d.value > 0), [completedFiles.length, processingFiles.length, failedFiles.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Files</span>
            </div>
            <div className="text-2xl font-bold">{files.length}</div>
            <p className="text-xs text-muted-foreground">
              {completedFiles.length} files processed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">
                Avg DQ
              </span>
            </div>
            <div className={`text-2xl font-bold ${avgDqScore >= 90 ? "text-green-500" : avgDqScore >= 70 ? "text-yellow-500" : "text-red-500"}`}>{avgDqScore.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">
                Rows Processed
              </span>
            </div>
            <div className="text-2xl font-bold">
              {totalRowsIn.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalRowsOut.toLocaleString()} valid output rows
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">
                Issues Resolved
              </span>
            </div>
            <div className="text-2xl font-bold">
              {totalRowsFixed.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalRowsQuarantined.toLocaleString()} quarantined
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row: DQ Score Distribution (1/2) + Data Quality Distribution (1/2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Data Quality Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-semibold">
              Data Quality Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown of processed rows by quality status
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-1">
            {dqDistributionData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <PieChart>
                  <Pie
                    data={dqDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${((percent as number) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                    strokeWidth={0}
                  >
                    {dqDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-xs">
                No records available
              </div>
            )}
          </CardContent>
        </Card>

        {/* DQ Score Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-semibold">
              Data Quality Score Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Files grouped by quality score ranges
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-1">
            {completedFiles.length > 0 ? (
              (() => {
                const excellent = completedFiles.filter(
                  (f) => (f.dq_score || 0) >= 90
                ).length;
                const good = completedFiles.filter(
                  (f) => (f.dq_score || 0) >= 70 && (f.dq_score || 0) < 90
                ).length;
                const bad = completedFiles.filter(
                  (f) => (f.dq_score || 0) < 70
                ).length;

                const scoreDistData = [
                  {
                    name: "Excellent (90-100%)",
                    value: excellent,
                    fill: CHART_COLORS.greenSoft,
                  },
                  {
                    name: "Good (70-89%)",
                    value: good,
                    fill: CHART_COLORS.yellowSoft,
                  },
                  {
                    name: "Bad (<70%)",
                    value: bad,
                    fill: CHART_COLORS.redSoft,
                  },
                ].filter((d) => d.value > 0);

                return (
                  <div className="flex flex-col gap-3">
                    <ChartContainer
                      config={chartConfig}
                      className="h-[180px] w-full"
                    >
                      <BarChart
                        data={scoreDistData}
                        layout="vertical"
                        margin={{ left: 0, right: 10 }}
                      >
                        <XAxis type="number" stroke="#9CA3AF" fontSize={10} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={110}
                          tick={{ fontSize: 10 }}
                          stroke="#9CA3AF"
                        />
                        <ChartTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-background border rounded-lg shadow-md p-2 text-xs">
                                  <p className="font-medium">
                                    {payload[0].payload.name}
                                  </p>
                                  <p className="text-muted-foreground">
                                    {payload[0].value} files
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {scoreDistData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                    <div className="flex gap-2 justify-center">
                      <div className="p-2 rounded-lg bg-green-500/10 text-center flex-1">
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                          {excellent}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Excellent
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-yellow-500/10 text-center flex-1">
                        <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                          {good}
                        </p>
                        <p className="text-xs text-muted-foreground">Good</p>
                      </div>
                      <div className="p-2 rounded-lg bg-red-500/10 text-center flex-1">
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">
                          {bad}
                        </p>
                        <p className="text-xs text-muted-foreground">Bad</p>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-xs">
                No processed files available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Professional Charts Carousel */}
      <Card className="border-0 shadow-sm">
        <CardContent className="px-4 pb-4 pt-2">
          <ProfessionalChartsCarousel files={files} />
        </CardContent>
      </Card>
    </div>
  );
}

// Export memoized component to prevent re-renders when parent re-renders with same props
export const DqCharts = memo(DqChartsComponent);

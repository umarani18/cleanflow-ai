"use client";

import { useEffect, useState } from "react";
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
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  FileStatusResponse,
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
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DqChartsProps {
  files: FileStatusResponse[];
}

// Color palette - softer colors for charts (easy on the eyes)
const CHART_COLORS = {
  // Solid colors for strokes/borders
  green: "#22C55E",
  yellow: "#EAB308",
  red: "#EF4444",
  blue: "#3B82F6",
  purple: "#8B5CF6",
  pink: "#EC4899",
  teal: "#14B8A6",
  orange: "#F97316",
  // Softer fill colors with transparency - brighter for pie/bar charts
  greenSoft: "rgba(34, 197, 94, 0.75)", // green-500/75
  yellowSoft: "rgba(234, 179, 8, 0.75)", // yellow-500/75
  redSoft: "rgba(239, 68, 68, 0.7)", // red-500/70
  blueSoft: "rgba(59, 130, 246, 0.65)", // blue-500/65
  purpleSoft: "rgba(139, 92, 246, 0.4)", // purple-500/40
  tealSoft: "rgba(20, 184, 166, 0.4)", // teal-500/40
};

const chartConfig = {
  rowsIn: {
    label: "Rows In",
    color: CHART_COLORS.purple,
  },
  rowsOut: {
    label: "Rows Out",
    color: CHART_COLORS.teal,
  },
  rowsFixed: {
    label: "Rows Fixed",
    color: CHART_COLORS.yellow,
  },
  rowsQuarantined: {
    label: "Quarantined",
    color: CHART_COLORS.red,
  },
  filesProcessed: {
    label: "Files Processed",
    color: CHART_COLORS.blue,
  },
  filesDeleted: {
    label: "Files Deleted",
    color: CHART_COLORS.red,
  },
  clean: {
    label: "Clean",
    color: CHART_COLORS.green,
  },
  fixed: {
    label: "Fixed",
    color: CHART_COLORS.yellow,
  },
  quarantined: {
    label: "Quarantined",
    color: CHART_COLORS.red,
  },
};

export function DqCharts({ files }: DqChartsProps) {
  const { idToken } = useAuth();
  const [overallReport, setOverallReport] =
    useState<OverallDqReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOverallReport = async () => {
      if (!idToken) return;
      try {
        const report = await fileManagementAPI.downloadOverallDqReport(idToken);
        setOverallReport(report);
      } catch (error) {
        console.error("Error loading overall DQ report:", error);
        // Use file data as fallback
      } finally {
        setLoading(false);
      }
    };
    loadOverallReport();
  }, [idToken]);

  // Calculate data from files
  const completedFiles = files.filter((f) => f.status === "DQ_FIXED");
  const processingFiles = files.filter((f) =>
    ["DQ_RUNNING", "NORMALIZING", "QUEUED", "UPLOADING"].includes(f.status)
  );
  const failedFiles = files.filter((f) =>
    ["DQ_FAILED", "UPLOAD_FAILED"].includes(f.status)
  );

  const totalRowsIn = completedFiles.reduce(
    (sum, f) => sum + (f.rows_in || 0),
    0
  );
  const totalRowsFixed = completedFiles.reduce(
    (sum, f) => sum + (f.rows_fixed || 0),
    0
  );
  const totalRowsQuarantined = completedFiles.reduce(
    (sum, f) => sum + (f.rows_quarantined || 0),
    0
  );
  const totalRowsOut = totalRowsIn - totalRowsQuarantined;
  const avgDqScore =
    completedFiles.length > 0
      ? completedFiles.reduce((sum, f) => sum + (f.dq_score || 0), 0) /
        completedFiles.length
      : 0;

  // Prepare monthly data from overall report or generate from files
  const monthlyData = overallReport?.months
    ? Object.entries(overallReport.months)
        .map(([month, stats]) => ({
          month,
          filesProcessed: stats.files_processed,
          filesDeleted: stats.files_deleted,
          rowsIn: stats.rows_in,
          cleanRows: stats.rows_in - stats.rows_quarantined,
          rowsQuarantined: stats.rows_quarantined,
          processingTime: stats.total_processing_time_seconds,
        }))
        .sort((a, b) => {
          const [aMonth, aYear] = a.month.split("/");
          const [bMonth, bYear] = b.month.split("/");
          return (
            new Date(`${aYear}-${aMonth}-01`).getTime() -
            new Date(`${bYear}-${bMonth}-01`).getTime()
          );
        })
    : [];

  // Data quality distribution pie chart data
  const dqDistributionData = [
    {
      name: "Clean",
      value: totalRowsOut - totalRowsFixed,
      fill: CHART_COLORS.greenSoft,
    },
    { name: "Fixed", value: totalRowsFixed, fill: CHART_COLORS.yellowSoft },
    {
      name: "Quarantined",
      value: totalRowsQuarantined,
      fill: CHART_COLORS.redSoft,
    },
  ].filter((d) => d.value > 0);

  // File status distribution
  const fileStatusData = [
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
  ].filter((d) => d.value > 0);

  // Per-file DQ scores for bar chart
  const fileScoresData = completedFiles.slice(0, 10).map((f) => ({
    name:
      (f.original_filename || f.filename || "File").slice(0, 15) +
      ((f.original_filename || f.filename || "").length > 15 ? "..." : ""),
    score: f.dq_score || 0,
    fill:
      (f.dq_score || 0) >= 90
        ? CHART_COLORS.greenSoft
        : (f.dq_score || 0) >= 70
        ? CHART_COLORS.yellowSoft
        : CHART_COLORS.redSoft,
  }));

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
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={true}
                          vertical={false}
                          stroke="#E5E7EB"
                        />
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

      {/* Monthly Trends - Full width with comprehensive data */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Monthly Trends
          </CardTitle>
          <CardDescription className="text-xs">
            Row-level processing statistics over time
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-1">
          {monthlyData.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E5E7EB"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    stroke="#9CA3AF"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#9CA3AF"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) =>
                      value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
                    }
                  />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background border rounded-lg shadow-md p-3 text-xs">
                            <p className="font-medium mb-2">{label}</p>
                            {payload.map((entry, index) => (
                              <div
                                key={index}
                                className="flex justify-between gap-4"
                              >
                                <span style={{ color: entry.color }}>
                                  {entry.name}:
                                </span>
                                <span className="font-medium">
                                  {Number(entry.value).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Area
                    type="monotone"
                    dataKey="rowsIn"
                    name="Rows In"
                    stroke={CHART_COLORS.purple}
                    fill={CHART_COLORS.purpleSoft}
                    fillOpacity={0.5}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="cleanRows"
                    name="Clean Rows"
                    stroke={CHART_COLORS.green}
                    fill={CHART_COLORS.greenSoft}
                    fillOpacity={0.5}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="rowsQuarantined"
                    name="Quarantined"
                    stroke={CHART_COLORS.red}
                    fill={CHART_COLORS.redSoft}
                    fillOpacity={0.5}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-xs">
              No monthly data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Compact Monthly Trends for sidebar
export function MonthlyTrendsCompact({ files }: DqChartsProps) {
  const { idToken } = useAuth();
  const [overallReport, setOverallReport] =
    useState<OverallDqReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOverallReport = async () => {
      if (!idToken) return;
      try {
        const report = await fileManagementAPI.downloadOverallDqReport(idToken);
        setOverallReport(report);
      } catch (error) {
        console.error("Error loading overall DQ report:", error);
      } finally {
        setLoading(false);
      }
    };
    loadOverallReport();
  }, [idToken]);

  const monthlyData = overallReport?.months
    ? Object.entries(overallReport.months)
        .map(([month, stats]) => ({
          month: month.split("/")[0],
          rows: stats.rows_in,
          fixed: stats.rows_fixed,
        }))
        .sort((a, b) => {
          const months = [
            "01",
            "02",
            "03",
            "04",
            "05",
            "06",
            "07",
            "08",
            "09",
            "10",
            "11",
            "12",
          ];
          return months.indexOf(a.month) - months.indexOf(b.month);
        })
        .slice(-6)
    : [];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center justify-center h-[140px]">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (monthlyData.length === 0) {
    return null;
  }

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return (
    <Card>
      <CardHeader className="py-3 px-4 pb-1">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
          Monthly Trends
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-2">
        <div className="h-[100px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={monthlyData}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="month"
                tick={{ fontSize: 9 }}
                stroke="#9CA3AF"
                tickFormatter={(val) => monthNames[parseInt(val) - 1] || val}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border rounded-md shadow-sm p-2 text-xs">
                        <p className="font-medium">
                          {monthNames[parseInt(payload[0].payload.month) - 1]}
                        </p>
                        <p className="text-muted-foreground">
                          {payload[0].value?.toLocaleString()} rows
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="rows"
                stroke={CHART_COLORS.purple}
                fill={CHART_COLORS.purpleSoft}
                fillOpacity={0.5}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Export Processing Summary as a separate component
export function ProcessingSummary({ files }: DqChartsProps) {
  const completedFiles = files.filter((f) => f.status === "DQ_FIXED");
  const totalRowsIn = completedFiles.reduce(
    (sum, f) => sum + (f.rows_in || 0),
    0
  );
  const totalRowsFixed = completedFiles.reduce(
    (sum, f) => sum + (f.rows_fixed || 0),
    0
  );
  const totalRowsQuarantined = completedFiles.reduce(
    (sum, f) => sum + (f.rows_quarantined || 0),
    0
  );
  const totalRowsOut = totalRowsIn - totalRowsQuarantined;

  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-base font-semibold">
          Processing Summary
        </CardTitle>
        <CardDescription className="text-xs">
          Data quality metrics breakdown
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2 pb-3 max-h-[280px] overflow-y-auto">
        <div className="space-y-1.5">
          <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">
              Total Input Rows
            </span>
            <span className="text-sm font-medium">
              {totalRowsIn.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center p-2 rounded-lg bg-green-500/10">
            <span className="text-sm text-muted-foreground">Valid Output Rows</span>
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              {totalRowsOut.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center p-2 rounded-lg bg-yellow-500/10">
            <span className="text-sm text-muted-foreground">Issues Resolved</span>
            <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
              {totalRowsFixed.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center p-2 rounded-lg bg-red-500/10">
            <span className="text-sm text-muted-foreground">Records Quarantined</span>
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              {totalRowsQuarantined.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Success Rate</span>
            <span className="text-sm font-medium">
              {files.length > 0
                ? `${Math.round((completedFiles.length / files.length) * 100)}%`
                : "0%"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

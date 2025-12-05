"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area, Legend, ResponsiveContainer } from 'recharts'
import { FileStatusResponse, OverallDqReportResponse, fileManagementAPI } from '@/lib/api/file-management-api'
import { useAuth } from '@/components/providers/auth-provider'
import { Loader2, TrendingUp, FileText, CheckCircle, AlertTriangle, BarChart3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface DqChartsProps {
  files: FileStatusResponse[]
}

// Color palette - visible on both light and dark themes
const CHART_COLORS = {
  green: '#22C55E',      // Green - clean/success
  yellow: '#EAB308',     // Yellow - fixed/warning
  red: '#EF4444',        // Red - quarantined/failed
  blue: '#3B82F6',       // Blue - processing/info
  purple: '#8B5CF6',     // Purple - rows in
  pink: '#EC4899',       // Pink - accent
  teal: '#14B8A6',       // Teal - rows out
  orange: '#F97316',     // Orange - secondary
}

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
}

export function DqCharts({ files }: DqChartsProps) {
  const { idToken } = useAuth()
  const [overallReport, setOverallReport] = useState<OverallDqReportResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadOverallReport = async () => {
      if (!idToken) return
      try {
        const report = await fileManagementAPI.downloadOverallDqReport(idToken)
        setOverallReport(report)
      } catch (error) {
        console.error('Error loading overall DQ report:', error)
        // Use file data as fallback
      } finally {
        setLoading(false)
      }
    }
    loadOverallReport()
  }, [idToken])

  // Calculate data from files
  const completedFiles = files.filter(f => f.status === 'DQ_FIXED')
  const processingFiles = files.filter(f => ['DQ_RUNNING', 'NORMALIZING', 'QUEUED', 'UPLOADING'].includes(f.status))
  const failedFiles = files.filter(f => ['DQ_FAILED', 'UPLOAD_FAILED'].includes(f.status))

  const totalRowsIn = completedFiles.reduce((sum, f) => sum + (f.rows_in || 0), 0)
  const totalRowsOut = completedFiles.reduce((sum, f) => sum + (f.rows_out || f.rows_clean || 0), 0)
  const totalRowsFixed = completedFiles.reduce((sum, f) => sum + (f.rows_fixed || 0), 0)
  const totalRowsQuarantined = completedFiles.reduce((sum, f) => sum + (f.rows_quarantined || 0), 0)
  const avgDqScore = completedFiles.length > 0
    ? completedFiles.reduce((sum, f) => sum + (f.dq_score || 0), 0) / completedFiles.length
    : 0

  // Prepare monthly data from overall report or generate from files
  const monthlyData = overallReport?.months
    ? Object.entries(overallReport.months)
        .map(([month, stats]) => ({
          month,
          filesProcessed: stats.files_processed,
          filesDeleted: stats.files_deleted,
          rowsIn: stats.rows_in,
          rowsOut: stats.rows_out,
          rowsFixed: stats.rows_fixed,
          rowsQuarantined: stats.rows_quarantined,
          processingTime: stats.total_processing_time_seconds,
        }))
        .sort((a, b) => {
          const [aMonth, aYear] = a.month.split('/')
          const [bMonth, bYear] = b.month.split('/')
          return new Date(`${aYear}-${aMonth}-01`).getTime() - new Date(`${bYear}-${bMonth}-01`).getTime()
        })
    : []

  // Data quality distribution pie chart data
  const dqDistributionData = [
    { name: 'Clean', value: totalRowsOut - totalRowsFixed, fill: CHART_COLORS.green },
    { name: 'Fixed', value: totalRowsFixed, fill: CHART_COLORS.yellow },
    { name: 'Quarantined', value: totalRowsQuarantined, fill: CHART_COLORS.red },
  ].filter(d => d.value > 0)

  // File status distribution
  const fileStatusData = [
    { name: 'Completed', value: completedFiles.length, fill: CHART_COLORS.green },
    { name: 'Processing', value: processingFiles.length, fill: CHART_COLORS.blue },
    { name: 'Failed', value: failedFiles.length, fill: CHART_COLORS.red },
  ].filter(d => d.value > 0)

  // Per-file DQ scores for bar chart
  const fileScoresData = completedFiles
    .slice(0, 10)
    .map(f => ({
      name: (f.original_filename || f.filename || 'File').slice(0, 15) + ((f.original_filename || f.filename || '').length > 15 ? '...' : ''),
      score: f.dq_score || 0,
      fill: (f.dq_score || 0) >= 90 ? CHART_COLORS.green : (f.dq_score || 0) >= 70 ? CHART_COLORS.yellow : CHART_COLORS.red
    }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Files</span>
            </div>
            <div className="text-3xl font-bold">{files.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{completedFiles.length} processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Avg DQ Score</span>
            </div>
            <div className="text-3xl font-bold">{avgDqScore.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {avgDqScore >= 90 ? 'Excellent' : avgDqScore >= 70 ? 'Good' : 'Needs attention'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Rows Processed</span>
            </div>
            <div className="text-3xl font-bold">{totalRowsIn.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{totalRowsOut.toLocaleString()} clean output</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Issues Fixed</span>
            </div>
            <div className="text-3xl font-bold">{totalRowsFixed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{totalRowsQuarantined.toLocaleString()} quarantined</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Quality Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Data Quality Distribution</CardTitle>
            <CardDescription className="text-xs">Breakdown of processed rows by status</CardDescription>
          </CardHeader>
          <CardContent>
            {dqDistributionData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <PieChart>
                  <Pie
                    data={dqDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
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
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* DQ Score Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">DQ Score Distribution</CardTitle>
            <CardDescription className="text-xs">Files grouped by quality score range</CardDescription>
          </CardHeader>
          <CardContent>
            {completedFiles.length > 0 ? (
              (() => {
                // Group files by score ranges
                const excellent = completedFiles.filter(f => (f.dq_score || 0) >= 90).length
                const good = completedFiles.filter(f => (f.dq_score || 0) >= 70 && (f.dq_score || 0) < 90).length
                const needsWork = completedFiles.filter(f => (f.dq_score || 0) < 70).length
                
                const scoreDistData = [
                  { name: 'Excellent (90-100%)', value: excellent, fill: CHART_COLORS.green },
                  { name: 'Good (70-89%)', value: good, fill: CHART_COLORS.yellow },
                  { name: 'Needs Work (<70%)', value: needsWork, fill: CHART_COLORS.red },
                ].filter(d => d.value > 0)

                return (
                  <div className="space-y-4">
                    <ChartContainer config={chartConfig} className="h-[180px] w-full">
                      <BarChart data={scoreDistData} layout="vertical" margin={{ left: 0, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                        <XAxis type="number" stroke="#9CA3AF" fontSize={11} />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                        <ChartTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-background border rounded-lg shadow-md p-2.5 text-sm">
                                  <p className="font-medium">{payload[0].payload.name}</p>
                                  <p className="text-muted-foreground">{payload[0].value} files</p>
                                </div>
                              )
                            }
                            return null
                          }} 
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {scoreDistData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">{excellent}</p>
                        <p className="text-xs text-muted-foreground">Excellent</p>
                      </div>
                      <div className="p-2 rounded-lg bg-yellow-500/10">
                        <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{good}</p>
                        <p className="text-xs text-muted-foreground">Good</p>
                      </div>
                      <div className="p-2 rounded-lg bg-red-500/10">
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">{needsWork}</p>
                        <p className="text-xs text-muted-foreground">Needs Work</p>
                      </div>
                    </div>
                  </div>
                )
              })()
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                No processed files yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends - Only show if we have overall report data */}
      {monthlyData.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Monthly Processing Trends
            </CardTitle>
            <CardDescription className="text-xs">Files processed and rows handled over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="rowsIn"
                  stackId="1"
                  stroke={CHART_COLORS.purple}
                  fill={CHART_COLORS.purple}
                  fillOpacity={0.5}
                  name="Rows In"
                />
                <Area
                  type="monotone"
                  dataKey="rowsFixed"
                  stackId="2"
                  stroke={CHART_COLORS.yellow}
                  fill={CHART_COLORS.yellow}
                  fillOpacity={0.5}
                  name="Rows Fixed"
                />
                <Area
                  type="monotone"
                  dataKey="rowsQuarantined"
                  stackId="3"
                  stroke={CHART_COLORS.red}
                  fill={CHART_COLORS.red}
                  fillOpacity={0.5}
                  name="Quarantined"
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} formatter={(value) => <span className="text-foreground">{value}</span>} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

    </div>
  )
}

// Export Processing Summary as a separate component
export function ProcessingSummary({ files }: DqChartsProps) {
  const completedFiles = files.filter(f => f.status === 'DQ_FIXED')
  const totalRowsIn = completedFiles.reduce((sum, f) => sum + (f.rows_in || 0), 0)
  const totalRowsOut = completedFiles.reduce((sum, f) => sum + (f.rows_out || f.rows_clean || 0), 0)
  const totalRowsFixed = completedFiles.reduce((sum, f) => sum + (f.rows_fixed || 0), 0)
  const totalRowsQuarantined = completedFiles.reduce((sum, f) => sum + (f.rows_quarantined || 0), 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Processing Summary</CardTitle>
        <CardDescription className="text-xs">Data quality metrics breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Total Input Rows</span>
            <span className="text-sm font-medium">{totalRowsIn.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center p-2 rounded-lg bg-green-500/10">
            <span className="text-sm text-muted-foreground">Clean Output</span>
            <span className="text-sm font-medium text-green-600 dark:text-green-400">{totalRowsOut.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center p-2 rounded-lg bg-yellow-500/10">
            <span className="text-sm text-muted-foreground">Rows Fixed</span>
            <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">{totalRowsFixed.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center p-2 rounded-lg bg-red-500/10">
            <span className="text-sm text-muted-foreground">Quarantined</span>
            <span className="text-sm font-medium text-red-600 dark:text-red-400">{totalRowsQuarantined.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Success Rate</span>
            <span className="text-sm font-medium">
              {files.length > 0 ? `${Math.round((completedFiles.length / files.length) * 100)}%` : '0%'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

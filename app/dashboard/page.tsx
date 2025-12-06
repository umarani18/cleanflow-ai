"use client"

import { useEffect, useState, useCallback } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DqCharts, ProcessingSummary } from "@/components/dashboard/dq-charts"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { TopIssuesChart } from "@/components/dashboard/top-issues-chart"
import { AuthGuard } from "@/components/auth/auth-guard"
import { useAuth } from "@/components/providers/auth-provider"
import { fileManagementAPI, type FileStatusResponse } from "@/lib/api/file-management-api"
import { useToast } from "@/hooks/use-toast"

export default function DashboardPage() {
  const [files, setFiles] = useState<FileStatusResponse[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const { idToken } = useAuth()
  const { toast } = useToast()

  // Load files for analytics
  const loadFiles = useCallback(async () => {
    if (!idToken) return

    try {
      const response = await fileManagementAPI.getUploads(idToken)
      setFiles(response.items || [])
    } catch (error) {
      console.error('Error loading files for analytics:', error)
    }
  }, [idToken])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // Refresh all dashboard data
  const handleRefresh = useCallback(async () => {
    await loadFiles()
    // Increment refresh key to force re-render of components that fetch their own data
    setRefreshKey(prev => prev + 1)
  }, [loadFiles])

  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          <DashboardHeader onRefresh={handleRefresh} />

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="xl:col-span-3 space-y-6">
              <DqCharts files={files} key={`dq-charts-${refreshKey}`} />
            </div>

            <div className="xl:col-span-1 space-y-4">
              <ActivityFeed files={files} />
              <TopIssuesChart />
              <ProcessingSummary files={files} />
            </div>
          </div>
        </div>
      </MainLayout>
    </AuthGuard>
  )
}

"use client"

import { AuthGuard } from "@/components/auth/auth-guard"
import { DQResults } from "@/components/files/dq-results"
import { DQSummary } from "@/components/files/dq-summary"
import { FileExplorer } from "@/components/files/file-explorer"
import { FileManagerProvider } from "@/components/providers/file-manager-provider"
import { FileStats } from "@/components/files/file-stats"
import { FilesHeader } from "@/components/files/files-header"
import { MainLayout } from "@/components/layout/main-layout"

export default function FilesPage() {
  return (
    <AuthGuard>
      <FileManagerProvider>
        <MainLayout>
          <div className="space-y-6 slide-in">
            <FilesHeader />

            {/* Top Row: Storage Overview | Data Quality Processing Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <FileStats />
              </div>
              <div className="lg:col-span-2">
                <DQSummary />
              </div>
            </div>

            {/* Bottom Row: Files (n) | Individual File results */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 h-auto lg:h-[700px]">
              <FileExplorer />
              <DQResults />
            </div>
          </div>
        </MainLayout>
      </FileManagerProvider>
    </AuthGuard>
  )
}

"use client"

import { AuthGuard } from "@/components/auth/auth-guard"
import { MainLayout } from "@/components/layout/main-layout"
import { OrganizationSettings } from "@/components/settings/organization-settings"

export default function AdminPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-5xl mx-auto">
          <OrganizationSettings />
        </div>
      </MainLayout>
    </AuthGuard>
  )
}

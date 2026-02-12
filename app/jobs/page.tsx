"use client"

import { AuthGuard } from "@/components/auth/auth-guard"
import { MainLayout } from "@/components/layout/main-layout"
import { JobsList } from "@/components/jobs/jobs-list"

export default function JobsPage() {
    return (
        <AuthGuard>
            <MainLayout>
                <JobsList />
            </MainLayout>
        </AuthGuard>
    )
}

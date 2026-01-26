"use client"

import React, { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ProcessingWizard } from "./ProcessingWizard"
import { ProcessingWizardProvider, useProcessingWizard } from "./WizardContext"
import { fileManagementAPI } from "@/lib/api/file-management-api"
import type { FileStatusResponse } from "@/lib/api/file-management-api"
import { Loader2 } from "lucide-react"

interface WizardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileStatusResponse | null
  authToken: string
  onComplete?: () => void
}

function WizardInitializer({ file, authToken, onComplete, onClose }: { file: FileStatusResponse; authToken: string; onComplete?: () => void; onClose: () => void }) {
  const { initializeWithFile } = useProcessingWizard()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadColumns = async () => {
      try {
        const resp = await fileManagementAPI.getFileColumns(file.upload_id, authToken)
        const cols = resp.columns || []
        initializeWithFile(file.upload_id, file.original_filename || "Unknown file", cols, authToken)
      } catch (e: any) {
        setError(e.message || "Failed to load columns")
      } finally {
        setLoading(false)
      }
    }
    loadColumns()
  }, [file.upload_id, file.original_filename, authToken, initializeWithFile])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading columns...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center text-destructive">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <ProcessingWizard
      onComplete={() => {
        onClose()
        onComplete && onComplete()
      }}
    />
  )
}

export function WizardDialog({ open, onOpenChange, file, authToken, onComplete }: WizardDialogProps) {
  if (!file) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-muted/40">
          <DialogTitle>Process: {file.original_filename || file.filename}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <ProcessingWizardProvider>
            <WizardInitializer file={file} authToken={authToken} onComplete={onComplete} onClose={() => onOpenChange(false)} />
          </ProcessingWizardProvider>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default WizardDialog

/**
 * quarantine-editor-header.tsx
 *
 * Header component for quarantine editor dialog
 * Displays file metadata and edit status
 */

'use client'

import { Badge } from '@/components/ui/badge'
import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { QuarantineManifest } from '@/modules/files/types'

interface QuarantineEditorHeaderProps {
  manifest: QuarantineManifest | null
  pendingCount: number
  compatibilityMode: boolean
}

export function QuarantineEditorHeader({
  manifest,
  pendingCount,
  compatibilityMode,
}: QuarantineEditorHeaderProps) {
  if (!manifest) {
    return (
      <DialogHeader className="px-4 py-2 border-b">
        <DialogTitle className="text-base">Quarantine Editor</DialogTitle>
      </DialogHeader>
    )
  }

  const totalColumns = manifest.columns.length
  const editableColumns = manifest.editable_columns.filter((c) => c !== 'row_id').length

  return (
    <DialogHeader className="px-4 py-2 border-b">
      <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
        Quarantine Editor
        <Badge variant="secondary">
          {manifest.row_count_quarantined.toLocaleString()} rows
        </Badge>
        <Badge variant="outline">{totalColumns.toLocaleString()} columns</Badge>
        <Badge variant="outline">{editableColumns.toLocaleString()} editable</Badge>
        <Badge variant={pendingCount > 0 ? 'destructive' : 'outline'}>
          {pendingCount > 0 ? `${pendingCount} unsaved` : 'saved'}
        </Badge>
        {compatibilityMode && <Badge variant="destructive">Legacy Mode</Badge>}
      </DialogTitle>
    </DialogHeader>
  )
}

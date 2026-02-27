/**
 * quarantine-editor-toolbar.tsx
 *
 * Toolbar component with action buttons for quarantine editor
 */

'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Save, Play, RefreshCw, CloudUpload } from 'lucide-react'
import type { QuarantineSession } from '@/modules/files/types'

interface QuarantineEditorToolbarProps {
  session: QuarantineSession | null
  pendingCount: number
  saving: boolean
  submitting: boolean
  savedAt?: Date | null
  onSave: () => void
  onReprocess: () => void
  onRefresh: () => void
}

export function QuarantineEditorToolbar({
  session,
  pendingCount,
  saving,
  submitting,
  savedAt,
  onSave,
  onReprocess,
  onRefresh,
}: QuarantineEditorToolbarProps) {
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    if (!savedAt) return
    setShowSaved(true)
    const timer = setTimeout(() => setShowSaved(false), 3000)
    return () => clearTimeout(timer)
  }, [savedAt])

  return (
    <div className="px-4 py-2 border-b bg-muted/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: Action buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-1" /> Reload
          </Button>
          <Button size="sm" variant="outline" disabled={saving || pendingCount === 0} onClick={onSave}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}{' '}
            Save ({pendingCount})
          </Button>
          <Button size="sm" disabled={submitting || !session} onClick={onReprocess}>
            {submitting ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-1" />
            )}{' '}
            Reprocess
          </Button>
        </div>

        {/* Right: Save status + session */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {saving ? (
            <span className="flex items-center gap-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving…
            </span>
          ) : showSaved ? (
            <span className="flex items-center gap-1 text-green-600 transition-opacity duration-500">
              <CloudUpload className="w-3.5 h-3.5" />
              Saved
            </span>
          ) : null}
          {session && <span className="text-xs opacity-50">Session {session.session_id.slice(0, 8)}</span>}
        </div>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Excel-style editing: click a cell, edit, Enter/Escape to finish. Auto-save runs in background.
      </p>
    </div>
  )
}

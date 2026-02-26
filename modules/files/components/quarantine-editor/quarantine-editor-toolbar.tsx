/**
 * quarantine-editor-toolbar.tsx
 *
 * Toolbar component with action buttons for quarantine editor
 */

'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save, Play, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import type { QuarantineSession, FileVersionSummary, SaveSummary } from '@/modules/files/types'

interface QuarantineEditorToolbarProps {
  session: QuarantineSession | null
  pendingCount: number
  saving: boolean
  submitting: boolean
  onSave: () => void
  onReprocess: () => void
  onRefresh: () => void
  onScrollLeft: () => void
  onScrollRight: () => void
  showLineage: boolean
  onToggleLineage: () => void
  latestVersion: FileVersionSummary | null
  lastSaveSummary: SaveSummary | null
  hasMultipleVersions: boolean
}

export function QuarantineEditorToolbar({
  session,
  pendingCount,
  saving,
  submitting,
  onSave,
  onReprocess,
  onRefresh,
  onScrollLeft,
  onScrollRight,
  showLineage,
  onToggleLineage,
  latestVersion,
  lastSaveSummary,
  hasMultipleVersions,
}: QuarantineEditorToolbarProps) {
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

        {/* Right: Status badges and navigation */}
        <div className="flex flex-wrap items-center gap-1.5">
          {session && <Badge variant="outline">Session {session.session_id.slice(0, 8)}</Badge>}
          {lastSaveSummary && (
            <Badge variant="secondary">
              Saved {lastSaveSummary.accepted}
              {lastSaveSummary.rejected ? ` / rejected ${lastSaveSummary.rejected}` : ''}
            </Badge>
          )}
          {latestVersion && <Badge variant="outline">v{latestVersion.version_number}</Badge>}
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onScrollLeft}>
            ←
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onScrollRight}>
            →
          </Button>
          {hasMultipleVersions && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onToggleLineage}>
              {showLineage ? (
                <ChevronDown className="w-3.5 h-3.5 mr-1" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 mr-1" />
              )}
              Versions
            </Button>
          )}
        </div>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Excel-style editing: click a cell, edit, Enter/Escape to finish. Auto-save runs in background.
      </p>
    </div>
  )
}

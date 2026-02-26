/**
 * quarantine-editor-toolbar.tsx
 *
 * Toolbar component with action buttons for quarantine editor
 */

'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save, Play, RefreshCw } from 'lucide-react'
import type { QuarantineSession, SaveSummary } from '@/modules/files/types'

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
  lastSaveSummary: SaveSummary | null
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
  lastSaveSummary,
}: QuarantineEditorToolbarProps) {
  return (
    <div className="px-6 py-3 border-b bg-muted/5 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} className="h-9 shadow-sm hover:shadow transition-shadow">
            <RefreshCw className="w-4 h-4 mr-1.5" /> Reload
          </Button>
          <div className="h-5 w-px bg-border" />
          <Button
            size="sm"
            variant={pendingCount > 0 ? "default" : "outline"}
            disabled={saving || pendingCount === 0}
            onClick={onSave}
            className="h-9 shadow-sm hover:shadow transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
            Save {pendingCount > 0 && `(${pendingCount})`}
          </Button>
          <Button
            size="sm"
            disabled={submitting || !session}
            onClick={onReprocess}
            className="h-9 shadow-sm hover:shadow transition-all"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-1.5" />
            )}
            Reprocess
          </Button>
        </div>

        {/* Right: Status badges and navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {session && (
            <Badge variant="outline" className="px-2.5 py-1 text-xs font-mono shadow-sm">
              Session {session.session_id.slice(0, 8)}
            </Badge>
          )}
          {lastSaveSummary && (
            <Badge variant="secondary" className="px-2.5 py-1 text-xs shadow-sm">
              ✓ Saved {lastSaveSummary.accepted}
              {lastSaveSummary.rejected ? ` / ✗ ${lastSaveSummary.rejected}` : ''}
            </Badge>
          )}
          <div className="h-5 w-px bg-border ml-1" />
          <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-8 px-0 hover:bg-background"
              onClick={onScrollLeft}
            >
              ←
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-8 px-0 hover:bg-background"
              onClick={onScrollRight}
            >
              →
            </Button>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
        <span className="inline-block w-1 h-1 rounded-full bg-blue-500" />
        Excel-style editing: click a cell to edit, press Enter or Escape to finish. Changes auto-save in the background.
      </p>
    </div>
  )
}

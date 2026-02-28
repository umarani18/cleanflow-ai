/**
 * quarantine-custom-rule-dialog.tsx
 *
 * Dialog for applying an AI-generated transformation rule to ALL quarantined
 * cells in a chosen column. Two-phase flow:
 *   1. Generate & Preview  — sends loaded sample rows to the backend to generate
 *      the Python fix_value() function and preview a few before/after diffs.
 *   2. Apply to All        — server-side: backend paginates the full read model,
 *      applies the cached rule to every quarantined cell in the column, and
 *      saves the edits in etag-chained batches.
 */

'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Wand2, Loader2, ChevronDown, Code2, ArrowRight, CheckCircle2 } from 'lucide-react'
import { applyColumnRule, applyColumnRuleAll } from '@/modules/files/api/file-quarantine-api'
import type { ColumnRuleFix, QuarantineRow, QuarantineSession } from '@/modules/files/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface QuarantineCustomRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Editable column names from the manifest (excludes row_id) */
  editableColumns: string[]
  /** Rows currently loaded in the editor (used for preview sample only) */
  rows: QuarantineRow[]
  uploadId: string
  authToken: string | null
  /** Active session — required for server-side apply-all */
  session: QuarantineSession | null
  /** Called after server-side apply-all so the editor can refresh */
  onApplied: (newEtag: string, rowsAffected: number) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuarantineCustomRuleDialog({
  open,
  onOpenChange,
  editableColumns,
  rows,
  uploadId,
  authToken,
  session,
  onApplied,
}: QuarantineCustomRuleDialogProps) {
  const columns = editableColumns.filter((c) => c !== 'row_id')

  const [column, setColumn] = useState<string>(columns[0] ?? '')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applyProgress, setApplyProgress] = useState(0)
  const [fixes, setFixes] = useState<ColumnRuleFix[] | null>(null)
  const [ruleCode, setRuleCode] = useState<string | null>(null)
  const [showCode, setShowCode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState<number | null>(null)

  // Reset column selection when columns change (e.g. dialog reopened)
  useEffect(() => {
    if (columns.length > 0 && !columns.includes(column)) {
      setColumn(columns[0])
    }
  }, [columns]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset preview when column or description changes
  const handleColumnChange = (col: string) => {
    setColumn(col)
    setFixes(null)
    setRuleCode(null)
    setError(null)
    setSuccessCount(null)
  }

  const handleDescriptionChange = (val: string) => {
    setDescription(val)
    setFixes(null)
    setError(null)
    setSuccessCount(null)
  }

  // Quarantined values for the currently selected column (loaded rows only — for preview)
  const quarantinedRows = rows.filter(
    (row) => String(row[`${column}_dq_status`] ?? '').toLowerCase() === 'quarantined'
  )

  // ── Phase 1: Generate & Preview ───────────────────────────────────

  const handleGenerate = async () => {
    if (!column || !description.trim() || !authToken) return
    setLoading(true)
    setFixes(null)
    setRuleCode(null)
    setError(null)
    setSuccessCount(null)
    try {
      const result = await applyColumnRule(uploadId, authToken, {
        column,
        description: description.trim(),
        rows: quarantinedRows.map((row) => ({
          row_id: String(row.row_id),
          value: String(row[column] ?? ''),
        })),
      })
      setFixes(result.fixes)
      setRuleCode(result.rule_code)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI rule generation failed')
    } finally {
      setLoading(false)
    }
  }

  // ── Phase 2: Apply to ALL rows (chunked, chains cursor across calls) ─

  const handleApplyAll = async () => {
    if (!session?.session_id || !authToken || !column || !description.trim()) return
    setApplying(true)
    setApplyProgress(0)
    setError(null)

    let cursor: string | null | undefined = undefined
    let etag: string | undefined = undefined
    let totalFixed = 0

    try {
      do {
        const result = await applyColumnRuleAll(uploadId, authToken, {
          column,
          description: description.trim(),
          session_id: session.session_id,
          cursor,
          if_match_etag: etag,
        })
        totalFixed += result.rows_affected
        cursor = result.next_cursor
        etag = result.new_etag
        setApplyProgress(totalFixed)
      } while (cursor)

      setSuccessCount(totalFixed)
      onApplied(etag ?? '', totalFixed)
      setTimeout(handleClose, 1800)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Apply to all failed')
    } finally {
      setApplying(false)
    }
  }

  const handleClose = () => {
    setFixes(null)
    setRuleCode(null)
    setDescription('')
    setError(null)
    setShowCode(false)
    setSuccessCount(null)
    setApplyProgress(0)
    onOpenChange(false)
  }

  // ── Derived values ────────────────────────────────────────────────

  const changedFixes = fixes?.filter((f) => f.fixed !== f.original) ?? []
  const sampleFixes = changedFixes.slice(0, 6)
  const canGenerate =
    Boolean(description.trim()) && Boolean(column) && quarantinedRows.length > 0 && !loading && !applying
  const canApplyAll =
    Boolean(description.trim()) && Boolean(column) && Boolean(session?.session_id) && !loading && !applying

  // ── Render ────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Wand2 className="h-4 w-4 text-violet-500 shrink-0" />
            AI Fix
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* ── Column selector ────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Column</label>
            <div className="relative">
              <select
                value={column}
                onChange={(e) => handleColumnChange(e.target.value)}
                className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              {quarantinedRows.length > 0
                ? `${quarantinedRows.length} quarantined ${quarantinedRows.length === 1 ? 'cell' : 'cells'} loaded for preview`
                : 'No quarantined cells loaded yet — scroll the grid to load rows, then preview'}
            </p>
          </div>

          {/* ── Description textarea ───────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Describe the fix</label>
            <textarea
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder={`e.g. "Remove leading zeros", "Capitalize first letter", "Replace BadStatus with Inactive", "Strip HTML tags"`}
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleGenerate()
              }}
            />
            <p className="text-xs text-muted-foreground">Cmd/Ctrl+Enter to preview</p>
          </div>

          {/* ── Error ─────────────────────────────────────────────── */}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* ── Success ───────────────────────────────────────────── */}
          {successCount !== null && (
            <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Applied to {successCount} {successCount === 1 ? 'row' : 'rows'} successfully.
            </div>
          )}

          {/* ── Preview (from loaded sample rows) ─────────────────── */}
          {fixes !== null && !loading && successCount === null && (
            <div className="rounded-md border overflow-hidden">
              {/* Header row */}
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
                <span className="text-xs font-semibold">Preview (sample)</span>
                <span className="text-xs text-muted-foreground">
                  {changedFixes.length} of {fixes.length} loaded {fixes.length === 1 ? 'cell' : 'cells'} would change
                </span>
              </div>

              {/* Sample diffs */}
              {sampleFixes.length === 0 ? (
                <p className="px-3 py-2.5 text-xs text-muted-foreground italic">
                  No changes in loaded sample — all rows may still be processed server-side.
                </p>
              ) : (
                <div className="divide-y">
                  {sampleFixes.map((fix) => (
                    <div key={fix.row_id} className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono">
                      <span className="text-red-600 line-through max-w-[170px] truncate" title={fix.original}>
                        {fix.original || <em className="not-italic opacity-50">(empty)</em>}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-green-700 max-w-[170px] truncate" title={fix.fixed}>
                        {fix.fixed || <em className="not-italic opacity-50">(empty)</em>}
                      </span>
                    </div>
                  ))}
                  {changedFixes.length > 6 && (
                    <p className="px-3 py-1.5 text-xs text-muted-foreground">
                      …and {changedFixes.length - 6} more in loaded sample
                    </p>
                  )}
                </div>
              )}

              {/* Generated rule code (collapsible) */}
              {ruleCode && (
                <div className="border-t">
                  <button
                    type="button"
                    onClick={() => setShowCode((v) => !v)}
                    className="flex items-center gap-1.5 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    {showCode ? 'Hide' : 'Show'} generated rule
                  </button>
                  {showCode && (
                    <pre className="px-3 pb-3 text-[11px] font-mono bg-muted/30 whitespace-pre-wrap break-all">
                      {ruleCode}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={loading || applying}>
            Cancel
          </Button>

          {successCount === null && (
            <>
              {/* Phase 1 — Preview is always required first */}
              {fixes === null ? (
                <Button
                  onClick={() => void handleGenerate()}
                  disabled={!canGenerate}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-1.5" />
                      Generate &amp; Preview
                    </>
                  )}
                </Button>
              ) : (
                /* Phase 2 — Apply to All only appears after preview */
                <Button
                  onClick={() => void handleApplyAll()}
                  disabled={!canApplyAll}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {applying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      {applyProgress > 0 ? `Applying… ${applyProgress} fixed` : 'Applying…'}
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-1.5" />
                      Apply to All
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

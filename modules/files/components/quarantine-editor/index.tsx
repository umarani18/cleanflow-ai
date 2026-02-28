/**
 * index.tsx - Quarantine Editor Dialog
 *
 * Main entry point for quarantine editor feature
 * Orchestrates all sub-components and business logic
 */

'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useAuth } from '@/modules/auth'
import { useQuarantineEditor } from '@/modules/files/hooks'
import { QuarantineEditorHeader } from './quarantine-editor-header'
import { QuarantineEditorToolbar } from './quarantine-editor-toolbar'
import { QuarantineAgGridTable } from './quarantine-ag-grid-table'
import type { QuarantineEditorDialogProps } from '@/modules/files/types'

/**
 * Quarantine Editor Dialog
 *
 * Focused editor for quarantined rows with:
 * - AG Grid for virtualized rendering and native resize/keyboard nav
 * - Inline cell editing
 * - Autosave
 * - Session management
 * - Compatibility mode fallback
 *
 * @param props - File, open state, and callbacks
 */
export function QuarantineEditorDialog({ file, open, onOpenChange }: QuarantineEditorDialogProps) {
  const { idToken } = useAuth()

  // Main editor hook
  const editor = useQuarantineEditor({
    file,
    authToken: idToken,
    open,
  })

  // Close handler
  const handleClose = () => {
    onOpenChange(false)
  }

  // Reprocess handler
  const handleReprocess = async () => {
    try {
      await editor.submitReprocess()
      handleClose()
    } catch (error) {
      // Error already toasted in hook
      console.error('Reprocess failed:', error)
    }
  }

  // Refresh handler
  const handleRefresh = () => {
    void editor.refreshSession()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
       * grid + gridTemplateRows: explicit CSS Grid rows so the table row
       * reliably receives a definite height (1fr) regardless of how
       * tailwind-merge resolves the shadcn "grid" default vs user classes.
       * flex-1 doesn't work when the parent ends up as display:grid.
       */}
      <DialogContent
        className="w-[98vw] max-w-[1700px] h-[90vh] p-0 gap-0 overflow-hidden"
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {/* Row 1 — header */}
        <QuarantineEditorHeader
          manifest={editor.manifest}
          pendingCount={editor.pendingCount}
          compatibilityMode={editor.compatibilityMode}
        />

        {/* Row 2 — toolbar */}
        <QuarantineEditorToolbar
          session={editor.sessionInfo}
          saving={editor.saving}
          submitting={editor.submitting}
          savedAt={editor.lastSavedAt}
          onReprocess={handleReprocess}
        />

        {/* Table section — flex: 1 consumes remaining height, position: relative
            establishes a containing block so the absolute inner div gets a
            definite pixel height regardless of flex/percentage quirks. */}
        <div className="relative overflow-hidden min-h-0" style={{ flex: 1 }}>
          <div className="absolute inset-0">
            <QuarantineAgGridTable
              rows={editor.rows}
              columns={editor.columns}
              editableColumns={editor.manifest?.editable_columns || []}
              isCellEdited={editor.isCellEdited}
              isCellSaved={editor.isCellSaved}
              onCellEdit={editor.handleCellEdit}
              loading={editor.loading || editor.rowsLoading}
              onBodyScrollEnd={editor.handleBodyScrollEnd}
              uploadId={file?.upload_id ?? ''}
              authToken={idToken}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Named export for convenient importing
export { QuarantineEditorDialog as default }

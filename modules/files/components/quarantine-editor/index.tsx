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
      <DialogContent className="w-[98vw] max-w-[1700px] h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <QuarantineEditorHeader
          manifest={editor.manifest}
          pendingCount={editor.pendingCount}
          compatibilityMode={editor.compatibilityMode}
        />

        {/* Toolbar */}
        <QuarantineEditorToolbar
          session={editor.sessionInfo}
          pendingCount={editor.pendingCount}
          saving={editor.saving}
          submitting={editor.submitting}
          onSave={editor.saveEdits}
          onReprocess={handleReprocess}
          onRefresh={handleRefresh}
          lastSaveSummary={editor.lastSaveSummary}
        />

        {/* Table — AG Grid replaces the old virtual-scroll table */}
        <QuarantineAgGridTable
          rows={editor.rows}
          columns={editor.columns}
          editableColumns={editor.manifest?.editable_columns || []}
          getCellValue={editor.getCellValue}
          isCellEdited={editor.isCellEdited}
          onCellEdit={editor.handleCellEdit}
          loading={editor.loading || editor.rowsLoading}
          onBodyScrollEnd={editor.handleBodyScrollEnd}
        />
      </DialogContent>
    </Dialog>
  )
}

// Named export for convenient importing
export { QuarantineEditorDialog as default }

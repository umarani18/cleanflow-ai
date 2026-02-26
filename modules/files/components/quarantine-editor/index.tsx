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
import { QuarantineEditorTable } from './quarantine-editor-table'
import type { QuarantineEditorDialogProps } from '@/modules/files/types'

/**
 * Quarantine Editor Dialog
 *
 * Focused editor for quarantined rows with:
 * - Virtual scrolling for performance
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

  // Scroll handlers
  const handleScrollLeft = () => {
    editor.virtualScroll.scrollHorizontally(-420)
  }

  const handleScrollRight = () => {
    editor.virtualScroll.scrollHorizontally(420)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] max-w-[1700px] h-[90vh] p-0 gap-0 overflow-hidden bg-gradient-to-b from-background to-muted/5">
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
          onScrollLeft={handleScrollLeft}
          onScrollRight={handleScrollRight}
          lastSaveSummary={editor.lastSaveSummary}
        />

        {/* Table */}
        <QuarantineEditorTable
          columns={editor.columns}
          virtualRows={editor.virtualScroll.virtualRows}
          visibleStart={editor.virtualScroll.visibleStart}
          editableColumns={editor.manifest?.editable_columns || []}
          activeCell={editor.activeCell}
          getCellValue={editor.getCellValue}
          isCellEdited={editor.isCellEdited}
          isRowEdited={editor.isRowEdited}
          onCellEdit={editor.handleCellEdit}
          onActivateCell={(rowId, col) => editor.setActiveCell({ rowId, col })}
          onDeactivateCell={() => editor.setActiveCell(null)}
          parentRef={editor.virtualScroll.parentRef}
          totalHeight={editor.virtualScroll.totalHeight}
          rowHeight={32}
          headerHeight={36}
          onScroll={editor.virtualScroll.handleScroll}
          loading={editor.loading}
        />
      </DialogContent>
    </Dialog>
  )
}

// Named export for convenient importing
export { QuarantineEditorDialog as default }

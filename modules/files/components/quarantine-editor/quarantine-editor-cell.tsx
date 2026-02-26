/**
 * quarantine-editor-cell.tsx
 *
 * Editable cell component for quarantine editor
 * Handles inline editing with keyboard navigation
 */

'use client'

interface QuarantineEditorCellProps {
  rowId: string
  column: string
  value: string
  isEditable: boolean
  isActive: boolean
  isEdited: boolean
  onEdit: (rowId: string, column: string, value: string) => void
  onActivate: (rowId: string, column: string) => void
  onDeactivate: () => void
}

export function QuarantineEditorCell({
  rowId,
  column,
  value,
  isEditable,
  isActive,
  isEdited,
  onEdit,
  onActivate,
  onDeactivate,
}: QuarantineEditorCellProps) {
  if (!isEditable) {
    // Non-editable cell (e.g., row_id)
    return (
      <div className="h-8 truncate px-2 py-[7px] text-xs" title={value}>
        {value}
      </div>
    )
  }

  if (isActive) {
    // Active editing mode
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => onEdit(rowId, column, e.target.value)}
        onBlur={onDeactivate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') {
            onDeactivate()
          }
        }}
        className="h-8 w-full border-0 bg-background px-2 text-xs outline-none ring-1 ring-inset ring-primary"
      />
    )
  }

  // Display mode
  return (
    <div
      className={`h-8 truncate px-2 py-[7px] text-xs cursor-text ${isEdited ? 'font-medium text-primary' : ''}`}
      title={value}
      onClick={() => onActivate(rowId, column)}
    >
      {value || <span className="text-muted-foreground/50 italic">empty</span>}
    </div>
  )
}

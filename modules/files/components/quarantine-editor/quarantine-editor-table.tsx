/**
 * quarantine-editor-table.tsx
 *
 * Virtual scrolling table component for quarantine editor
 * Renders only visible rows for performance
 */

'use client'

import { Loader2 } from 'lucide-react'
import { QuarantineEditorCell } from './quarantine-editor-cell'
import type { QuarantineRow, QuarantineManifest, ActiveCell } from '@/modules/files/types'

interface QuarantineEditorTableProps {
  // Data
  columns: string[]
  virtualRows: QuarantineRow[]
  visibleStart: number
  editableColumns: string[]

  // State
  activeCell: ActiveCell | null
  getCellValue: (rowId: string, column: string, row: Record<string, any>) => any
  isCellEdited: (rowId: string, column: string) => boolean
  isRowEdited: (rowId: string) => boolean

  // Actions
  onCellEdit: (rowId: string, column: string, value: string) => void
  onActivateCell: (rowId: string, column: string) => void
  onDeactivateCell: () => void

  // Virtual scroll
  parentRef: React.RefObject<HTMLDivElement>
  totalHeight: number
  rowHeight: number
  headerHeight: number
  onScroll: () => void

  // Loading state
  loading: boolean
}

export function QuarantineEditorTable({
  columns,
  virtualRows,
  visibleStart,
  editableColumns,
  activeCell,
  getCellValue,
  isCellEdited,
  isRowEdited,
  onCellEdit,
  onActivateCell,
  onDeactivateCell,
  parentRef,
  totalHeight,
  rowHeight,
  headerHeight,
  onScroll,
  loading,
}: QuarantineEditorTableProps) {
  const tableMinWidth = Math.max(860, columns.length * 132)

  if (loading && virtualRows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground min-h-0">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading quarantined rows...
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-x-scroll overflow-y-auto [scrollbar-gutter:stable] min-h-0"
      onScroll={onScroll}
    >
      <div
        style={{
          height: `${totalHeight}px`,
          position: 'relative',
          minWidth: `${tableMinWidth}px`,
        }}
      >
        {/* Header row */}
        <div
          className="sticky top-0 z-20 bg-muted/80 border-b grid"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(132px, 1fr))` }}
        >
          {columns.map((col) => (
            <div
              key={col}
              className="px-2 py-2 text-xs font-semibold border-r truncate text-muted-foreground"
            >
              {col}
            </div>
          ))}
        </div>

        {/* Virtual rows */}
        {virtualRows.map((row, idx) => {
          const rowIndex = visibleStart + idx
          const rowId = String(row.row_id)
          const rowEdited = isRowEdited(rowId)

          return (
            <div
              key={`${rowId}-${rowIndex}`}
              className={`absolute left-0 w-full grid border-b ${
                rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/[0.16]'
              } ${rowEdited ? 'bg-primary/5' : ''} hover:bg-muted/25`}
              style={{
                transform: `translateY(${headerHeight + rowIndex * rowHeight}px)`,
                gridTemplateColumns: `repeat(${columns.length}, minmax(132px, 1fr))`,
              }}
            >
              {columns.map((col) => {
                const editable = col !== 'row_id' && editableColumns.includes(col)
                const isActive = activeCell?.rowId === rowId && activeCell?.col === col
                const value = String(getCellValue(rowId, col, row))
                const isEdited = isCellEdited(rowId, col)

                return (
                  <div key={`${rowId}-${col}`} className="border-r">
                    <QuarantineEditorCell
                      rowId={rowId}
                      column={col}
                      value={value}
                      isEditable={editable}
                      isActive={isActive}
                      isEdited={isEdited}
                      onEdit={onCellEdit}
                      onActivate={onActivateCell}
                      onDeactivate={onDeactivateCell}
                    />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

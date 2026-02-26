/**
 * use-quarantine-edits.ts
 *
 * Hook for managing cell edits in quarantine editor
 * Tracks pending edits, active cell, and provides edit operations
 */

import { useState, useCallback } from 'react'
import type { ActiveCell } from '@/modules/files/types'

interface EditsState {
  editsMap: Record<string, Record<string, any>>
  activeCell: ActiveCell | null
}

/**
 * Hook for managing quarantine edits
 * Provides edit tracking, active cell management, and edit count
 *
 * @returns Edits state and edit operations
 */
export function useQuarantineEdits() {
  const [state, setState] = useState<EditsState>({
    editsMap: {},
    activeCell: null,
  })

  /**
   * Edit a cell value
   * @param rowId - Row ID
   * @param column - Column name
   * @param value - New value
   */
  const editCell = useCallback((rowId: string, column: string, value: any) => {
    setState((prev) => ({
      ...prev,
      editsMap: {
        ...prev.editsMap,
        [rowId]: {
          ...(prev.editsMap[rowId] || {}),
          [column]: value,
        },
      },
    }))
  }, [])

  /**
   * Set active cell (for editing UI)
   * @param cell - Cell coordinates or null to clear
   */
  const setActiveCell = useCallback((cell: ActiveCell | null) => {
    setState((prev) => ({ ...prev, activeCell: cell }))
  }, [])

  /**
   * Clear all edits
   */
  const clearEdits = useCallback(() => {
    setState((prev) => ({ ...prev, editsMap: {} }))
  }, [])

  /**
   * Get cell value (with edit overlay)
   * Returns edited value if exists, otherwise original
   * @param rowId - Row ID
   * @param column - Column name
   * @param originalRow - Original row data
   */
  const getCellValue = useCallback(
    (rowId: string, column: string, originalRow: Record<string, any>) => {
      return state.editsMap[rowId]?.[column] ?? originalRow[column] ?? ''
    },
    [state.editsMap]
  )

  /**
   * Check if cell has been edited
   * @param rowId - Row ID
   * @param column - Column name
   */
  const isCellEdited = useCallback(
    (rowId: string, column: string): boolean => {
      return state.editsMap[rowId]?.[column] !== undefined
    },
    [state.editsMap]
  )

  /**
   * Check if row has any edits
   * @param rowId - Row ID
   */
  const isRowEdited = useCallback(
    (rowId: string): boolean => {
      return !!state.editsMap[rowId]
    },
    [state.editsMap]
  )

  /**
   * Get edit count
   */
  const pendingCount = Object.keys(state.editsMap).length

  /**
   * Get all edited rows with merged data
   * @param originalRows - Original row data
   */
  const getEditedRows = useCallback(
    (originalRows: Record<string, any>[]) => {
      return originalRows.map((row) => {
        const rowId = String(row.row_id)
        const rowEdits = state.editsMap[rowId]
        return rowEdits ? { ...row, ...rowEdits } : row
      })
    },
    [state.editsMap]
  )

  /**
   * Get edits in batch format for API
   */
  const getEditsBatch = useCallback(() => {
    return Object.entries(state.editsMap).map(([rowId, cells]) => ({
      row_id: rowId,
      cells,
    }))
  }, [state.editsMap])

  /**
   * Reset edits state
   */
  const reset = useCallback(() => {
    setState({ editsMap: {}, activeCell: null })
  }, [])

  return {
    editsMap: state.editsMap,
    activeCell: state.activeCell,
    pendingCount,
    editCell,
    setActiveCell,
    clearEdits,
    getCellValue,
    isCellEdited,
    isRowEdited,
    getEditedRows,
    getEditsBatch,
    reset,
  }
}

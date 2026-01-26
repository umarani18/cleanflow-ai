"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Download, File, FileJson, FileSpreadsheet, Loader2, Columns, Edit2, Check, X, Undo } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useState, useMemo, useEffect } from 'react'

interface ColumnExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileName: string
  columns: string[]
  onExport: (options: {
    format: 'csv' | 'excel' | 'json'
    dataType: 'all' | 'clean' | 'quarantine'
    columns: string[]
    columnMapping: Record<string, string>
  }) => void
  exporting: boolean
}

interface ColumnState {
  selected: boolean
  exportName: string
  isEditing: boolean
}

export function ColumnExportDialog({
  open,
  onOpenChange,
  fileName,
  columns,
  onExport,
  exporting
}: ColumnExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'excel' | 'json'>('csv')
  const [dataType, setDataType] = useState<'all' | 'clean' | 'quarantine'>('all')
  
  // Column state: track selection and rename for each column
  const [columnStates, setColumnStates] = useState<Record<string, ColumnState>>({})

  // Initialize column states when columns change
  useEffect(() => {
    const initialState: Record<string, ColumnState> = {}
    columns.forEach(col => {
      initialState[col] = {
        selected: true,
        exportName: col,
        isEditing: false
      }
    })
    setColumnStates(initialState)
  }, [columns])

  const selectedColumns = useMemo(() => {
    return Object.entries(columnStates)
      .filter(([, state]) => state.selected)
      .map(([col]) => col)
  }, [columnStates])

  const columnMapping = useMemo(() => {
    const mapping: Record<string, string> = {}
    Object.entries(columnStates).forEach(([col, state]) => {
      if (state.selected && state.exportName !== col) {
        mapping[col] = state.exportName
      }
    })
    return mapping
  }, [columnStates])

  const handleToggleColumn = (col: string) => {
    setColumnStates(prev => ({
      ...prev,
      [col]: { ...prev[col], selected: !prev[col]?.selected }
    }))
  }

  const handleStartEdit = (col: string) => {
    setColumnStates(prev => ({
      ...prev,
      [col]: { ...prev[col], isEditing: true }
    }))
  }

  const handleEndEdit = (col: string) => {
    setColumnStates(prev => ({
      ...prev,
      [col]: { ...prev[col], isEditing: false }
    }))
  }

  const handleNameChange = (col: string, newName: string) => {
    setColumnStates(prev => ({
      ...prev,
      [col]: { ...prev[col], exportName: newName }
    }))
  }

  const handleResetName = (col: string) => {
    setColumnStates(prev => ({
      ...prev,
      [col]: { ...prev[col], exportName: col, isEditing: false }
    }))
  }

  const handleSelectAll = () => {
    setColumnStates(prev => {
      const newState = { ...prev }
      Object.keys(newState).forEach(col => {
        newState[col] = { ...newState[col], selected: true }
      })
      return newState
    })
  }

  const handleDeselectAll = () => {
    setColumnStates(prev => {
      const newState = { ...prev }
      Object.keys(newState).forEach(col => {
        newState[col] = { ...newState[col], selected: false }
      })
      return newState
    })
  }

  const handleExport = () => {
    onExport({
      format: selectedFormat,
      dataType,
      columns: selectedColumns,
      columnMapping
    })
  }

  const formatOptions = [
    { value: 'csv', label: 'CSV', icon: File, description: 'Comma-separated values' },
    { value: 'excel', label: 'Excel', icon: FileSpreadsheet, description: 'Microsoft Excel (.xlsx)' },
    { value: 'json', label: 'JSON', icon: FileJson, description: 'JavaScript Object Notation' }
  ] as const

  const dataTypeOptions = [
    { value: 'all', label: 'All Data' },
    { value: 'clean', label: 'Clean Only' },
    { value: 'quarantine', label: 'Quarantined' }
  ] as const

  const renamedCount = Object.keys(columnMapping).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] h-[92vh] flex flex-col overflow-hidden">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
              <Columns className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Export Required Fields
          </DialogTitle>
          <DialogDescription className="text-sm mt-2">
            Configure columns and export format
          </DialogDescription>
          <div className="text-xs mt-3 p-2 rounded bg-muted text-muted-foreground">
            File: <span className="font-mono font-medium text-foreground">{fileName}</span>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-4 flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Format and Data Type Row */}
          <div className="space-y-3 shrink-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Export Settings</div>
            <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Format</Label>
              <Select
                value={selectedFormat}
                onValueChange={(value) => setSelectedFormat(value as 'csv' | 'excel' | 'json')}
                disabled={exporting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  {formatOptions.map((option) => {
                    const Icon = option.icon
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Data</Label>
              <Select
                value={dataType}
                onValueChange={(value) => setDataType(value as 'all' | 'clean' | 'quarantine')}
                disabled={exporting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select data type" />
                </SelectTrigger>
                <SelectContent>
                  {dataTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            </div>
          </div>

          {/* Column Selection Header */}
          <div className="space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Column Selection</div>
                <div className="text-sm font-medium mt-2">
                  {selectedColumns.length} of {columns.length} columns selected
                  {renamedCount > 0 && (
                    <span className="ml-3 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                      ({renamedCount} renamed)
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={exporting} className="text-xs h-8">
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll} disabled={exporting} className="text-xs h-8">
                Clear All
              </Button>
            </div>
            </div>
          </div>

          {/* Column List - scrollable area with flexible height */}
          <ScrollArea className="border rounded-lg bg-muted/30 flex-1 min-h-0">
            <div className="p-3 space-y-2">
                {columns.map((col) => {
                  const state = columnStates[col] || { selected: true, exportName: col, isEditing: false }
                  const isRenamed = state.exportName !== col
                  
                  return (
                    <div 
                      key={col} 
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        state.selected
                          ? 'bg-blue-100/60 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700/50 hover:bg-blue-100/80 dark:hover:bg-blue-900/60 shadow-sm'
                          : 'bg-muted/30 border-muted/50 hover:bg-muted/50'
                      }`}
                      onClick={() => !exporting && handleToggleColumn(col)}
                    >
                      <Checkbox
                        checked={state.selected}
                        onCheckedChange={() => handleToggleColumn(col)}
                        disabled={exporting}
                      />
                      
                      <div className="flex-1 min-w-0">
                        {state.isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={state.exportName}
                              onChange={(e) => handleNameChange(col, e.target.value)}
                              className="h-8 text-sm flex-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEndEdit(col)
                                if (e.key === 'Escape') handleResetName(col)
                              }}
                            />
                            {state.exportName !== col && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30" 
                                onClick={() => handleEndEdit(col)}
                                title="Confirm"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" 
                              onClick={() => handleResetName(col)}
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium truncate ${
                              state.selected
                                ? isRenamed ? 'text-blue-700 dark:text-blue-300 line-through' : 'text-blue-900 dark:text-blue-100 font-semibold'
                                : isRenamed ? 'text-muted-foreground line-through' : 'text-foreground'
                            }`}>
                              {col}
                            </span>
                            {isRenamed && (
                              <>
                                <span className={`text-xs font-medium ${
                                  state.selected ? 'text-blue-600 dark:text-blue-300' : 'text-muted-foreground'
                                }`}>→</span>
                                <span className={`text-sm font-medium truncate px-2 py-0.5 rounded ${
                                  state.selected 
                                    ? 'text-green-700 dark:text-green-200 bg-green-200/50 dark:bg-green-900/50'
                                    : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20'
                                }`}>
                                  {state.exportName}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {!state.isEditing && state.selected && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30" 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStartEdit(col)
                            }}
                            disabled={exporting}
                            title="Rename"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {isRenamed && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30" 
                              onClick={(e) => {
                                e.stopPropagation()
                                handleResetName(col)
                              }}
                              disabled={exporting}
                              title="Reset"
                            >
                              <Undo className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

          {/* Action Buttons - fixed at bottom */}
          <div className="flex justify-end gap-3 shrink-0 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={exporting}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={exporting || selectedColumns.length === 0}
              className="gap-2 px-6 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export {selectedFormat.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

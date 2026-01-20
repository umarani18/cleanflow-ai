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
      <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Columns className="h-5 w-5" />
            Export with Column Selection
          </DialogTitle>
          <DialogDescription>
            Select and rename columns for: {fileName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Format and Data Type Row */}
          <div className="grid grid-cols-2 gap-4 shrink-0">
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

          {/* Column Selection Header */}
          <div className="flex items-center justify-between shrink-0">
            <Label className="text-sm font-medium">
              Columns ({selectedColumns.length}/{columns.length} selected)
              {renamedCount > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  • {renamedCount} renamed
                </span>
              )}
            </Label>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleSelectAll} disabled={exporting}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDeselectAll} disabled={exporting}>
                Deselect All
              </Button>
            </div>
          </div>

          {/* Column List - scrollable area with reduced height */}
          <ScrollArea className="border rounded-lg h-[200px]">
            <div className="p-2 space-y-1">
                {columns.map((col) => {
                  const state = columnStates[col] || { selected: true, exportName: col, isEditing: false }
                  const isRenamed = state.exportName !== col
                  
                  return (
                    <div 
                      key={col} 
                      className={`flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 transition-colors ${
                        !state.selected ? 'opacity-50' : ''
                      }`}
                    >
                      <Checkbox
                        checked={state.selected}
                        onCheckedChange={() => handleToggleColumn(col)}
                        disabled={exporting}
                      />
                      
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className={`text-sm truncate ${isRenamed ? 'text-muted-foreground line-through' : 'font-medium'}`}>
                          {col}
                        </span>
                        
                        {isRenamed && (
                          <>
                            <span className="text-muted-foreground">→</span>
                          </>
                        )}
                        
                        {state.isEditing ? (
                          <div className="flex items-center gap-1 flex-1">
                            <Input
                              value={state.exportName}
                              onChange={(e) => handleNameChange(col, e.target.value)}
                              className="h-7 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEndEdit(col)
                                if (e.key === 'Escape') handleResetName(col)
                              }}
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEndEdit(col)}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleResetName(col)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            {isRenamed && (
                              <span className="text-sm font-medium text-green-600 dark:text-green-400 truncate">
                                {state.exportName}
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {!state.isEditing && state.selected && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7" 
                            onClick={() => handleStartEdit(col)}
                            disabled={exporting}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          {isRenamed && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7" 
                              onClick={() => handleResetName(col)}
                              disabled={exporting}
                            >
                              <Undo className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

          {/* Preview Info - fixed at bottom */}
          <div className="rounded-lg border bg-muted/50 p-3 text-sm shrink-0">
            <p className="text-muted-foreground">
              Export will include <strong>{selectedColumns.length}</strong> columns
              {renamedCount > 0 && (
                <> with <strong>{renamedCount}</strong> renamed column{renamedCount > 1 ? 's' : ''}</>
              )}
              {' '}in <strong>{selectedFormat.toUpperCase()}</strong> format
            </p>
          </div>

          {/* Action Buttons - fixed at bottom */}
          <div className="flex justify-end gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={exporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={exporting || selectedColumns.length === 0}
              className="gap-2"
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

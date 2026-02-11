'use client'

import { useState, useEffect } from 'react'
import {
  Network,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import quickBooksAPI, {
  QuickBooksConnectionStatus,
  QuickBooksImportResponse,
} from '@/lib/api/quickbooks-api'
import { fileManagementAPI, type FileStatusResponse } from '@/lib/api/file-management-api'
import { useAuth } from '@/hooks/useAuth'

interface QuickBooksFile {
  upload_id: string
  filename: string
  original_filename?: string
  status: string
  rows_clean?: number
}

interface QuickBooksImportProps {
  mode?: "source" | "destination"
  uploadId?: string  // Required for export/destination mode
  onImportComplete?: (uploadId: string) => void
  onNotification?: (message: string, type: 'success' | 'error') => void
}

export default function QuickBooksImport({
  mode,
  uploadId,
  onImportComplete,
  onNotification,
}: QuickBooksImportProps) {
  const { idToken } = useAuth()
  const [connected, setConnected] = useState(false)
  const [connectionInfo, setConnectionInfo] = useState<QuickBooksConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<QuickBooksFile | null>(null)
  const [files, setFiles] = useState<QuickBooksFile[]>([])

  // Import/Export configuration
  const [config, setConfig] = useState({
    entity: 'invoices' as 'customers' | 'invoices' | 'vendors' | 'items',
    dateFrom: '',
    dateTo: '',
    limit: 1000,
  })

  const [importResult, setImportResult] = useState<QuickBooksImportResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Column selection state
  const [columnModalOpen, setColumnModalOpen] = useState(false)
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set())
  const [columnsLoading, setColumnsLoading] = useState(false)
  const [columnsError, setColumnsError] = useState<string | null>(null)
  const isPermissionError = (error: unknown) =>
    ((error as Error)?.message || "").toLowerCase().includes("permission denied") ||
    ((error as Error)?.message || "").toLowerCase().includes("forbidden")

  // Load files from API
  const loadFiles = async () => {
    if (!idToken) {
      console.log('No idToken available, skipping file load')
      return
    }

    try {
      console.log('Loading files from API...')
      const response = await fileManagementAPI.getUploads(idToken)
      const uploadedFiles = response.items || []
      const mappedFiles = uploadedFiles.map((f: FileStatusResponse) => ({
        upload_id: f.upload_id,
        filename: f.filename || '',
        original_filename: f.original_filename,
        status: f.status,
        rows_clean: f.rows_clean,
      }))
      setFiles(mappedFiles)
      console.log('Files loaded:', mappedFiles.length)
    } catch (err: any) {
      const message = (err?.message || "").toLowerCase()
      if (!message.includes("permission denied") && !message.includes("forbidden")) {
        console.warn("Failed to load files.")
      }
      setFiles([])
    }
  }

  useEffect(() => {
    if (mode === 'destination' && idToken) {
      loadFiles()
    }
  }, [mode, idToken])

  // Handle file selection with column fetching
  const handleFileSelect = async (uploadId: string) => {
    const file = files.find(f => f.upload_id === uploadId)
    if (file) {
      setSelectedFile(file)
      
      // Fetch columns for the selected file
      if (mode === 'destination' && idToken) {
        setColumnModalOpen(true)
        setColumnsLoading(true)
        setColumnsError(null)
        
        try {
          const resp = await fileManagementAPI.getFileColumns(uploadId, idToken)
          const cols = resp.columns || []
          setAvailableColumns(cols)
          setSelectedColumns(new Set(cols))
          
          if (cols.length === 0) {
            setColumnsError('No columns detected for this file. You can still proceed.')
          }
        } catch (err) {
          if (!isPermissionError(err)) {
            console.error('Failed to fetch columns:', err)
          }
          setAvailableColumns([])
          setSelectedColumns(new Set())
          setColumnsError('Unable to fetch columns. You can proceed without column selection.')
        } finally {
          setColumnsLoading(false)
        }
      }
    }
  }

  const handleToggleColumn = (col: string, checked: boolean) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(col)
      } else {
        next.delete(col)
      }
      return next
    })
  }

  const handleToggleAllColumns = (checked: boolean) => {
    setSelectedColumns(checked ? new Set(availableColumns) : new Set())
  }

  useEffect(() => {
    checkConnection()

    // Listen for messages from callback window or tab visibility changes
    const messageHandler = (event: MessageEvent) => {
      if (
        event.data.type === 'quickbooks-auth-success' ||
        event.data.type === 'quickbooks-connection-updated'
      ) {
        console.log('Received auth success message, refreshing connection status')
        setTimeout(() => checkConnection(), 500)
      }
    }

    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible, rechecking connection')
        checkConnection()
      }
    }

    window.addEventListener('message', messageHandler)
    document.addEventListener('visibilitychange', visibilityHandler)

    return () => {
      window.removeEventListener('message', messageHandler)
      document.removeEventListener('visibilitychange', visibilityHandler)
    }
  }, [])

  const checkConnection = async () => {
    try {
      setLoading(true)
      const status = await quickBooksAPI.getConnectionStatus()
      setConnected(status.connected)
      setConnectionInfo(status)
    } catch (err) {
      console.error('Error checking connection:', err)
    } finally {
      setLoading(false)
    }
  }

  const connectQuickBooks = async () => {
    try {
      setError(null)
      const result = await quickBooksAPI.openOAuthPopup()

      if (result.success) {
        onNotification?.('QuickBooks connected successfully!', 'success')
        checkConnection()
      } else if (result.error) {
        setError(result.error)
        onNotification?.(`Connection failed: ${result.error}`, 'error')
      }
    } catch (err) {
      console.error('Error connecting QuickBooks:', err)
      const message = (err as Error).message || 'Failed to connect to QuickBooks'
      setError(message)
      onNotification?.('Failed to connect to QuickBooks', 'error')
    }
  }

  const disconnectQuickBooks = async () => {
    if (!confirm('Are you sure you want to disconnect QuickBooks?')) {
      return
    }

    try {
      await quickBooksAPI.disconnect()
      setConnected(false)
      setConnectionInfo(null)
      onNotification?.('Disconnected from QuickBooks', 'success')
    } catch (err) {
      console.error('Error disconnecting QuickBooks:', err)
      const message = (err as Error).message
      setError(message)
      onNotification?.('Failed to disconnect from QuickBooks', 'error')
    }
  }

  const importFromQuickBooks = async () => {
    if (!connected) {
      setError('Please connect to QuickBooks first')
      return
    }

    if (!config.entity) {
      setError('Please select an entity to import')
      return
    }

    try {
      setIsImporting(true)
      setError(null)
      setImportResult(null)

      const filters: { limit: number; date_from?: string; date_to?: string } = {
        limit: config.limit,
      }

      if (config.dateFrom) {
        filters.date_from = config.dateFrom
      }
      if (config.dateTo) {
        filters.date_to = config.dateTo
      }

      console.log('Importing from QuickBooks with filters:', filters)
      const result = await quickBooksAPI.importData(config.entity, filters)
      console.log('QuickBooks import result:', result)

      setImportResult(result)
      onNotification?.(`Successfully imported ${result.records_imported} records!`, 'success')
      
      // Call parent's onImportComplete to trigger auto-processing
      onImportComplete?.(result.upload_id)
    } catch (err) {
      console.error('Error importing data:', err)
      const message = (err as Error).message || 'Failed to import data'
      setError(message)
      onNotification?.('Import failed: ' + message, 'error')
    } finally {
      setIsImporting(false)
    }
  }

  const exportToQuickBooks = async () => {
    if (!connected) {
      setError('Please connect to QuickBooks first')
      return
    }

    if (!selectedFile && !uploadId) {
      setError('Please select a file to export')
      return
    }

    if (!config.entity) {
      setError('Please select an entity to export')
      return
    }

    if (mode === 'destination' && selectedColumns.size === 0) {
      setError('Please select at least one column to export')
      return
    }

    try {
      setIsExporting(true)
      setError(null)
      setImportResult(null)

      const fileId = selectedFile?.upload_id || uploadId
      
      if (!fileId) {
        setError('Please select a file to export')
        return
      }

      console.log('Exporting to QuickBooks, uploadId:', fileId, 'Columns:', Array.from(selectedColumns))
      
      // For now, pass basic export request - columns will be filtered on backend
      const result = await quickBooksAPI.exportToQuickBooks(fileId)
      console.log('QuickBooks export result:', result)

      setImportResult({
        success: result.success,
        message: result.message,
        records_imported: result.records_exported || 0,
        filename: `exported_to_quickbooks_${config.entity}`,
        upload_id: fileId,
        entity: config.entity,
      })
      
      // Close column modal after successful export
      setColumnModalOpen(false)
      
      onNotification?.(`Successfully exported ${result.records_exported} records to QuickBooks!`, 'success')
    } catch (err) {
      console.error('Error exporting data:', err)
      const errorMsg = (err as Error).message || 'Failed to export data'
      
      // Provide more helpful error messages
      let userMessage = 'Export failed: ' + errorMsg
      if (errorMsg.includes('NoSuchKey') || errorMsg.includes('does not exist')) {
        userMessage = 'The processed data for this file is not available. Please ensure the file has been processed successfully before exporting.'
      } else if (errorMsg.includes('Connection')) {
        userMessage = 'Connection to QuickBooks failed. Please reconnect and try again.'
      }
      
      setError(userMessage)
      onNotification?.(userMessage, 'error')
    } finally {
      setIsExporting(false)
    }
  }

  const entityOptions = [
    { value: 'customers', label: 'Customers' },
    { value: 'invoices', label: 'Invoices' },
    { value: 'vendors', label: 'Vendors' },
    { value: 'items', label: 'Items' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] py-8 sm:py-12 lg:py-16">
        <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] p-4 sm:p-6 lg:p-8">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="py-2 sm:py-3">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          <AlertDescription className="text-sm sm:text-base">{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {importResult && (
        <Alert className="border-green-200 bg-green-50 py-2 sm:py-3">
          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
          <AlertDescription className="text-sm sm:text-base text-green-900">
            {mode === "source" ? "Imported" : "Exported"} {importResult.records_imported || 0} records • {importResult.filename}
          </AlertDescription>
        </Alert>
      )}

      {/* Not Connected State */}
      {!connected ? (
        <div className="flex flex-col items-center justify-center py-8 sm:py-12 lg:py-16 text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 sm:mb-5 lg:mb-6">
            <Network className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-green-600" />
          </div>
          <h3 className="text-lg sm:text-xl font-medium mb-2">QuickBooks Online</h3>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-4 sm:mb-5 lg:mb-6 max-w-md px-4">
            Connect your QuickBooks account to {mode === "source" ? "import" : "export"} data directly
          </p>
          <Button onClick={connectQuickBooks} size="lg" className="bg-green-600 hover:bg-green-700 px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-base">
            <ExternalLink className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            Connect QuickBooks
          </Button>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Connected Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 sm:gap-3">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <span className="text-sm sm:text-base font-medium text-green-900">Connected</span>
              {connectionInfo?.realm_id && (
                <span className="text-xs sm:text-sm text-green-700 truncate max-w-[120px] sm:max-w-none">({connectionInfo.realm_id})</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={disconnectQuickBooks}
              className="h-7 sm:h-8 text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 self-end sm:self-auto"
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
              Disconnect
            </Button>
          </div>

          {/* Import Form - Only for Source Mode */}
          {mode === "source" && (
            <div className="grid gap-3 sm:gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-xs sm:text-sm mb-1.5 sm:mb-2 block">Entity</Label>
                  <Select
                    value={config.entity}
                    onValueChange={(value) =>
                      setConfig({
                        ...config,
                        entity: value as 'customers' | 'invoices' | 'vendors' | 'items',
                      })
                    }
                  >
                    <SelectTrigger className="h-9 sm:h-10 text-sm sm:text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {entityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm mb-1.5 sm:mb-2 block">Max Records</Label>
                  <Input
                    type="number"
                    value={config.limit}
                    onChange={(e) =>
                      setConfig({ ...config, limit: parseInt(e.target.value) || 1000 })
                    }
                    min={1}
                    max={10000}
                    className="h-9 sm:h-10 text-sm sm:text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-xs sm:text-sm mb-1.5 sm:mb-2 block">From Date <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                  <Input
                    type="date"
                    value={config.dateFrom}
                    onChange={(e) => setConfig({ ...config, dateFrom: e.target.value })}
                    className="h-9 sm:h-10 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm mb-1.5 sm:mb-2 block">To Date <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                  <Input
                    type="date"
                    value={config.dateTo}
                    onChange={(e) => setConfig({ ...config, dateTo: e.target.value })}
                    className="h-9 sm:h-10 text-sm sm:text-base"
                  />
                </div>
              </div>

              <Button
                onClick={importFromQuickBooks}
                disabled={isImporting}
                className="w-full bg-green-600 hover:bg-green-700 h-10 sm:h-12 text-sm sm:text-base"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Import from QuickBooks
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Export Form - Only for Destination Mode */}
          {mode === "destination" && (
            <div className="grid gap-3 sm:gap-4">
              {/* File Selection */}
              <div>
                <Label className="text-xs sm:text-sm mb-1.5 sm:mb-2 block">Select File to Export</Label>
                {files && files.length > 0 ? (
                  <Select
                    value={selectedFile?.upload_id || ''}
                    onValueChange={handleFileSelect}
                  >
                    <SelectTrigger className="h-9 sm:h-10 text-sm sm:text-base">
                      <SelectValue placeholder="Choose a file to export" />
                    </SelectTrigger>
                    <SelectContent>
                      {files.map((file) => (
                        <SelectItem key={file.upload_id} value={file.upload_id}>
                          {file.original_filename || file.filename}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="w-full h-9 sm:h-10 flex items-center px-3 border border-input rounded-md bg-muted text-sm text-muted-foreground">
                    No files available. Please upload and process files first.
                  </div>
                )}
              </div>

              {/* Selected File Info */}
              {selectedFile && (
                <Alert className="border-blue-200 bg-blue-50 py-2 sm:py-3">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  <AlertDescription className="text-sm sm:text-base text-blue-900 ml-2">
                    {selectedFile.original_filename || selectedFile.filename} • Status: {selectedFile.status}
                  </AlertDescription>
                </Alert>
              )}

              {/* Destination Entity */}
              <div>
                <Label className="text-xs sm:text-sm mb-1.5 sm:mb-2 block">Destination Entity</Label>
                <Select
                  value={config.entity}
                  onValueChange={(value) =>
                    setConfig({
                      ...config,
                      entity: value as 'customers' | 'invoices' | 'vendors' | 'items',
                    })
                  }
                >
                  <SelectTrigger className="h-9 sm:h-10 text-sm sm:text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {entityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={exportToQuickBooks}
                disabled={isExporting || !selectedFile}
                className="w-full bg-green-600 hover:bg-green-700 h-10 sm:h-12 text-sm sm:text-base"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Export to QuickBooks
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Column Selection Dialog */}
      <AlertDialog open={columnModalOpen} onOpenChange={setColumnModalOpen}>
        <AlertDialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Select Columns to Export</AlertDialogTitle>
            <AlertDialogDescription>
              Choose which columns from {selectedFile?.original_filename || selectedFile?.filename} should be exported to QuickBooks.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            {columnsLoading ? (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading columns...</span>
              </div>
            ) : (
              <>
                {/* Select All Checkbox */}
                <div className="flex items-center space-x-2 py-2 border-b">
                  <Checkbox
                    id="select-all-columns"
                    checked={selectedColumns.size === availableColumns.length && availableColumns.length > 0}
                    onCheckedChange={(checked) => handleToggleAllColumns(checked === true)}
                  />
                  <label htmlFor="select-all-columns" className="text-sm font-medium cursor-pointer">
                    Select All
                  </label>
                </div>

                {/* Column List */}
                <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                  {availableColumns.length > 0 ? (
                    availableColumns.map((col) => (
                      <div key={col} className="flex items-center space-x-2">
                        <Checkbox
                          id={`col-${col}`}
                          checked={selectedColumns.has(col)}
                          onCheckedChange={(checked) => handleToggleColumn(col, checked === true)}
                        />
                        <label htmlFor={`col-${col}`} className="text-sm cursor-pointer truncate flex-1">
                          {col}
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No columns available</p>
                  )}
                </div>

                {columnsError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs ml-2">{columnsError}</AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={selectedColumns.size === 0 || isExporting}
              onClick={() => {
                setColumnModalOpen(false)
                exportToQuickBooks()
              }}
            >
              {isExporting ? 'Exporting...' : 'Confirm & Export'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

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
import zohoBooksAPI, {
  ZohoBooksConnectionStatus,
  ZohoBooksImportResponse,
} from '@/lib/api/zoho-books-api'
import { fileManagementAPI, type FileStatusResponse } from '@/lib/api/file-management-api'
import { useAuth } from '@/hooks/useAuth'

interface ZohoFile {
  upload_id: string
  filename: string
  original_filename?: string
  status: string
  rows_clean?: number
}

interface ZohoBooksImportProps {
  mode?: 'source' | 'destination'
  uploadId?: string
  onImportComplete?: (uploadId: string) => void
  onNotification?: (message: string, type: 'success' | 'error') => void
}

export default function ZohoBooksImport({
  mode,
  uploadId,
  onImportComplete,
  onNotification,
}: ZohoBooksImportProps) {
  const { idToken } = useAuth()
  const [connected, setConnected] = useState(false)
  const [connectionInfo, setConnectionInfo] = useState<ZohoBooksConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<ZohoFile | null>(null)
  const [files, setFiles] = useState<ZohoFile[]>([])

  const [config, setConfig] = useState({
    entity: 'contacts' as 'contacts' | 'items' | 'invoices' | 'customers' | 'vendors',
    dateFrom: '',
    dateTo: '',
    limit: 200,
    fetchAll: false,
  })

  const [importResult, setImportResult] = useState<ZohoBooksImportResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [columnModalOpen, setColumnModalOpen] = useState(false)
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set())
  const [columnsLoading, setColumnsLoading] = useState(false)
  const [columnsError, setColumnsError] = useState<string | null>(null)

  const loadFiles = async () => {
    if (!idToken) return

    try {
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
    } catch (err) {
      console.error('Error loading files:', err)
    }
  }

  useEffect(() => {
    if (mode === 'destination' && idToken) {
      loadFiles()
    }
  }, [mode, idToken])

  const handleFileSelect = async (uploadId: string) => {
    const file = files.find((f) => f.upload_id === uploadId)
    if (!file) return

    setSelectedFile(file)

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
        console.error('Failed to fetch columns:', err)
        setAvailableColumns([])
        setSelectedColumns(new Set())
        setColumnsError('Unable to fetch columns. You can proceed without column selection.')
      } finally {
        setColumnsLoading(false)
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

    const messageHandler = (event: MessageEvent) => {
      if (
        event.data.type === 'zoho-books-auth-success' ||
        event.data.type === 'zoho-books-connection-updated'
      ) {
        setTimeout(() => checkConnection(), 500)
      }
    }

    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
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
      const status = await zohoBooksAPI.getConnectionStatus()
      setConnected(status.connected)
      setConnectionInfo(status)
    } catch (err) {
      console.error('Error checking connection:', err)
    } finally {
      setLoading(false)
    }
  }

  const connectZoho = async () => {
    try {
      setError(null)
      const result = await zohoBooksAPI.openOAuthPopup()

      if (result.success) {
        onNotification?.('Zoho Books connected successfully!', 'success')
        checkConnection()
      } else {
        throw new Error(result.error || 'Failed to connect to Zoho Books')
      }
    } catch (err) {
      console.error('Error connecting Zoho Books:', err)
      const message = (err as Error).message || 'Failed to connect to Zoho Books'
      setError(message)
      onNotification?.('Failed to connect to Zoho Books', 'error')
    }
  }

  const disconnectZoho = async () => {
    if (!confirm('Are you sure you want to disconnect Zoho Books?')) return

    try {
      await zohoBooksAPI.disconnect()
      setConnected(false)
      setConnectionInfo(null)
      onNotification?.('Disconnected from Zoho Books', 'success')
    } catch (err) {
      console.error('Error disconnecting Zoho Books:', err)
      const message = (err as Error).message || 'Failed to disconnect from Zoho Books'
      setError(message)
      onNotification?.('Failed to disconnect from Zoho Books', 'error')
    }
  }

  const importFromZoho = async () => {
    if (!connected) {
      setError('Please connect to Zoho Books first')
      return
    }

    try {
      setIsImporting(true)
      setError(null)
      setImportResult(null)

      const filters: Record<string, any> = {
        limit: config.limit,
        page: 1,
        all: config.fetchAll,
      }
      if (config.entity === 'invoices') {
        if (config.dateFrom) filters.date_from = config.dateFrom
        if (config.dateTo) filters.date_to = config.dateTo
      }

      const result = await zohoBooksAPI.importData(config.entity, filters, connectionInfo?.org_id)
      setImportResult(result)
      onImportComplete?.(result.upload_id)
      onNotification?.('Zoho Books import completed', 'success')
    } catch (err) {
      console.error('Zoho Books import error:', err)
      const message = (err as Error).message || 'Failed to import from Zoho Books'
      setError(message)
      onNotification?.('Failed to import from Zoho Books', 'error')
    } finally {
      setIsImporting(false)
    }
  }

  const exportToZoho = async () => {
    if (!connected) {
      setError('Please connect to Zoho Books first')
      return
    }

    if (mode === 'destination' && availableColumns.length > 0) {
      const selected = selectedColumns.size > 0 ? selectedColumns : new Set(availableColumns)
      const has = (name: string) => selected.has(name)
      let validationError: string | null = null

      if (config.entity === 'contacts' || config.entity === 'customers' || config.entity === 'vendors') {
        if (!has('name') && !has('contact_name') && !has('company_name')) {
          validationError = 'Missing required column for Zoho contacts: name (or contact_name/company_name).'
        }
      } else if (config.entity === 'items') {
        if (!has('name')) {
          validationError = 'Missing required column for Zoho items: name.'
        }
      } else if (config.entity === 'invoices') {
        const hasLineItems = has('line_items')
        const hasAltItems = has('item_id') && has('quantity')
        if (!has('customer_id')) {
          validationError = 'Missing required column for Zoho invoices: customer_id.'
        } else if (!hasLineItems && !hasAltItems) {
          validationError = 'Missing required invoice columns: line_items OR (item_id + quantity).'
        }
      }

      if (validationError) {
        setError(validationError)
        onNotification?.(validationError, 'error')
        return
      }
    }

    try {
      setIsExporting(true)
      setError(null)
      const fileId = uploadId || selectedFile?.upload_id
      if (!fileId) {
        setError('Please select a file to export')
        return
      }

      const result = await zohoBooksAPI.exportToZoho(fileId, config.entity, connectionInfo?.org_id)
      onNotification?.(`Exported ${result.success_count || 0} records to Zoho Books!`, 'success')

      if (onImportComplete) {
        onImportComplete(fileId)
      }
    } catch (err) {
      console.error('Zoho Books export error:', err)
      const message = (err as Error).message || 'Failed to export to Zoho Books'
      setError(message)
      onNotification?.('Failed to export to Zoho Books', 'error')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-muted p-2 rounded-full">
              <Network className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Zoho Books</h3>
              <p className="text-sm text-muted-foreground">
                Connect your Zoho Books account to {mode === 'destination' ? 'export' : 'import'} data
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : connected ? (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                Not Connected
              </span>
            )}
          </div>
        </div>

        {!connected ? (
          <div className="mt-4">
            <Button onClick={connectZoho} size="lg" className="px-6 py-5 text-sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect Zoho Books
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={disconnectZoho}>
              <Trash2 className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
            {connectionInfo?.org_id && (
              <span className="text-xs text-muted-foreground self-center">
                Org ID: {connectionInfo.org_id}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg border p-4 bg-card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Entity</Label>
            <Select
              value={config.entity}
              onValueChange={(value) =>
                setConfig((prev) => ({
                  ...prev,
                  entity: value as typeof prev.entity,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contacts">Contacts</SelectItem>
                <SelectItem value="customers">Customers</SelectItem>
                <SelectItem value="vendors">Vendors</SelectItem>
                <SelectItem value="items">Items</SelectItem>
                <SelectItem value="invoices">Invoices</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === 'destination' ? (
            <div className="space-y-2">
              <Label>File to export</Label>
              <Select value={selectedFile?.upload_id || ''} onValueChange={handleFileSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select file" />
                </SelectTrigger>
                <SelectContent>
                  {files.map((file) => (
                    <SelectItem key={file.upload_id} value={file.upload_id}>
                      {file.original_filename || file.filename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Limit</Label>
              <Input
                type="number"
                min={1}
                max={200}
                value={config.limit}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    limit: Number(e.target.value),
                  }))
                }
              />
            </div>
          )}
        </div>

        {mode !== 'destination' && config.entity === 'invoices' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={config.dateFrom}
                onChange={(e) => setConfig((prev) => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={config.dateTo}
                onChange={(e) => setConfig((prev) => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
          </div>
        )}

        {mode !== 'destination' && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="zoho-fetch-all"
              checked={config.fetchAll}
              onCheckedChange={(checked) =>
                setConfig((prev) => ({ ...prev, fetchAll: Boolean(checked) }))
              }
            />
            <Label htmlFor="zoho-fetch-all" className="text-sm">
              Fetch all pages (may take longer)
            </Label>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {importResult && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              Imported {importResult.records_imported} records to file {importResult.filename}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-3">
          {mode === 'destination' ? (
            <Button
              onClick={exportToZoho}
              disabled={isExporting || !connected}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export to Zoho Books
            </Button>
          ) : (
            <Button
              onClick={importFromZoho}
              disabled={isImporting || !connected}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Import from Zoho Books
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={columnModalOpen} onOpenChange={setColumnModalOpen}>
        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Choose columns to export</AlertDialogTitle>
            <AlertDialogDescription>
              Select which columns should be used for the Zoho Books export.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            {columnsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading columns...
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="zoho-select-all"
                    checked={selectedColumns.size === availableColumns.length && availableColumns.length > 0}
                    onCheckedChange={(checked) => handleToggleAllColumns(Boolean(checked))}
                  />
                  <Label htmlFor="zoho-select-all">Select all</Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-auto border rounded-md p-3">
                  {availableColumns.map((col) => (
                    <label key={col} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedColumns.has(col)}
                        onCheckedChange={(checked) => handleToggleColumn(col, Boolean(checked))}
                      />
                      {col}
                    </label>
                  ))}
                </div>

                {columnsError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{columnsError}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => setColumnModalOpen(false)}
              disabled={columnsLoading}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

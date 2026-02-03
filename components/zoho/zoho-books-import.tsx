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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  const [exportSummary, setExportSummary] = useState<{
    success_count: number
    failed_count: number
    total_records: number
    errors: string[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [columnModalOpen, setColumnModalOpen] = useState(false)
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set())
  const [columnsLoading, setColumnsLoading] = useState(false)
  const [columnsError, setColumnsError] = useState<string | null>(null)
  const [mappingOpen, setMappingOpen] = useState(false)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [orgIdInput, setOrgIdInput] = useState('')

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
        setColumnMapping(autoMapColumns(config.entity, cols))

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

  const getUserId = () => {
    if (!idToken) return null
    try {
      const payload = idToken.split('.')[1]
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
      return decoded.sub || decoded.user_id || null
    } catch {
      return null
    }
  }

  const checkConnection = async () => {
    try {
      setLoading(true)
      const status = await zohoBooksAPI.getConnectionStatus()
      setConnected(status.connected)
      setConnectionInfo(status)
      const userId = getUserId()
      if (userId) {
        const stored = localStorage.getItem(`zoho_org_id:${userId}`)
        setOrgIdInput(status.org_id || stored || '')
      } else {
        setOrgIdInput(status.org_id || '')
      }
    } catch (err) {
      console.error('Error checking connection:', err)
    } finally {
      setLoading(false)
    }
  }

  const connectZoho = async () => {
    try {
      setError(null)
      setExportSummary(null)
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

      const result = await zohoBooksAPI.importData(
        config.entity,
        filters,
        orgIdInput || connectionInfo?.org_id
      )
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

    if (mode === 'destination') {
      const validation = validateMapping(config.entity, columnMapping, availableColumns)
      if (!validation.valid) {
        setError(validation.message)
        onNotification?.(validation.message || 'Please complete mapping', 'error')
        setMappingOpen(true)
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

      const result = await zohoBooksAPI.exportToZoho(
        fileId,
        config.entity,
        orgIdInput || connectionInfo?.org_id,
        columnMapping
      )
      const errors = (result.results || [])
        .filter((r) => r.status === 'failed' && r.error)
        .slice(0, 5)
        .map((r) => r.error as string)
      setExportSummary({
        success_count: result.success_count || 0,
        failed_count: result.failed_count || 0,
        total_records: result.total_records || 0,
        errors,
      })

      onNotification?.(
        `Exported ${result.success_count || 0} records to Zoho Books (${result.failed_count || 0} failed).`,
        'success'
      )

      if (onImportComplete) {
        onImportComplete(fileId)
      }
    } catch (err) {
      console.error('Zoho Books export error:', err)
      const message = (err as Error).message || 'Failed to export to Zoho Books'
      setError(message)
      setExportSummary(null)
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
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Use Org ID</Label>
              <Input
                className="h-8 w-48 text-xs"
                placeholder="Organization ID"
                value={orgIdInput}
                onChange={(e) => {
                  const value = e.target.value.trim()
                  setOrgIdInput(value)
                  const userId = getUserId()
                  if (userId) {
                    localStorage.setItem(`zoho_org_id:${userId}`, value)
                  }
                }}
              />
            </div>
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
        {exportSummary && (
          <Alert className="border-blue-200 bg-blue-50">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              Exported {exportSummary.success_count}/{exportSummary.total_records} records.
              {exportSummary.failed_count > 0 && (
                <span className="block mt-2 text-xs text-blue-900">
                  Failed: {exportSummary.failed_count}. {exportSummary.errors.length > 0 ? 'First errors:' : ''}
                  {exportSummary.errors.length > 0 && (
                    <ul className="list-disc pl-4 mt-1">
                      {exportSummary.errors.map((err, idx) => (
                        <li key={`${err}-${idx}`}>{err}</li>
                      ))}
                    </ul>
                  )}
                </span>
              )}
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
          {mode === 'destination' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setMappingOpen(true)}
              disabled={!selectedFile}
            >
              Mapping
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

      <Dialog open={mappingOpen} onOpenChange={setMappingOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Map columns for Zoho Books</DialogTitle>
            <DialogDescription>
              Map your file columns to Zoho Books fields before export.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {getMappingFields(config.entity).map((field) => (
              <div key={field.key} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <div className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </div>
                <Select
                  value={columnMapping[field.key] || ''}
                  onValueChange={(value) =>
                    setColumnMapping((prev) => ({ ...prev, [field.key]: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns.map((col) => (
                      <SelectItem key={`${field.key}-${col}`} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">{field.help}</div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setColumnMapping(autoMapColumns(config.entity, availableColumns))
              }}
            >
              Auto map
            </Button>
            <Button
              onClick={() => {
                const validation = validateMapping(config.entity, columnMapping, availableColumns)
                if (!validation.valid) {
                  setError(validation.message)
                  return
                }
                setMappingOpen(false)
              }}
            >
              Save mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getMappingFields(entity: string) {
  if (entity === 'items') {
    return [
      { key: 'name', label: 'Item Name', required: true, help: 'Zoho item name' },
      { key: 'description', label: 'Description', required: false, help: 'Item description' },
      { key: 'rate', label: 'Rate', required: false, help: 'Unit price / rate' },
    ]
  }
  if (entity === 'customers' || entity === 'vendors' || entity === 'contacts') {
    return [
      { key: 'contact_name', label: 'Contact Name', required: true, help: 'Customer/Vendor name' },
      { key: 'company_name', label: 'Company', required: false, help: 'Company name' },
      { key: 'email', label: 'Email', required: false, help: 'Email address' },
      { key: 'phone', label: 'Phone', required: false, help: 'Phone number' },
    ]
  }
  if (entity === 'invoices') {
    return [
      { key: 'customer_id', label: 'Customer ID', required: true, help: 'Zoho contact ID' },
      { key: 'line_items', label: 'Line Items', required: false, help: 'JSON array of line items' },
      { key: 'item_id', label: 'Item ID', required: false, help: 'Fallback if no line_items' },
      { key: 'quantity', label: 'Quantity', required: false, help: 'Fallback if no line_items' },
      { key: 'rate', label: 'Rate', required: false, help: 'Fallback if no line_items' },
    ]
  }
  return []
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[\s_]+/g, '')
}

function autoMapColumns(entity: string, columns: string[]) {
  const fields = getMappingFields(entity)
  const mapping: Record<string, string> = {}
  const normalized = new Map(columns.map((c) => [normalizeKey(c), c]))
  for (const field of fields) {
    const match = normalized.get(normalizeKey(field.key))
    if (match) {
      mapping[field.key] = match
      continue
    }
    if (field.key === 'contact_name') {
      const alt = ['name', 'itemname', 'companyname']
      for (const a of alt) {
        const found = normalized.get(a)
        if (found) {
          mapping[field.key] = found
          break
        }
      }
    }
  }
  return mapping
}

function validateMapping(entity: string, mapping: Record<string, string>, columns: string[]) {
  const fields = getMappingFields(entity)
  const available = new Set(columns)
  for (const field of fields) {
    if (field.required) {
      const source = mapping[field.key]
      if (!source || !available.has(source)) {
        return { valid: false, message: `Missing required mapping for ${field.label}.` }
      }
    }
  }
  return { valid: true, message: '' }
}

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
import quickBooksAPI, {
  QuickBooksConnectionStatus,
  QuickBooksImportResponse,
} from '@/lib/api/quickbooks-api'

interface QuickBooksImportProps {
  mode?: "source" | "destination"
  uploadId?: string  // Required for export/destination mode
  onImportComplete?: (uploadId: string) => void
  onNotification?: (message: string, type: 'success' | 'error') => void
}

export default function QuickBooksImport({
  mode = "source",
  uploadId,
  onImportComplete,
  onNotification,
}: QuickBooksImportProps) {
  const [connected, setConnected] = useState(false)
  const [connectionInfo, setConnectionInfo] = useState<QuickBooksConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Import/Export configuration
  const [config, setConfig] = useState({
    entity: 'invoices' as 'customers' | 'invoices' | 'vendors' | 'items',
    dateFrom: '',
    dateTo: '',
    limit: 1000,
  })

  const [importResult, setImportResult] = useState<QuickBooksImportResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

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

    if (!uploadId) {
      setError('No data selected for export')
      return
    }

    if (!config.entity) {
      setError('Please select an entity to export')
      return
    }

    try {
      setIsExporting(true)
      setError(null)
      setImportResult(null)

      console.log('Exporting to QuickBooks, uploadId:', uploadId)
      const result = await quickBooksAPI.exportToQuickBooks(uploadId)
      console.log('QuickBooks export result:', result)

      setImportResult({
        success: result.success,
        message: result.message,
        records_imported: result.records_exported || 0,
        filename: `exported_to_quickbooks_${config.entity}`,
        upload_id: uploadId,
        entity: config.entity,
      })
      onNotification?.(`Successfully exported ${result.records_exported} records to QuickBooks!`, 'success')
    } catch (err) {
      console.error('Error exporting data:', err)
      const message = (err as Error).message || 'Failed to export data'
      setError(message)
      onNotification?.('Export failed: ' + message, 'error')
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

          {/* Import Form */}
          <div className="grid gap-3 sm:gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-xs sm:text-sm mb-1.5 sm:mb-2 block">{mode === "source" ? "Entity" : "Destination Entity"}</Label>
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
              onClick={mode === "source" ? importFromQuickBooks : exportToQuickBooks}
              disabled={mode === "source" ? isImporting : isExporting}
              className="w-full bg-green-600 hover:bg-green-700 h-10 sm:h-12 text-sm sm:text-base"
            >
              {(mode === "source" ? isImporting : isExporting) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  {mode === "source" ? "Importing..." : "Exporting..."}
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  {mode === "source" ? "Import from QuickBooks" : "Export to QuickBooks"}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

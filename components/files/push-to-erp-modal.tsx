'use client'

import { useState } from 'react'
import { Loader2, CloudUpload, CheckCircle2, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import quickBooksAPI from '@/lib/api/quickbooks-api'
import zohoBooksAPI from '@/lib/api/zoho-books-api'
import type { FileStatusResponse } from '@/lib/api/file-management-api'

interface ERPOption {
  value: string
  label: string
  description: string
  available: boolean
}

const ERP_OPTIONS: ERPOption[] = [
  { value: 'quickbooks', label: 'QuickBooks Online', description: 'Push directly to your connected QuickBooks account', available: true },
  { value: 'zoho-books', label: 'Zoho Books', description: 'Push directly to your connected Zoho Books account', available: true },
  { value: 'oracle', label: 'Oracle Fusion', description: 'Export to Oracle ERP Cloud', available: false },
  { value: 'sap', label: 'SAP ERP', description: 'Push to SAP S/4HANA or Business One', available: false },
  { value: 'dynamics', label: 'Microsoft Dynamics', description: 'Export to Dynamics 365', available: false },
  { value: 'netsuite', label: 'NetSuite', description: 'Push to Oracle NetSuite', available: false },
  { value: 'workday', label: 'Workday', description: 'Export to Workday Financial Management', available: false },
  { value: 'sage', label: 'Sage Intacct', description: 'Push to Sage Intacct Cloud ERP', available: false },
  { value: 'epicor', label: 'Epicor Kinetic', description: 'Export to Epicor ERP', available: false },
]

interface PushToERPModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileStatusResponse | null
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function PushToERPModal({
  open,
  onOpenChange,
  file,
  onSuccess,
  onError,
}: PushToERPModalProps) {
  const [selectedERP, setSelectedERP] = useState<string>('quickbooks')
  const [pushing, setPushing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')

  const handlePush = async () => {
    if (!file) return

    const selectedOption = ERP_OPTIONS.find(opt => opt.value === selectedERP)
    
    if (!selectedOption?.available) {
      setError(`${selectedOption?.label || 'This ERP'} integration is coming soon. Please select QuickBooks Online for now.`)
      return
    }

    setPushing(true)
    setError(null)
    setResult(null)
    setStatus('Preparing export...')

    try {
      if (selectedERP === 'quickbooks') {
        // Check connection first
        setStatus('Checking QuickBooks connection...')
        const connectionStatus = await quickBooksAPI.getConnectionStatus()
        
        if (!connectionStatus.connected) {
          const msg = 'QuickBooks is not connected. Please connect your QuickBooks account first.'
          setError(msg)
          onError?.(msg)
          setPushing(false)
          return
        }

        setStatus('Exporting data to QuickBooks (this may take a moment)...')
        const response = await quickBooksAPI.exportToQuickBooks(file.upload_id)
        
        setStatus('')
        setResult({
          success: response.success,
          message: response.message || `Successfully exported ${response.records_exported || 0} records to QuickBooks`,
        })
        onSuccess?.()
      } else if (selectedERP === 'zoho-books') {
        setStatus('Checking Zoho Books connection...')
        const connectionStatus = await zohoBooksAPI.getConnectionStatus()

        if (!connectionStatus.connected) {
          const msg = 'Zoho Books is not connected. Please connect your Zoho Books account first.'
          setError(msg)
          onError?.(msg)
          setPushing(false)
          return
        }

        setStatus('Exporting data to Zoho Books (this may take a moment)...')
        const response = await zohoBooksAPI.exportToZoho(file.upload_id)

        setStatus('')
        setResult({
          success: response.success_count > 0,
          message: `Successfully exported ${response.success_count || 0} records to Zoho Books`,
        })
        onSuccess?.()
      }
    } catch (err) {
      console.error('Push to ERP error:', err)
      const msg = (err as Error).message || 'Failed to push to ERP'
      
      // Provide helpful messages for common errors
      let displayMsg = msg
      if (msg.includes('AbortError') || msg.includes('timed out')) {
        displayMsg = 'The export took too long. Please try again. If this persists, check your network connection and try again.'
      } else if (msg.includes('NoSuchKey') || msg.includes('does not exist')) {
        displayMsg = 'Failed to read processed data: The cleaned data file could not be found. Please process the file again and try exporting.'
      } else if (msg.includes('specified key does not exist')) {
        displayMsg = 'The cleaned data file is missing from storage. Please reprocess the file and try again.'
      }
      
      setError(displayMsg)
      onError?.(displayMsg)
    } finally {
      setPushing(false)
      setStatus('')
    }
  }

  const handleClose = () => {
    setResult(null)
    setError(null)
    setStatus('')
    onOpenChange(false)
  }

  const filename = file?.original_filename || file?.filename || 'selected file'
  const selectedOption = ERP_OPTIONS.find(opt => opt.value === selectedERP)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudUpload className="h-5 w-5 text-primary" />
            Push to your ERP Tool
          </DialogTitle>
          <DialogDescription>
            Export your cleaned data directly to your connected ERP system.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* File Info */}
          <div className="rounded-lg border p-3 bg-muted/50">
            <p className="text-sm font-medium">{filename}</p>
            {file && (
              <p className="text-xs text-muted-foreground mt-1">
                {file.rows_clean || file.rows_out || 0} clean rows ready to export
              </p>
            )}
          </div>

          {/* ERP Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select ERP Tool</Label>
            <RadioGroup 
              value={selectedERP} 
              onValueChange={setSelectedERP} 
              disabled={pushing || !!result?.success}
              className="space-y-2 max-h-[280px] overflow-y-auto pr-2"
            >
              {ERP_OPTIONS.map((option) => (
                <div 
                  key={option.value}
                  className={`flex items-center space-x-3 rounded-lg border p-3 transition-colors ${
                    selectedERP === option.value 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  } ${option.available ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                >
                  <RadioGroupItem value={option.value} id={option.value} disabled={!option.available} />
                  <Label htmlFor={option.value} className={`flex-1 ${option.available ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{option.label}</p>
                          {option.available ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              Connected
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                              Not Connected
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {status && (
            <Alert className="border-blue-200 bg-blue-50">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <AlertDescription className="text-blue-900 ml-2">{status}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={result.success ? 'text-green-900' : 'text-red-900'}>
                {result.message}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={handleClose}>
            {result?.success ? 'Close' : 'Cancel'}
          </Button>
          {!result?.success && (
            <Button
              onClick={handlePush}
              disabled={pushing || !file || !selectedOption?.available}
              className="gap-2"
            >
              {pushing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Pushing...
                </>
              ) : (
                <>
                  <CloudUpload className="h-4 w-4" />
                  Push to {selectedOption?.label || 'ERP'}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

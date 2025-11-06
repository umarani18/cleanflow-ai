import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Download, Loader2, Database } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ERPTransformationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDownload: (targetErp: string | null) => void
  downloading: boolean
  filename: string
}

const SUPPORTED_ERPS = [
  "Oracle Fusion",
  "SAP ERP",
  "Microsoft Dynamics",
  "NetSuite",
  "Workday",
  "Infor M3",
  "Infor LN",
  "Epicor Kinetic",
  "QAD ERP",
  "IFS Cloud",
  "Sage Intacct",
]

export function ERPTransformationModal({
  open,
  onOpenChange,
  onDownload,
  downloading,
  filename
}: ERPTransformationModalProps) {
  const [selectedErp, setSelectedErp] = useState<string | null>(null)
  const [noTransformation, setNoTransformation] = useState(true)

  const handleDownload = () => {
    if (noTransformation) {
      onDownload(null)
    } else if (selectedErp) {
      onDownload(selectedErp)
    }
  }

  const handleClose = () => {
    if (!downloading) {
      onOpenChange(false)
      // Reset state when closing
      setNoTransformation(true)
      setSelectedErp(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Download Options
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Downloading: <span className="font-semibold text-foreground">{filename}</span>
            </p>
          </div>

          {/* No Transformation Option */}
          <div
            className={cn(
              "border-2 rounded-lg p-4 cursor-pointer transition-all",
              noTransformation
                ? "border-emerald-500 bg-gradient-to-r from-emerald-500/10 to-teal-500/10"
                : "border-border hover:border-emerald-500/50"
            )}
            onClick={() => {
              setNoTransformation(true)
              setSelectedErp(null)
            }}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                  noTransformation ? "border-emerald-500" : "border-border"
                )}>
                  {noTransformation && (
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <div className="font-medium">Original Format</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Download without ERP transformation
                </p>
              </div>
            </div>
          </div>

          {/* ERP Transformation Option */}
          <div
            className={cn(
              "border-2 rounded-lg p-4 cursor-pointer transition-all",
              !noTransformation
                ? "border-purple-500 bg-gradient-to-r from-purple-500/10 to-pink-500/10"
                : "border-border hover:border-purple-500/50"
            )}
            onClick={() => setNoTransformation(false)}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                  !noTransformation ? "border-purple-500" : "border-border"
                )}>
                  {!noTransformation && (
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <div className="font-medium">Transform for ERP System</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Convert data format for your target ERP system
                </p>
              </div>
            </div>
          </div>

          {/* ERP Selection */}
          {!noTransformation && (
            <div className="pl-7 space-y-2 animate-in fade-in slide-in-from-top-2">
              <Label className="text-sm font-medium">Select Target ERP</Label>
              <RadioGroup value={selectedErp || ''} onValueChange={setSelectedErp}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2">
                  {SUPPORTED_ERPS.map((erp) => (
                    <div
                      key={erp}
                      className={cn(
                        "flex items-center space-x-2 rounded-md border px-3 py-2 cursor-pointer transition-colors",
                        selectedErp === erp
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-border hover:border-purple-500/50"
                      )}
                      onClick={() => setSelectedErp(erp)}
                    >
                      <RadioGroupItem value={erp} id={erp} />
                      <Label htmlFor={erp} className="text-sm cursor-pointer flex-1">
                        {erp}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={downloading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDownload}
            disabled={downloading || (!noTransformation && !selectedErp)}
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

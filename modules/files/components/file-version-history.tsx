/**
 * file-version-history.tsx
 *
 * Component for displaying and managing file version history
 * Shows version lineage with download and reprocess actions
 */

'use client'

import { useEffect, useState } from 'react'
import { Download, GitBranch, Loader2, Play } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/shared/hooks/use-toast'
import {
  fileManagementAPI,
  type FileVersionSummary,
} from '@/modules/files'

interface FileVersionHistoryProps {
  rootUploadId: string
  authToken: string
}

function dqScoreColor(score?: number | null): string {
  if (score == null) return 'text-muted-foreground'
  if (score >= 90) return 'text-green-600'
  if (score >= 70) return 'text-yellow-600'
  return 'text-red-600'
}

function statusBadgeVariant(status?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch ((status || '').toUpperCase()) {
    case 'DQ_FIXED':
    case 'COMPLETED':
      return 'default'
    case 'DQ_FAILED':
    case 'FAILED':
    case 'REJECTED':
      return 'destructive'
    default:
      return 'secondary'
  }
}

const PROCESSABLE = new Set(['UPLOADED', 'VALIDATED'])
const PROCESSED = new Set(['DQ_FIXED', 'COMPLETED', 'DQ_COMPLETE'])

export function FileVersionHistory({ rootUploadId, authToken }: FileVersionHistoryProps) {
  const [versions, setVersions] = useState<FileVersionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [fileDownloadingId, setFileDownloadingId] = useState<string | null>(null)
  const [quarantineDownloadingId, setQuarantineDownloadingId] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!rootUploadId || !authToken) return
    setLoading(true)
    fileManagementAPI
      .getFileVersions(rootUploadId, authToken)
      .then((res) => setVersions(res.versions ?? []))
      .catch(() => toast({ title: 'Failed to load version history', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [rootUploadId, authToken, toast])

  async function handleProcess(uploadId: string) {
    setProcessingId(uploadId)
    try {
      await fileManagementAPI.startProcessing(uploadId, authToken)
      setVersions((prev) =>
        prev.map((v) => (v.upload_id === uploadId ? { ...v, status: 'DQ_DISPATCHED' } : v))
      )
      toast({ title: 'Processing started', description: 'DQ engine is running on this version.' })
    } catch {
      toast({ title: 'Failed to start processing', variant: 'destructive' })
    } finally {
      setProcessingId(null)
    }
  }

  async function handleDownloadVersion(v: FileVersionSummary) {
    setFileDownloadingId(v.upload_id)
    const isProcessed = PROCESSED.has((v.status ?? '').toUpperCase())
    const dataType = isProcessed ? 'clean' : 'raw'
    try {
      const blob = await fileManagementAPI.downloadFile(v.upload_id, 'csv', dataType as any, authToken)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const base = (v.original_filename ?? v.upload_id).replace(/\.[^.]+$/, '')
      a.download = `${base}_v${v.version_number}_${dataType}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast({ title: 'Download failed', variant: 'destructive' })
    } finally {
      setFileDownloadingId(null)
    }
  }

  async function handleDownloadQuarantined(uploadId: string) {
    setQuarantineDownloadingId(uploadId)
    try {
      const res = await fileManagementAPI.getQuarantinedExportUrl(uploadId, authToken)
      if (!res.url) {
        toast({
          title: 'No quarantined rows',
          description: 'This version has no quarantined data to download.',
        })
        return
      }
      const a = document.createElement('a')
      a.href = res.url
      a.download = res.filename ?? 'quarantined.csv'
      a.click()
      toast({ title: `Downloading ${res.row_count} quarantined rows` })
    } catch {
      toast({ title: 'Download failed', variant: 'destructive' })
    } finally {
      setQuarantineDownloadingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading version history…
      </div>
    )
  }

  if (versions.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No version history found.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <GitBranch className="h-4 w-4" />
        {versions.length} version{versions.length !== 1 ? 's' : ''}
      </div>

      <ScrollArea className="max-h-96">
        <div className="space-y-2 pr-2">
          {versions.map((v, i) => (
            <div key={v.upload_id}>
              {i > 0 && <Separator className="my-2" />}
              <div className="flex items-start justify-between gap-3">
                {/* Left: version info */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs font-mono shrink-0">
                      v{v.version_number}
                    </Badge>
                    <Badge variant={statusBadgeVariant(v.status)} className="text-xs">
                      {v.status ?? '—'}
                    </Badge>
                    {v.dq_score != null && (
                      <span className={`text-xs font-semibold ${dqScoreColor(v.dq_score)}`}>
                        {v.dq_score.toFixed(1)}% DQ
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{v.original_filename}</p>
                  {v.patch_notes && (
                    <p className="text-xs text-muted-foreground italic">"{v.patch_notes}"</p>
                  )}
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {v.rows_quarantined != null && <span>{v.rows_quarantined} quarantined</span>}
                    {v.rows_clean != null && <span>{v.rows_clean} clean</span>}
                    {v.uploaded_at && <span>{new Date(v.uploaded_at).toLocaleDateString()}</span>}
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Download file */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-xs"
                    disabled={fileDownloadingId === v.upload_id}
                    onClick={() => handleDownloadVersion(v)}
                  >
                    {fileDownloadingId === v.upload_id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    {PROCESSED.has((v.status ?? '').toUpperCase()) ? 'Clean CSV' : 'Raw CSV'}
                  </Button>

                  {/* Process (only for UPLOADED/VALIDATED) */}
                  {PROCESSABLE.has((v.status ?? '').toUpperCase()) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-xs text-green-600 hover:text-green-700"
                      disabled={processingId === v.upload_id}
                      onClick={() => handleProcess(v.upload_id)}
                    >
                      {processingId === v.upload_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      Process
                    </Button>
                  )}

                  {/* Download quarantined (only when rows exist) */}
                  {(v.rows_quarantined ?? 0) > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-xs"
                      disabled={quarantineDownloadingId === v.upload_id}
                      onClick={() => handleDownloadQuarantined(v.upload_id)}
                    >
                      {quarantineDownloadingId === v.upload_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      Quarantined
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

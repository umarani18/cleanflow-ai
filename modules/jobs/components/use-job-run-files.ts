"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/modules/auth"
import { fileManagementAPI } from "@/modules/files/api/file-management-api"
import type { FileStatusResponse } from "@/modules/files/types"
import type { JobRun } from "@/modules/jobs/types/jobs.types"

export interface RunFileEntry {
    entity: string
    uploadId: string
    file: FileStatusResponse | null
    loading: boolean
    error?: string
}

export interface JobRunFilesState {
    entries: RunFileEntry[]
    loading: boolean
    detailFile: FileStatusResponse | null
    detailOpen: boolean
    setDetailOpen: (open: boolean) => void
    downloadFile: FileStatusResponse | null
    downloadOpen: boolean
    setDownloadOpen: (open: boolean) => void
    handleViewDetail: (file: FileStatusResponse) => void
    handleDownloadPrompt: (file: FileStatusResponse) => void
    handleDownload: (format: "csv" | "excel" | "json", dataType: "original" | "clean") => Promise<void>
    handleDelete: (uploadId: string) => Promise<void>
    downloading: boolean
}

export function useJobRunFiles(run: JobRun | null, open: boolean): JobRunFilesState {
    const { idToken } = useAuth()
    const [entries, setEntries] = useState<RunFileEntry[]>([])
    const [loading, setLoading] = useState(false)
    const [detailFile, setDetailFile] = useState<FileStatusResponse | null>(null)
    const [detailOpen, setDetailOpen] = useState(false)
    const [downloadFile, setDownloadFile] = useState<FileStatusResponse | null>(null)
    const [downloadOpen, setDownloadOpen] = useState(false)
    const [downloading, setDownloading] = useState(false)

    useEffect(() => {
        if (!open || !run || !idToken) {
            setEntries([])
            return
        }

        const entityResults = run.entity_results || {}
        const entityEntries = Object.entries(entityResults)
            .filter(([, result]) => result.upload_id)
            .map(([entity, result]) => ({
                entity,
                uploadId: result.upload_id!,
                file: null as FileStatusResponse | null,
                loading: true,
                error: undefined as string | undefined,
            }))

        if (entityEntries.length === 0) {
            setEntries([])
            setLoading(false)
            return
        }

        setEntries(entityEntries)
        setLoading(true)

        const fetchAll = async () => {
            const updated = await Promise.all(
                entityEntries.map(async (entry) => {
                    try {
                        const file = await fileManagementAPI.getFileStatus(entry.uploadId, idToken)
                        return { ...entry, file, loading: false }
                    } catch {
                        return { ...entry, file: null, loading: false, error: "File not found" }
                    }
                })
            )
            setEntries(updated)
            setLoading(false)
        }

        fetchAll()
    }, [open, run, idToken])

    const handleViewDetail = useCallback((file: FileStatusResponse) => {
        setDetailFile(file)
        setDetailOpen(true)
    }, [])

    const handleDownloadPrompt = useCallback((file: FileStatusResponse) => {
        setDownloadFile(file)
        setDownloadOpen(true)
    }, [])

    const handleDownload = useCallback(async (format: "csv" | "excel" | "json", dataType: "original" | "clean") => {
        if (!downloadFile || !idToken) return
        setDownloading(true)
        try {
            const exportResult = await fileManagementAPI.exportWithColumns(
                downloadFile.upload_id, idToken,
                { format, data: dataType === "original" ? "raw" : "clean" },
            )
            const baseFilename = (downloadFile.original_filename || downloadFile.filename || "file").replace(/\.[^/.]+$/, "")
            const extension = format === "excel" ? ".xlsx" : format === "json" ? ".json" : ".csv"
            const dataSuffix = dataType === "original" ? "_original" : "_clean"
            const filename = `${baseFilename}${dataSuffix}${extension}`
            const link = document.createElement("a")
            if (exportResult.blob) {
                const url = URL.createObjectURL(exportResult.blob)
                link.href = url
                link.download = filename
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)
            } else if (exportResult.downloadUrl) {
                link.href = exportResult.downloadUrl
                link.target = "_blank"
                link.rel = "noopener noreferrer"
                link.download = filename
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
            }
            setDownloadOpen(false)
        } catch (err) {
            console.error("Download failed:", err)
        } finally {
            setDownloading(false)
        }
    }, [downloadFile, idToken])

    const handleDelete = useCallback(async (uploadId: string) => {
        if (!idToken) return
        try {
            await fileManagementAPI.deleteUpload(uploadId, idToken)
            setEntries(prev => prev.map(e =>
                e.uploadId === uploadId
                    ? { ...e, file: null, error: "Deleted" }
                    : e
            ))
        } catch (err) {
            console.error("Delete failed:", err)
        }
    }, [idToken])

    return {
        entries,
        loading,
        detailFile,
        detailOpen,
        setDetailOpen,
        downloadFile,
        downloadOpen,
        setDownloadOpen,
        handleViewDetail,
        handleDownloadPrompt,
        handleDownload,
        handleDelete,
        downloading,
    }
}

"use client"

import React, { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, ArrowLeft, ArrowRight, Check, X, RefreshCw } from "lucide-react"
import { useProcessingWizard, STEP_ORDER } from "./WizardContext"
import { fileManagementAPI } from "@/lib/api/file-management-api"

export function ProfilingStep() {
    const {
        uploadId,
        authToken,
        selectedColumns,
        setSelectedColumns,
        columnProfiles,
        setColumnProfiles,
        requiredColumns,
        setRequiredColumns,
        allColumns,
        prevStep,
        nextStep,
    } = useProcessingWizard()

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeColumn, setActiveColumn] = useState<string | null>(null)

    // Fetch profiling on mount
    useEffect(() => {
        if (selectedColumns.length > 0 && Object.keys(columnProfiles).length === 0 && authToken) {
            fetchProfiling()
        }
    }, [selectedColumns, authToken])

    const fetchProfiling = async () => {
        if (!authToken) return

        setIsLoading(true)
        setError(null)
        try {
            const response = await fileManagementAPI.getColumnProfilingPreview(
                uploadId,
                authToken,
                selectedColumns,
                500
            )
            if (response.profiles && Object.keys(response.profiles).length > 0) {
                setColumnProfiles(response.profiles)
            } else {
                setError("No profiling data returned. Refresh or adjust column selection.")
            }
        } catch (err: any) {
            setError(err.message || "Failed to fetch profiling data")
        } finally {
            setIsLoading(false)
        }
    }

    // Profile a single column on demand
    const profileColumn = async (column: string) => {
        if (columnProfiles[column] || !authToken) return // Already profiled or no auth

        try {
            const response = await fileManagementAPI.getColumnProfilingPreview(
                uploadId,
                authToken,
                [column],
                500
            )
            if (response.profiles?.[column]) {
                setColumnProfiles({
                    ...columnProfiles,
                    [column]: response.profiles[column],
                })
            } else {
                setError(`No profiling data returned for ${column}`)
            }
            // Add to selected if not already
            if (!selectedColumns.includes(column)) {
                setSelectedColumns([...selectedColumns, column])
            }
        } catch (err: any) {
            setError(err.message || `Failed to profile ${column}`)
        }
    }

    const toggleColumnSelection = (column: string) => {
        if (selectedColumns.includes(column)) {
            setSelectedColumns(selectedColumns.filter((c) => c !== column))
        } else {
            setSelectedColumns([...selectedColumns, column])
            // Trigger profiling if not already profiled
            if (!columnProfiles[column]) {
                profileColumn(column)
            }
        }
    }

    const canProceed = selectedColumns.length > 0 && !isLoading

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Column Profiling</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Review data types and quality metrics for selected columns
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchProfiling} disabled={isLoading || !authToken}>
                    <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {/* Main content area with two separate scrollable boxes */}
            <div className="flex gap-4 h-[45vh]">
                {/* Left sidebar - Column list (separate box with internal scrolling) */}
                <div className="w-64 border border-muted rounded-lg flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-muted/40 bg-muted/20">
                        <h3 className="font-medium text-sm">Columns</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            Click to toggle selection
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-2 space-y-1">
                            {allColumns.map((col) => {
                                const isSelected = selectedColumns.includes(col)
                                const hasProfile = !!columnProfiles[col]
                                const isActive = activeColumn === col

                                return (
                                    <div
                                        key={col}
                                        onClick={() => {
                                            toggleColumnSelection(col)
                                            setActiveColumn(col)
                                        }}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm",
                                            isActive && "bg-primary/10 border-l-2 border-primary",
                                            !isActive && isSelected && "bg-muted/50",
                                            !isActive && !isSelected && "hover:bg-muted/30 opacity-60"
                                        )}
                                    >
                                        {isSelected ? (
                                            <Check className="w-4 h-4 text-green-500 shrink-0" />
                                        ) : (
                                            <X className="w-4 h-4 text-muted-foreground shrink-0" />
                                        )}
                                        <span className="truncate">{col}</span>
                                        {!hasProfile && isSelected && (
                                            <Loader2 className="w-3 h-3 animate-spin ml-auto" />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <div className="p-3 border-t border-muted/40 text-xs text-muted-foreground bg-muted/20">
                        {selectedColumns.length} of {allColumns.length} selected
                    </div>
                </div>

                {/* Main content - Profiling results (separate box with internal scrolling) */}
                <div className="flex-1 border border-muted rounded-lg overflow-hidden">
                    <div className="h-full overflow-y-auto p-4">
                        {isLoading && Object.keys(columnProfiles).length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                                    <p className="text-sm text-muted-foreground mt-2">Profiling columns...</p>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="text-center text-destructive p-8">
                                <p>{error}</p>
                                <Button variant="outline" size="sm" className="mt-4" onClick={fetchProfiling}>
                                    Retry
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {selectedColumns.length === 0 ? (
                                    <div className="col-span-2 text-center py-12">
                                        <p className="text-muted-foreground">No columns selected for profiling</p>
                                        <p className="text-sm text-muted-foreground mt-2">Go back to select columns</p>
                                    </div>
                                ) : selectedColumns.map((col) => {
                                    const profile = columnProfiles[col]
                                    if (!profile) return null

                                    return (
                                        <div
                                            key={col}
                                            className={cn(
                                                "border border-muted rounded-lg p-4 space-y-3",
                                                activeColumn === col && "border-primary"
                                            )}
                                            onClick={() => setActiveColumn(col)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium">{col}</h4>
                                                <div className="flex items-center gap-1">
                                                    {profile.key_type && profile.key_type !== "none" && (
                                                        <Badge variant="secondary" className="uppercase text-[10px]">{profile.key_type}</Badge>
                                                    )}
                                                    {profile.nullable_suggested === false && (
                                                        <Badge variant="destructive" className="text-[10px]">NOT NULL</Badge>
                                                    )}
                                                    <Badge variant="outline">
                                                        {profile.type_guess}
                                                        {profile.type_confidence !== undefined && (
                                                            <span className="ml-1 opacity-70">
                                                                {Math.round(profile.type_confidence * 100)}%
                                                            </span>
                                                        )}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Null Rate:</span>
                                                    <span className={cn(
                                                        profile.null_rate > 0.1 ? "text-yellow-500" : "text-green-500"
                                                    )}>
                                                        {(profile.null_rate * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                                {profile.unique_ratio !== undefined && (
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Unique:</span>
                                                        <span>{(profile.unique_ratio * 100).toFixed(1)}%</span>
                                                    </div>
                                                )}
                                                {profile.numeric_parse_rate !== undefined && (
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Numeric parse:</span>
                                                        <span>{(profile.numeric_parse_rate * 100).toFixed(0)}%</span>
                                                    </div>
                                                )}
                                                {profile.date_parse_rate !== undefined && (
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Date parse:</span>
                                                        <span>{(profile.date_parse_rate * 100).toFixed(0)}%</span>
                                                    </div>
                                                )}
                                                {profile.len_mean !== undefined && (
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Len (min/max/avg):</span>
                                                        <span>{profile.len_min ?? '-'} / {profile.len_max ?? '-'} / {profile.len_mean?.toFixed(1)}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {profile.rules && profile.rules.length > 0 && (
                                                <div className="text-xs space-y-1">
                                                    <div className="text-muted-foreground">Auto Rules:</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {profile.rules
                                                            .filter(r => r.decision === 'auto')
                                                            .map((r) => (
                                                                <Badge key={r.rule_id} variant="outline" className="text-[11px]">
                                                                    {r.rule_id}{r.source ? ` (${r.source})` : ""}
                                                                </Badge>
                                                            ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Required columns info */}
            {requiredColumns.length > 0 && (
                <div className="px-4 py-3 bg-muted/30 border border-muted rounded-lg">
                    <div className="text-sm">
                        <span className="text-muted-foreground">Required Columns: </span>
                        <span className="font-medium">{requiredColumns.join(", ")}</span>
                    </div>
                </div>
            )}

            {/* Footer with navigation buttons - fixed at bottom */}
            <div className="flex items-center justify-between pt-4 border-t border-muted/40">
                <Button variant="outline" onClick={prevStep}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <Button onClick={nextStep} disabled={!canProceed}>
                    Next: Settings
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </div>
    )
}

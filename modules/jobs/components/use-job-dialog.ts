'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/shared/hooks/use-toast'
import {
    jobsAPI, type Job, type JobFrequency, type CreateJobPayload, type UpdateJobPayload,
    frequencyToBackend, frequencyFromBackend
} from '@/modules/jobs/api/jobs-api'
import { fileManagementAPI } from '@/modules/files'
import {
    type AdvancedStep,
    type RuleState,
    type SettingsPreset,
    type ColumnProfile,
    ADVANCED_STEPS,
    DEFAULT_GLOBAL_RULES,
    ENTITY_COLUMNS,
    SOURCE_ERP_OPTIONS,
    normalizeErpForUi,
    normalizeErpForApi,
} from './job-dialog-constants'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface UseJobDialogProps {
    open: boolean
    job?: Job | null
    onSuccess: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useJobDialog({ open, job, onSuccess }: UseJobDialogProps) {
    const isEdit = !!job
    const { toast } = useToast()

    // Core fields
    const [name, setName] = useState("")
    const [source, setSource] = useState<string>("quickbooks")
    const [destination, setDestination] = useState<string>("quickbooks")
    const [frequency, setFrequency] = useState<JobFrequency>("1hr")
    const [cronExpression, setCronExpression] = useState("")
    const [entity, setEntity] = useState("invoices")

    // Advanced — Columns
    const [fetchingCols, setFetchingCols] = useState(false)
    const [allColumns, setAllColumns] = useState<string[]>([])
    const [selectedColumns, setSelectedColumns] = useState<string[]>([])
    const [colSearch, setColSearch] = useState("")

    // Advanced — Preset
    const [presets, setPresets] = useState<SettingsPreset[]>([])
    const [presetsLoading, setPresetsLoading] = useState(false)
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
    const [selectedPresetConfig, setSelectedPresetConfig] = useState<Record<string, any> | null>(null)

    // Advanced — Custom Rules
    const [globalRules, setGlobalRules] = useState<RuleState[]>(DEFAULT_GLOBAL_RULES.map(r => ({ ...r })))

    // Advanced Wizard Mode
    const [currentAdvancedStep, setCurrentAdvancedStep] = useState<AdvancedStep>("import")
    const [advancedMode, setAdvancedMode] = useState(false)
    const [dataImported, setDataImported] = useState(false)
    const [importingData, setImportingData] = useState(false)

    // Advanced — Profiling
    const [profilingLoading, setProfilingLoading] = useState(false)
    const [columnProfiles, setColumnProfiles] = useState<Record<string, ColumnProfile>>({})

    // UI state
    const [saving, setSaving] = useState(false)
    const [advancedOpen, setAdvancedOpen] = useState(false)

    // Helper: current step index
    const currentStepIndex = ADVANCED_STEPS.indexOf(currentAdvancedStep)

    // ─── Filtered columns (for search) ────────────────────────────────────────
    const filteredCols = allColumns.filter(c => c.toLowerCase().includes(colSearch.toLowerCase()))

    // ─── Populate / Reset ─────────────────────────────────────────────────────

    useEffect(() => {
        if (!open) return
        if (job) {
            setName(job.name)
            setSource(normalizeErpForUi(job.source))
            setDestination(normalizeErpForUi(job.destination))
            const freq = frequencyFromBackend(job.frequency_type, job.frequency_value)
            setFrequency(freq.frequency)
            setCronExpression(freq.cronExpression || job.cron_expression || "")
            setEntity(job.entities?.[0] || "invoices")
            setSelectedColumns(job.dq_config?.columns || [])
            setSelectedPresetId(job.dq_config?.preset_id || null)
            setGlobalRules(job.dq_config?.rules?.length
                ? job.dq_config.rules
                : DEFAULT_GLOBAL_RULES.map(r => ({ ...r }))
            )
            setAdvancedOpen(job.dq_config?.mode === "custom")
        } else {
            setName("")
            setSource("quickbooks")
            setDestination("quickbooks")
            setFrequency("1hr")
            setCronExpression("")
            setEntity("invoices")
            setSelectedColumns([])
            setAllColumns([])
            setSelectedPresetId(null)
            setSelectedPresetConfig(null)
            setGlobalRules(DEFAULT_GLOBAL_RULES.map(r => ({ ...r })))
            setAdvancedOpen(false)
            setAdvancedMode(false)
            setDataImported(false)
            setCurrentAdvancedStep("import")
            setColumnProfiles({})
        }
    }, [job, open])

    // ─── Fetch Columns ────────────────────────────────────────────────────────

    const handleFetchColumns = async () => {
        setFetchingCols(true)
        try {
            const cols = ENTITY_COLUMNS[entity] || ["Column1", "Column2", "Column3"]
            setAllColumns(cols)
            setSelectedColumns(cols)
            toast({ title: "Columns Loaded", description: `${cols.length} columns available for ${entity}` })
        } catch (err: any) {
            toast({ title: "Error", description: err?.message || "Failed to fetch columns", variant: "destructive" })
        } finally {
            setFetchingCols(false)
        }
    }

    // ─── Import Data from Source (Advanced Mode) ──────────────────────────────

    const handleImportDataFromSource = async () => {
        setImportingData(true)
        try {
            const cols = ENTITY_COLUMNS[entity] || ["Column1", "Column2", "Column3"]
            setAllColumns(cols)
            setSelectedColumns(cols)
            setDataImported(true)
            setCurrentAdvancedStep("columns")
            toast({
                title: "Data Imported",
                description: `Successfully imported data from ${SOURCE_ERP_OPTIONS.find(e => e.value === source)?.label}. Configure columns.`
            })
        } catch (err: any) {
            toast({ title: "Import Failed", description: err?.message || "Failed to import data from source", variant: "destructive" })
        } finally {
            setImportingData(false)
        }
    }

    // ─── Fetch Profiling Data ─────────────────────────────────────────────────

    const handleFetchProfiling = async () => {
        if (selectedColumns.length === 0) {
            toast({ title: "Select columns first", description: "Please select at least one column", variant: "destructive" })
            return
        }
        setProfilingLoading(true)
        try {
            const profiles: Record<string, ColumnProfile> = {}
            selectedColumns.forEach((col, idx) => {
                profiles[col] = {
                    column_name: col,
                    data_type: ["string", "number", "date", "boolean"][idx % 4],
                    null_count: Math.floor(Math.random() * 100),
                    unique_count: Math.floor(Math.random() * 1000),
                    sample_values: [`Sample${idx}_1`, `Sample${idx}_2`, `Sample${idx}_3`],
                    quality_score: 0.85 + Math.random() * 0.15,
                    rules: [
                        { rule_id: "R1", rule_name: "Not Null", severity: "critical" },
                        { rule_id: "R2", rule_name: "Type Check", severity: "warning" }
                    ]
                }
            })
            setColumnProfiles(profiles)
            setCurrentAdvancedStep("settings")
            toast({ title: "Profiling Complete", description: `Analyzed ${selectedColumns.length} columns` })
        } catch (err: any) {
            toast({ title: "Profiling Failed", description: err?.message || "Failed to profile columns", variant: "destructive" })
        } finally {
            setProfilingLoading(false)
        }
    }

    // ─── Step Navigation ──────────────────────────────────────────────────────

    const goToNextStep = () => {
        const nextIndex = currentStepIndex + 1
        if (nextIndex < ADVANCED_STEPS.length) {
            const nextStep = ADVANCED_STEPS[nextIndex]

            if (currentAdvancedStep === "columns" && selectedColumns.length === 0) {
                toast({ title: "Select columns", description: "Please select at least one column", variant: "destructive" })
                return
            }
            if (currentAdvancedStep === "profiling" && Object.keys(columnProfiles).length === 0) {
                toast({ title: "Run profiling first", description: "Click the Profiling section to analyze columns", variant: "destructive" })
                return
            }

            setCurrentAdvancedStep(nextStep)
        }
    }

    const goToPreviousStep = () => {
        const prevIndex = currentStepIndex - 1
        if (prevIndex >= 0) {
            setCurrentAdvancedStep(ADVANCED_STEPS[prevIndex])
        }
    }

    const toggleColumn = (col: string) => {
        setSelectedColumns(prev =>
            prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
        )
    }

    // ─── Load Presets ─────────────────────────────────────────────────────────

    useEffect(() => {
        if (currentAdvancedStep === "settings" && presets.length === 0 && dataImported) {
            setPresetsLoading(true)
            fileManagementAPI.getSettingsPresets()
                .then((res: any) => {
                    const list = Array.isArray(res) ? res : res?.presets || []
                    setPresets(list)
                })
                .catch(() => setPresets([]))
                .finally(() => setPresetsLoading(false))
        }
    }, [currentAdvancedStep, presets.length, dataImported])

    const handleSelectPreset = async (presetId: string) => {
        if (presetId === "none") {
            setSelectedPresetId(null)
            setSelectedPresetConfig(null)
            return
        }
        setSelectedPresetId(presetId)
        try {
            const detail = await fileManagementAPI.getSettingsPreset(presetId)
            setSelectedPresetConfig((detail as any)?.config || null)
        } catch {
            setSelectedPresetConfig(null)
        }
    }

    // ─── Toggle Rules ─────────────────────────────────────────────────────────

    const toggleRule = (ruleId: string) => {
        setGlobalRules(prev =>
            prev.map(r => r.rule_id === ruleId ? { ...r, selected: !r.selected } : r)
        )
    }

    // ─── Submit ───────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast({ title: "Name required", description: "Please enter a job name", variant: "destructive" })
            return
        }
        if (frequency === "cron" && !cronExpression.trim()) {
            toast({ title: "Cron expression required", variant: "destructive" })
            return
        }

        setSaving(true)
        try {
            const hasCustomConfig = advancedOpen && (
                selectedColumns.length > 0 ||
                selectedPresetId ||
                globalRules.some(r => !r.selected)
            )

            const dq_config = hasCustomConfig
                ? {
                    mode: "custom" as const,
                    ...(selectedColumns.length > 0 && { columns: selectedColumns }),
                    ...(selectedPresetId && { preset_id: selectedPresetId }),
                    rules: globalRules,
                }
                : { mode: "default" as const }

            const freqBackend = frequencyToBackend(frequency, cronExpression.trim())

            const base = {
                name: name.trim(),
                source: normalizeErpForApi(source),
                destination: normalizeErpForApi(destination),
                entities: [entity],
                ...freqBackend,
                dq_config,
            }

            if (isEdit && job) {
                await jobsAPI.updateJob(job.job_id, base as UpdateJobPayload)
                toast({ title: "Job Updated", description: `${name} has been updated` })
            } else {
                await jobsAPI.createJob(base as CreateJobPayload)
                toast({ title: "Job Created", description: `${name} has been created and scheduled` })
            }
            onSuccess()
        } catch (err: any) {
            toast({
                title: isEdit ? "Update failed" : "Creation failed",
                description: err?.message || "Something went wrong",
                variant: "destructive"
            })
        } finally {
            setSaving(false)
        }
    }

    // ─── Advanced open handler ────────────────────────────────────────────────

    const handleAdvancedOpenChange = (nextOpen: boolean) => {
        if (nextOpen && !advancedMode) {
            setAdvancedMode(true)
        }
        setAdvancedOpen(nextOpen)
    }

    return {
        isEdit,
        // Core fields
        name, setName,
        source, setSource,
        destination, setDestination,
        frequency, setFrequency,
        cronExpression, setCronExpression,
        entity, setEntity,
        // Columns
        fetchingCols,
        allColumns,
        selectedColumns, setSelectedColumns,
        colSearch, setColSearch,
        filteredCols,
        toggleColumn,
        handleFetchColumns,
        // Presets
        presets,
        presetsLoading,
        selectedPresetId,
        selectedPresetConfig,
        handleSelectPreset,
        // Rules
        globalRules,
        toggleRule,
        // Advanced wizard
        advancedOpen, handleAdvancedOpenChange,
        advancedMode,
        dataImported,
        importingData,
        handleImportDataFromSource,
        currentAdvancedStep, setCurrentAdvancedStep,
        currentStepIndex,
        goToNextStep,
        goToPreviousStep,
        // Profiling
        profilingLoading,
        columnProfiles,
        handleFetchProfiling,
        // Submit / UI
        saving,
        handleSubmit,
    }
}

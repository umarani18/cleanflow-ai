"use client"

import { useState, useEffect } from "react"
import { Loader2, ChevronDown, ChevronRight, Settings, Star, Sparkles, Trash2, Plus, Columns, FileCode2, Code } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
    Collapsible, CollapsibleContent, CollapsibleTrigger
} from "@/components/ui/collapsible"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
    jobsAPI, type Job, type JobFrequency, type CreateJobPayload, type UpdateJobPayload,
    frequencyToBackend, frequencyFromBackend
} from "@/lib/api/jobs-api"
import { fileManagementAPI } from "@/lib/api/file-management-api"

// ─── Constants ────────────────────────────────────────────────────────────────

const ENTITY_OPTIONS = [
    { label: "Invoices", value: "invoices" },
    { label: "Customers", value: "customers" },
    { label: "Vendors", value: "vendors" },
    { label: "Items", value: "items" },
    { label: "Payments", value: "payments" },
    { label: "Bills", value: "bills" },
    { label: "Journal Entries", value: "journal_entries" },
    { label: "Estimates", value: "estimates" },
    { label: "Credit Memos", value: "credit_memos" },
    { label: "Purchase Orders", value: "purchase_orders" },
]

const ERP_OPTIONS = [
    { label: "QUICKBOOKS ONLINE", value: "quickbooks" },
    { label: "ZOHO BOOKS", value: "zoho-books" },
    { label: "ORACLE FUSION", value: "oracle" },
    { label: "SAP", value: "sap" },
    { label: "MICROSOFT DYNAMICS", value: "dynamics" },
    { label: "NETSUITE", value: "netsuite" },
    { label: "WORKDAY", value: "workday" },
    { label: "INFOR M3", value: "infor-m3" },
    { label: "INFOR LN", value: "infor-ln" },
    { label: "EPICOR KINETIC", value: "epicor" },
    { label: "QAD", value: "qad" },
    { label: "IFS CLOUD", value: "ifs" },
    { label: "SAGE INTACCT", value: "sage" },
    { label: "CUSTOM SOURCE", value: "custom-source" },
]

const SOURCE_ERP_OPTIONS = ERP_OPTIONS

const normalizeErpForUi = (value?: string): string => {
    if (!value) return "quickbooks"
    if (value === "zoho_books" || value === "zohobooks" || value === "zoho-books") {
        return "zoho-books"
    }
    return value
}

const normalizeErpForApi = (value: string): string => {
    if (value === "zoho-books" || value === "zoho_books") {
        return "zohobooks"
    }
    return value
}

// Default global rules (same as in processing wizard's RulesStep)
const DEFAULT_GLOBAL_RULES = [
    { rule_id: "R4", rule_name: "Whitespace Cleanup", selected: true, description: "Trim leading/trailing whitespace" },
    { rule_id: "R5", rule_name: "Case Normalization", selected: true, description: "Standardize text casing" },
    { rule_id: "R6", rule_name: "Special Characters", selected: false, description: "Remove special characters" },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface SettingsPreset {
    preset_id: string
    preset_name: string
    is_default?: boolean
    config?: Record<string, any>
}

interface RuleState {
    rule_id: string
    rule_name: string
    selected: boolean
    description?: string
}

interface ColumnProfile {
    column_name: string
    data_type?: string
    null_count?: number
    unique_count?: number
    sample_values?: string[]
    quality_score?: number
    rules?: Array<{ rule_id: string; rule_name: string; severity?: string }>
}

interface JobDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    job?: Job | null
    onSuccess: () => void
    onCancel: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JobDialog({ open, onOpenChange, job, onSuccess, onCancel }: JobDialogProps) {
    const isEdit = !!job

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

    // Advanced Wizard Mode - Sequential Steps
    type AdvancedStep = "import" | "columns" | "profiling" | "settings" | "rules" | "process"
    const ADVANCED_STEPS: AdvancedStep[] = ["import", "columns", "profiling", "settings", "rules", "process"]
    
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
    const { toast } = useToast()

    // Helper: Get current step index
    const currentStepIndex = ADVANCED_STEPS.indexOf(currentAdvancedStep)

    // ─── Populate / Reset ─────────────────────────────────────────────────────

    useEffect(() => {
        if (!open) return
        if (job) {
            setName(job.name)
            setSource(normalizeErpForUi(job.source))
            setDestination(normalizeErpForUi(job.destination))
            // Translate backend frequency format to frontend
            const freq = frequencyFromBackend(job.frequency_type, job.frequency_value)
            setFrequency(freq.frequency)
            setCronExpression(freq.cronExpression || job.cron_expression || "")
            setEntity(job.entities?.[0] || "invoices")
            // DQ config
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

    // ─── Fetch Columns (from processing wizard pattern) ───────────────────────

    const handleFetchColumns = async () => {
        setFetchingCols(true)
        try {
            // In the job context, columns come from the ERP entity schema.
            // For now, provide common column names per entity type.
            const ENTITY_COLUMNS: Record<string, string[]> = {
                invoices: ["InvoiceNumber", "CustomerName", "Date", "DueDate", "Amount", "Currency", "Status", "LineItems", "TaxAmount", "Balance"],
                customers: ["DisplayName", "CompanyName", "Email", "Phone", "Address", "City", "State", "Country", "PostalCode", "Status"],
                vendors: ["DisplayName", "CompanyName", "Email", "Phone", "Address", "City", "State", "Country", "AccountNumber", "Status"],
                items: ["Name", "Description", "Type", "UnitPrice", "PurchaseCost", "QtyOnHand", "SKU", "Category", "Taxable", "Status"],
                payments: ["PaymentNumber", "CustomerName", "Date", "Amount", "Currency", "Method", "ReferenceNumber", "Status", "AppliedTo", "UnappliedAmount"],
                bills: ["BillNumber", "VendorName", "Date", "DueDate", "Amount", "Currency", "Status", "LineItems", "TaxAmount", "Balance"],
                journal_entries: ["EntryNumber", "Date", "Account", "Debit", "Credit", "Description", "Currency", "Status"],
                estimates: ["EstimateNumber", "CustomerName", "Date", "ExpirationDate", "Amount", "Currency", "Status", "LineItems"],
                credit_memos: ["CreditMemoNumber", "CustomerName", "Date", "Amount", "Currency", "Status", "LineItems", "Balance"],
                purchase_orders: ["PONumber", "VendorName", "Date", "ShipDate", "Amount", "Currency", "Status", "LineItems"],
            }
            const cols = ENTITY_COLUMNS[entity] || ["Column1", "Column2", "Column3"]
            setAllColumns(cols)
            setSelectedColumns(cols) // select all by default
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
            const ENTITY_COLUMNS: Record<string, string[]> = {
                invoices: ["InvoiceNumber", "CustomerName", "Date", "DueDate", "Amount", "Currency", "Status", "LineItems", "TaxAmount", "Balance"],
                customers: ["DisplayName", "CompanyName", "Email", "Phone", "Address", "City", "State", "Country", "PostalCode", "Status"],
                vendors: ["DisplayName", "CompanyName", "Email", "Phone", "Address", "City", "State", "Country", "AccountNumber", "Status"],
                items: ["Name", "Description", "Type", "UnitPrice", "PurchaseCost", "QtyOnHand", "SKU", "Category", "Taxable", "Status"],
                payments: ["PaymentNumber", "CustomerName", "Date", "Amount", "Currency", "Method", "ReferenceNumber", "Status", "AppliedTo", "UnappliedAmount"],
                bills: ["BillNumber", "VendorName", "Date", "DueDate", "Amount", "Currency", "Status", "LineItems", "TaxAmount", "Balance"],
                journal_entries: ["EntryNumber", "Date", "Account", "Debit", "Credit", "Description", "Currency", "Status"],
                estimates: ["EstimateNumber", "CustomerName", "Date", "ExpirationDate", "Amount", "Currency", "Status", "LineItems"],
                credit_memos: ["CreditMemoNumber", "CustomerName", "Date", "Amount", "Currency", "Status", "LineItems", "Balance"],
                purchase_orders: ["PONumber", "VendorName", "Date", "ShipDate", "Amount", "Currency", "Status", "LineItems"],
            }
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
            // In real implementation, call fileManagementAPI.getColumnProfilingPreview
            // For now, simulate profiling data based on selected columns
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
            
            // Validation before moving to next step
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

    // ─── Load Presets (from SettingsStep pattern) ─────────────────────────────

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
                globalRules.some(r => !r.selected) // user toggled off default rules
            )

            const dq_config = hasCustomConfig
                ? {
                    mode: "custom" as const,
                    ...(selectedColumns.length > 0 && { columns: selectedColumns }),
                    ...(selectedPresetId && { preset_id: selectedPresetId }),
                    rules: globalRules,
                }
                : { mode: "default" as const }

            // Translate frontend frequency to backend format
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

    // ─── Render ─────────────────────────────────────────────────────────────

    const filteredCols = allColumns.filter(c => c.toLowerCase().includes(colSearch.toLowerCase()))

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg">{isEdit ? "Edit Job" : "Create Job"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "Update job configuration" : "Set up a new automated ERP sync job"}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-1">
                    {/* Job Name */}
                    <div className="space-y-2">
                        <Label htmlFor="job-name" className="text-sm font-medium">Job Name</Label>
                        <Input
                            id="job-name"
                            placeholder="e.g. QB Invoice Sync"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-10"
                        />
                    </div>

                    {/* Source & Destination */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Source ERP</Label>
                            <Select value={source} onValueChange={setSource}>
                                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {SOURCE_ERP_OPTIONS.map((erp) => (
                                        <SelectItem key={erp.value} value={erp.value}>{erp.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Destination ERP</Label>
                            <Select value={destination} onValueChange={setDestination}>
                                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {ERP_OPTIONS.map((erp) => (
                                        <SelectItem key={erp.value} value={erp.value}>{erp.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Entity & Frequency */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Entity</Label>
                            <Select value={entity} onValueChange={setEntity}>
                                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {ENTITY_OPTIONS.map(e => (
                                        <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Frequency</Label>
                            <Select value={frequency} onValueChange={(v) => setFrequency(v as JobFrequency)}>
                                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="15min">Every 15 min</SelectItem>
                                    <SelectItem value="1hr">Every hour</SelectItem>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="cron">Custom (Cron)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {frequency === "cron" && (
                        <Input
                            placeholder="e.g. 0 */2 * * *"
                            value={cronExpression}
                            onChange={(e) => setCronExpression(e.target.value)}
                            className="h-9 font-mono text-sm"
                        />
                    )}


                    {/* ─── Advanced (Optional)─ ─────────────────────────────── */}
                    <Collapsible open={advancedOpen} onOpenChange={(open) => {
                        if (open && !advancedMode) {
                            // First time opening advanced mode - enter advanced wizard workflow
                            setAdvancedMode(true)
                        }
                        setAdvancedOpen(open)
                    }}>
                        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 border-t border-border/50">
                            {advancedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span className="text-sm font-medium text-muted-foreground">Advanced (Optional)</span>
                            {advancedOpen && (selectedColumns.length > 0 || selectedPresetId) && (
                                <Badge variant="outline" className="ml-auto text-[10px]">Configured</Badge>
                            )}
                        </CollapsibleTrigger>

                        <CollapsibleContent className="pt-3 space-y-4">
                            {/* Data Import Section */}
                            {!dataImported && advancedMode ? (
                                <div className="flex flex-col gap-3 p-4 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                                    <h3 className="text-sm font-semibold">Import Data from {SOURCE_ERP_OPTIONS.find(e => e.value === source)?.label}</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Click below to import data from your {SOURCE_ERP_OPTIONS.find(e => e.value === source)?.label} account. After import, configure the five wizards.
                                    </p>
                                    <Button 
                                        onClick={handleImportDataFromSource} 
                                        disabled={importingData}
                                        className="w-full"
                                    >
                                        {importingData ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
                                        {importingData ? "Importing..." : "Import Data from Source"}
                                    </Button>
                                </div>
                            ) : null}

                            {/* Sequential Dropdown-Based Wizard (shown after data import) */}
                            {dataImported ? (
                                <div className="space-y-3">
                                    {/* ── 1. Select Columns ─────────────────────────────── */}
                                    <Collapsible open={currentAdvancedStep === "columns"} onOpenChange={(open) => {
                                        if (open) setCurrentAdvancedStep("columns")
                                    }}>
                                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                                            {currentAdvancedStep === "columns" ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            <Badge className="bg-primary/20 text-primary w-5 h-5 flex items-center justify-center text-xs p-0 rounded-full">1</Badge>
                                            <span className="text-sm font-medium">Select Columns</span>
                                            {selectedColumns.length > 0 && (
                                                <Badge variant="outline" className="ml-auto text-[10px]">{selectedColumns.length} selected</Badge>
                                            )}
                                            {currentStepIndex > 0 && (
                                                <Badge variant="outline" className="ml-auto text-[10px] bg-green-500/20 text-green-700">✓</Badge>
                                            )}
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="mt-2 ml-2 space-y-3">
                                            {allColumns.length === 0 ? (
                                                <p className="text-xs text-muted-foreground">No columns available</p>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            placeholder="Search columns..."
                                                            value={colSearch}
                                                            onChange={(e) => setColSearch(e.target.value)}
                                                            className="h-8 text-sm flex-1"
                                                        />
                                                        <Button size="sm" variant="ghost" className="text-xs h-8"
                                                            onClick={() => setSelectedColumns([...allColumns])}>All</Button>
                                                        <Button size="sm" variant="ghost" className="text-xs h-8"
                                                            onClick={() => setSelectedColumns([])}>None</Button>
                                                    </div>
                                                    <div className="border border-border rounded-lg max-h-[30vh] overflow-y-auto">
                                                        <div className="grid grid-cols-2 gap-1 p-2">
                                                            {filteredCols.map(col => {
                                                                const checked = selectedColumns.includes(col)
                                                                return (
                                                                    <div
                                                                        key={col}
                                                                        onClick={() => toggleColumn(col)}
                                                                        className={cn(
                                                                            "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors text-sm",
                                                                            checked
                                                                                ? "bg-primary/10 border border-primary/30"
                                                                                : "hover:bg-muted/50 border border-transparent"
                                                                        )}
                                                                    >
                                                                        <Checkbox checked={checked} />
                                                                        <span className="truncate">{col}</span>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {selectedColumns.length} of {allColumns.length} columns selected
                                                    </p>
                                                </>
                                            )}
                                            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                                                <Button
                                                    size="sm"
                                                    onClick={goToNextStep}
                                                    disabled={selectedColumns.length === 0}
                                                >
                                                    Next: Profiling →
                                                </Button>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>

                                    {/* ── 2. Profiling ───────────────────────────────── */}
                                    <Collapsible open={currentAdvancedStep === "profiling"} onOpenChange={(open) => {
                                        if (open) setCurrentAdvancedStep("profiling")
                                    }}>
                                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                                            {currentAdvancedStep === "profiling" ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            <Badge className="bg-primary/20 text-primary w-5 h-5 flex items-center justify-center text-xs p-0 rounded-full">2</Badge>
                                            <span className="text-sm font-medium">Profiling</span>
                                            {Object.keys(columnProfiles).length > 0 && (
                                                <Badge variant="outline" className="ml-auto text-[10px]">Analyzed</Badge>
                                            )}
                                            {currentStepIndex > 1 && (
                                                <Badge variant="outline" className="ml-auto text-[10px] bg-green-500/20 text-green-700">✓</Badge>
                                            )}
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="mt-2 ml-2 space-y-3">
                                            {Object.keys(columnProfiles).length === 0 ? (
                                                <div className="flex flex-col gap-3">
                                                    <p className="text-xs text-muted-foreground">
                                                        Analyze {selectedColumns.length} selected columns to detect data types and quality metrics.
                                                    </p>
                                                    <Button 
                                                        onClick={handleFetchProfiling} 
                                                        disabled={profilingLoading}
                                                        className="w-full"
                                                    >
                                                        {profilingLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
                                                        {profilingLoading ? "Analyzing..." : "Analyze Columns"}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="text-xs space-y-2 max-h-[30vh] overflow-y-auto">
                                                    {Object.entries(columnProfiles).slice(0, 3).map(([col, profile]) => (
                                                        <div key={col} className="p-2 rounded border border-border/50 bg-muted/20">
                                                            <p className="font-medium text-xs">{col}</p>
                                                            <p className="text-muted-foreground">Type: {profile.data_type || 'Unknown'}</p>
                                                            <p className="text-muted-foreground">Quality: {profile.quality_score ? `${(profile.quality_score * 100).toFixed(1)}%` : 'N/A'}</p>
                                                        </div>
                                                    ))}
                                                    {Object.keys(columnProfiles).length > 3 && (
                                                        <p className="text-muted-foreground text-center text-xs py-2">... +{Object.keys(columnProfiles).length - 3} more</p>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex justify-between gap-2 pt-2 border-t border-border/50">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={goToPreviousStep}
                                                >
                                                    ← Back
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={goToNextStep}
                                                    disabled={Object.keys(columnProfiles).length === 0}
                                                >
                                                    Next: Settings →
                                                </Button>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>

                                    {/* ── 3. Settings Preset ───────────────────────────── */}
                                    <Collapsible open={currentAdvancedStep === "settings"} onOpenChange={(open) => {
                                        if (open) setCurrentAdvancedStep("settings")
                                    }}>
                                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                                            {currentAdvancedStep === "settings" ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            <Badge className="bg-primary/20 text-primary w-5 h-5 flex items-center justify-center text-xs p-0 rounded-full">3</Badge>
                                            <span className="text-sm font-medium">Settings Preset</span>
                                            {selectedPresetId && (
                                                <Badge variant="outline" className="ml-auto text-[10px]">
                                                    {presets.find(p => p.preset_id === selectedPresetId)?.preset_name || "Selected"}
                                                </Badge>
                                            )}
                                            {currentStepIndex > 2 && (
                                                <Badge variant="outline" className="ml-auto text-[10px] bg-green-500/20 text-green-700">✓</Badge>
                                            )}
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="mt-2 ml-2 space-y-3">
                                            {presetsLoading ? (
                                                <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                                                    <Loader2 className="h-4 w-4 animate-spin" />Loading presets...
                                                </div>
                                            ) : (
                                                <>
                                                    <Select
                                                        value={selectedPresetId || "none"}
                                                        onValueChange={handleSelectPreset}
                                                    >
                                                        <SelectTrigger className="h-10">
                                                            <SelectValue placeholder="Select a preset..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">
                                                                <span className="text-muted-foreground">No preset (default rules)</span>
                                                            </SelectItem>
                                                            {presets.map(p => (
                                                                <SelectItem key={p.preset_id} value={p.preset_id}>
                                                                    <div className="flex items-center gap-2">
                                                                        {p.is_default && <Star className="w-3 h-3 text-yellow-500" />}
                                                                        {p.preset_name}
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {selectedPresetConfig && (
                                                        <div className="text-xs text-muted-foreground border border-border rounded-lg p-3 space-y-1">
                                                            {selectedPresetConfig.currency_values && (
                                                                <p><span className="font-medium">Currencies:</span> {selectedPresetConfig.currency_values.join(", ")}</p>
                                                            )}
                                                            {selectedPresetConfig.uom_values && (
                                                                <p><span className="font-medium">UOM:</span> {selectedPresetConfig.uom_values.join(", ")}</p>
                                                            )}
                                                            {selectedPresetConfig.date_formats && (
                                                                <p><span className="font-medium">Date Formats:</span> {selectedPresetConfig.date_formats.join(", ")}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            <div className="flex justify-between gap-2 pt-2 border-t border-border/50">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={goToPreviousStep}
                                                >
                                                    ← Back
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={goToNextStep}
                                                >
                                                    Next: Rules →
                                                </Button>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>

                                    {/* ── 4. Custom Rules ────────────────────────────── */}
                                    <Collapsible open={currentAdvancedStep === "rules"} onOpenChange={(open) => {
                                        if (open) setCurrentAdvancedStep("rules")
                                    }}>
                                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                                            {currentAdvancedStep === "rules" ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            <Badge className="bg-primary/20 text-primary w-5 h-5 flex items-center justify-center text-xs p-0 rounded-full">4</Badge>
                                            <span className="text-sm font-medium">Rules</span>
                                            <Badge variant="outline" className="ml-auto text-[10px]">
                                                {globalRules.filter(r => r.selected).length}/{globalRules.length} active
                                            </Badge>
                                            {currentStepIndex > 3 && (
                                                <Badge variant="outline" className="ml-auto text-[10px] bg-green-500/20 text-green-700">✓</Badge>
                                            )}
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="mt-2 ml-2 space-y-2">
                                            <p className="text-xs text-muted-foreground mb-1">
                                                Toggle rules to apply during DQ processing
                                            </p>
                                            <div className="space-y-2 max-h-[25vh] overflow-y-auto">
                                                {globalRules.map(rule => (
                                                    <div
                                                        key={rule.rule_id}
                                                        onClick={() => toggleRule(rule.rule_id)}
                                                        className={cn(
                                                            "flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors",
                                                            rule.selected
                                                                ? "border-primary/50 bg-primary/5"
                                                                : "border-border hover:bg-muted/30"
                                                        )}
                                                    >
                                                        <Checkbox checked={rule.selected} className="mt-0.5" />
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-sm font-medium">{rule.rule_name}</span>
                                                            {rule.description && (
                                                                <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-between gap-2 pt-2 border-t border-border/50">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={goToPreviousStep}
                                                >
                                                    ← Back
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={goToNextStep}
                                                >
                                                    Next: Review →
                                                </Button>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>

                                    {/* ── 5. Process / Create Job ────────────────────────────── */}
                                    <Collapsible open={currentAdvancedStep === "process"} onOpenChange={(open) => {
                                        if (open) setCurrentAdvancedStep("process")
                                    }}>
                                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg border border-dashed border-primary/50 hover:bg-primary/5 transition-colors">
                                            {currentAdvancedStep === "process" ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            <Badge className="bg-primary/20 text-primary w-5 h-5 flex items-center justify-center text-xs p-0 rounded-full">5</Badge>
                                            <span className="text-sm font-medium">Review & Create Job</span>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="mt-2 ml-2 space-y-3">
                                            <div className="space-y-2">
                                                <p className="text-xs text-muted-foreground">
                                                    Configuration Summary:
                                                </p>
                                                <div className="text-xs space-y-1 p-3 rounded border border-border/50 bg-muted/20">
                                                    <p><span className="font-medium">Columns:</span> {selectedColumns.length} selected</p>
                                                    <p><span className="font-medium">Preset:</span> {selectedPresetId ? presets.find(p => p.preset_id === selectedPresetId)?.preset_name : "Default"}</p>
                                                    <p><span className="font-medium">Rules:</span> {globalRules.filter(r => r.selected).length} active</p>
                                                </div>
                                                <p className="text-xs text-muted-foreground text-center mt-2">
                                                    All configurations are complete. Click "Create Job" to finalize.
                                                </p>
                                            </div>
                                            <div className="flex justify-between gap-2 pt-2 border-t border-border/50">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={goToPreviousStep}
                                                >
                                                    ← Back
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={handleSubmit}
                                                    disabled={saving}
                                                >
                                                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                                                    Create Job ✓
                                                </Button>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </div>
                            ) : null}
                        </CollapsibleContent>
                    </Collapsible>
                </div>

                <DialogFooter className="pt-2">
                    <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                        {isEdit ? "Update Job" : "Create Job"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

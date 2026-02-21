"use client"

import { Loader2, ChevronDown, ChevronRight, Sparkles, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
    Collapsible, CollapsibleContent, CollapsibleTrigger
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import type { Job, JobFrequency } from "@/modules/jobs/api/jobs-api"

import { useJobDialog } from "./use-job-dialog"
import { ENTITY_OPTIONS, ERP_OPTIONS, SOURCE_ERP_OPTIONS } from "./job-dialog-constants"

// ─── Props ────────────────────────────────────────────────────────────────────

interface JobDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    job?: Job | null
    onSuccess: () => void
    onCancel: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JobDialog({ open, onOpenChange, job, onSuccess, onCancel }: JobDialogProps) {
    const d = useJobDialog({ open, job, onSuccess })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg">{d.isEdit ? "Edit Job" : "Create Job"}</DialogTitle>
                    <DialogDescription>
                        {d.isEdit ? "Update job configuration" : "Set up a new automated ERP sync job"}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-1">
                    {/* Job Name */}
                    <div className="space-y-2">
                        <Label htmlFor="job-name" className="text-sm font-medium">Job Name</Label>
                        <Input
                            id="job-name"
                            placeholder="e.g. QB Invoice Sync"
                            value={d.name}
                            onChange={(e) => d.setName(e.target.value)}
                            className="h-10"
                        />
                    </div>

                    {/* Source & Destination */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Source ERP</Label>
                            <Select value={d.source} onValueChange={d.setSource}>
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
                            <Select value={d.destination} onValueChange={d.setDestination}>
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
                            <Select value={d.entity} onValueChange={d.setEntity}>
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
                            <Select value={d.frequency} onValueChange={(v) => d.setFrequency(v as JobFrequency)}>
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

                    {d.frequency === "cron" && (
                        <Input
                            placeholder="e.g. 0 */2 * * *"
                            value={d.cronExpression}
                            onChange={(e) => d.setCronExpression(e.target.value)}
                            className="h-9 font-mono text-sm"
                        />
                    )}

                    {/* ─── Advanced (Optional) ─────────────────────────────── */}
                    <Collapsible open={d.advancedOpen} onOpenChange={d.handleAdvancedOpenChange}>
                        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 border-t border-border/50">
                            {d.advancedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span className="text-sm font-medium text-muted-foreground">Advanced (Optional)</span>
                            {d.advancedOpen && (d.selectedColumns.length > 0 || d.selectedPresetId) && (
                                <Badge variant="outline" className="ml-auto text-[10px]">Configured</Badge>
                            )}
                        </CollapsibleTrigger>

                        <CollapsibleContent className="pt-3 space-y-4">
                            {/* Data Import Section */}
                            {!d.dataImported && d.advancedMode ? (
                                <div className="flex flex-col gap-3 p-4 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                                    <h3 className="text-sm font-semibold">Import Data from {SOURCE_ERP_OPTIONS.find(e => e.value === d.source)?.label}</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Click below to import data from your {SOURCE_ERP_OPTIONS.find(e => e.value === d.source)?.label} account. After import, configure the five wizards.
                                    </p>
                                    <Button onClick={d.handleImportDataFromSource} disabled={d.importingData} className="w-full">
                                        {d.importingData ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
                                        {d.importingData ? "Importing..." : "Import Data from Source"}
                                    </Button>
                                </div>
                            ) : null}

                            {/* Sequential Wizard (shown after data import) */}
                            {d.dataImported ? (
                                <div className="space-y-3">
                                    {/* ── 1. Select Columns ── */}
                                    <Collapsible open={d.currentAdvancedStep === "columns"} onOpenChange={(o) => { if (o) d.setCurrentAdvancedStep("columns") }}>
                                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                                            {d.currentAdvancedStep === "columns" ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            <Badge className="bg-primary/20 text-primary w-5 h-5 flex items-center justify-center text-xs p-0 rounded-full">1</Badge>
                                            <span className="text-sm font-medium">Select Columns</span>
                                            {d.selectedColumns.length > 0 && (
                                                <Badge variant="outline" className="ml-auto text-[10px]">{d.selectedColumns.length} selected</Badge>
                                            )}
                                            {d.currentStepIndex > 0 && (
                                                <Badge variant="outline" className="ml-auto text-[10px] bg-green-500/20 text-green-700">✓</Badge>
                                            )}
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="mt-2 ml-2 space-y-3">
                                            {d.allColumns.length === 0 ? (
                                                <p className="text-xs text-muted-foreground">No columns available</p>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <Input placeholder="Search columns..." value={d.colSearch} onChange={(e) => d.setColSearch(e.target.value)} className="h-8 text-sm flex-1" />
                                                        <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => d.setSelectedColumns([...d.allColumns])}>All</Button>
                                                        <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => d.setSelectedColumns([])}>None</Button>
                                                    </div>
                                                    <div className="border border-border rounded-lg max-h-[30vh] overflow-y-auto">
                                                        <div className="grid grid-cols-2 gap-1 p-2">
                                                            {d.filteredCols.map(col => {
                                                                const checked = d.selectedColumns.includes(col)
                                                                return (
                                                                    <div key={col} onClick={() => d.toggleColumn(col)} className={cn(
                                                                        "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors text-sm",
                                                                        checked ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50 border border-transparent"
                                                                    )}>
                                                                        <Checkbox checked={checked} />
                                                                        <span className="truncate">{col}</span>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">{d.selectedColumns.length} of {d.allColumns.length} columns selected</p>
                                                </>
                                            )}
                                            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                                                <Button size="sm" onClick={d.goToNextStep} disabled={d.selectedColumns.length === 0}>Next: Profiling →</Button>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>

                                    {/* ── 2. Profiling ── */}
                                    <Collapsible open={d.currentAdvancedStep === "profiling"} onOpenChange={(o) => { if (o) d.setCurrentAdvancedStep("profiling") }}>
                                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                                            {d.currentAdvancedStep === "profiling" ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            <Badge className="bg-primary/20 text-primary w-5 h-5 flex items-center justify-center text-xs p-0 rounded-full">2</Badge>
                                            <span className="text-sm font-medium">Profiling</span>
                                            {Object.keys(d.columnProfiles).length > 0 && (
                                                <Badge variant="outline" className="ml-auto text-[10px]">Analyzed</Badge>
                                            )}
                                            {d.currentStepIndex > 1 && (
                                                <Badge variant="outline" className="ml-auto text-[10px] bg-green-500/20 text-green-700">✓</Badge>
                                            )}
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="mt-2 ml-2 space-y-3">
                                            {Object.keys(d.columnProfiles).length === 0 ? (
                                                <div className="flex flex-col gap-3">
                                                    <p className="text-xs text-muted-foreground">Analyze {d.selectedColumns.length} selected columns to detect data types and quality metrics.</p>
                                                    <Button onClick={d.handleFetchProfiling} disabled={d.profilingLoading} className="w-full">
                                                        {d.profilingLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
                                                        {d.profilingLoading ? "Analyzing..." : "Analyze Columns"}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="text-xs space-y-2 max-h-[30vh] overflow-y-auto">
                                                    {Object.entries(d.columnProfiles).slice(0, 3).map(([col, profile]) => (
                                                        <div key={col} className="p-2 rounded border border-border/50 bg-muted/20">
                                                            <p className="font-medium text-xs">{col}</p>
                                                            <p className="text-muted-foreground">Type: {profile.data_type || 'Unknown'}</p>
                                                            <p className="text-muted-foreground">Quality: {profile.quality_score ? `${(profile.quality_score * 100).toFixed(1)}%` : 'N/A'}</p>
                                                        </div>
                                                    ))}
                                                    {Object.keys(d.columnProfiles).length > 3 && (
                                                        <p className="text-muted-foreground text-center text-xs py-2">... +{Object.keys(d.columnProfiles).length - 3} more</p>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex justify-between gap-2 pt-2 border-t border-border/50">
                                                <Button variant="outline" size="sm" onClick={d.goToPreviousStep}>← Back</Button>
                                                <Button size="sm" onClick={d.goToNextStep} disabled={Object.keys(d.columnProfiles).length === 0}>Next: Settings →</Button>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>

                                    {/* ── 3. Settings Preset ── */}
                                    <Collapsible open={d.currentAdvancedStep === "settings"} onOpenChange={(o) => { if (o) d.setCurrentAdvancedStep("settings") }}>
                                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                                            {d.currentAdvancedStep === "settings" ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            <Badge className="bg-primary/20 text-primary w-5 h-5 flex items-center justify-center text-xs p-0 rounded-full">3</Badge>
                                            <span className="text-sm font-medium">Settings Preset</span>
                                            {d.selectedPresetId && (
                                                <Badge variant="outline" className="ml-auto text-[10px]">
                                                    {d.presets.find(p => p.preset_id === d.selectedPresetId)?.preset_name || "Selected"}
                                                </Badge>
                                            )}
                                            {d.currentStepIndex > 2 && (
                                                <Badge variant="outline" className="ml-auto text-[10px] bg-green-500/20 text-green-700">✓</Badge>
                                            )}
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="mt-2 ml-2 space-y-3">
                                            {d.presetsLoading ? (
                                                <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                                                    <Loader2 className="h-4 w-4 animate-spin" />Loading presets...
                                                </div>
                                            ) : (
                                                <>
                                                    <Select value={d.selectedPresetId || "none"} onValueChange={d.handleSelectPreset}>
                                                        <SelectTrigger className="h-10">
                                                            <SelectValue placeholder="Select a preset..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">
                                                                <span className="text-muted-foreground">No preset (default rules)</span>
                                                            </SelectItem>
                                                            {d.presets.map(p => (
                                                                <SelectItem key={p.preset_id} value={p.preset_id}>
                                                                    <div className="flex items-center gap-2">
                                                                        {p.is_default && <Star className="w-3 h-3 text-yellow-500" />}
                                                                        {p.preset_name}
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {d.selectedPresetConfig && (
                                                        <div className="text-xs text-muted-foreground border border-border rounded-lg p-3 space-y-1">
                                                            {d.selectedPresetConfig.currency_values && (
                                                                <p><span className="font-medium">Currencies:</span> {d.selectedPresetConfig.currency_values.join(", ")}</p>
                                                            )}
                                                            {d.selectedPresetConfig.uom_values && (
                                                                <p><span className="font-medium">UOM:</span> {d.selectedPresetConfig.uom_values.join(", ")}</p>
                                                            )}
                                                            {d.selectedPresetConfig.date_formats && (
                                                                <p><span className="font-medium">Date Formats:</span> {d.selectedPresetConfig.date_formats.join(", ")}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            <div className="flex justify-between gap-2 pt-2 border-t border-border/50">
                                                <Button variant="outline" size="sm" onClick={d.goToPreviousStep}>← Back</Button>
                                                <Button size="sm" onClick={d.goToNextStep}>Next: Rules →</Button>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>

                                    {/* ── 4. Custom Rules ── */}
                                    <Collapsible open={d.currentAdvancedStep === "rules"} onOpenChange={(o) => { if (o) d.setCurrentAdvancedStep("rules") }}>
                                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                                            {d.currentAdvancedStep === "rules" ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            <Badge className="bg-primary/20 text-primary w-5 h-5 flex items-center justify-center text-xs p-0 rounded-full">4</Badge>
                                            <span className="text-sm font-medium">Rules</span>
                                            <Badge variant="outline" className="ml-auto text-[10px]">
                                                {d.globalRules.filter(r => r.selected).length}/{d.globalRules.length} active
                                            </Badge>
                                            {d.currentStepIndex > 3 && (
                                                <Badge variant="outline" className="ml-auto text-[10px] bg-green-500/20 text-green-700">✓</Badge>
                                            )}
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="mt-2 ml-2 space-y-2">
                                            <p className="text-xs text-muted-foreground mb-1">Toggle rules to apply during DQ processing</p>
                                            <div className="space-y-2 max-h-[25vh] overflow-y-auto">
                                                {d.globalRules.map(rule => (
                                                    <div key={rule.rule_id} onClick={() => d.toggleRule(rule.rule_id)} className={cn(
                                                        "flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors",
                                                        rule.selected ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/30"
                                                    )}>
                                                        <Checkbox checked={rule.selected} className="mt-0.5" />
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-sm font-medium">{rule.rule_name}</span>
                                                            {rule.description && <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-between gap-2 pt-2 border-t border-border/50">
                                                <Button variant="outline" size="sm" onClick={d.goToPreviousStep}>← Back</Button>
                                                <Button size="sm" onClick={d.goToNextStep}>Next: Review →</Button>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>

                                    {/* ── 5. Process / Create Job ── */}
                                    <Collapsible open={d.currentAdvancedStep === "process"} onOpenChange={(o) => { if (o) d.setCurrentAdvancedStep("process") }}>
                                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg border border-dashed border-primary/50 hover:bg-primary/5 transition-colors">
                                            {d.currentAdvancedStep === "process" ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            <Badge className="bg-primary/20 text-primary w-5 h-5 flex items-center justify-center text-xs p-0 rounded-full">5</Badge>
                                            <span className="text-sm font-medium">Review & Create Job</span>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="mt-2 ml-2 space-y-3">
                                            <div className="space-y-2">
                                                <p className="text-xs text-muted-foreground">Configuration Summary:</p>
                                                <div className="text-xs space-y-1 p-3 rounded border border-border/50 bg-muted/20">
                                                    <p><span className="font-medium">Columns:</span> {d.selectedColumns.length} selected</p>
                                                    <p><span className="font-medium">Preset:</span> {d.selectedPresetId ? d.presets.find(p => p.preset_id === d.selectedPresetId)?.preset_name : "Default"}</p>
                                                    <p><span className="font-medium">Rules:</span> {d.globalRules.filter(r => r.selected).length} active</p>
                                                </div>
                                                <p className="text-xs text-muted-foreground text-center mt-2">All configurations are complete. Click "Create Job" to finalize.</p>
                                            </div>
                                            <div className="flex justify-between gap-2 pt-2 border-t border-border/50">
                                                <Button variant="outline" size="sm" onClick={d.goToPreviousStep}>← Back</Button>
                                                <Button size="sm" onClick={d.handleSubmit} disabled={d.saving}>
                                                    {d.saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
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
                    <Button variant="outline" onClick={onCancel} disabled={d.saving}>Cancel</Button>
                    <Button onClick={d.handleSubmit} disabled={d.saving || !d.name.trim()}>
                        {d.saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                        {d.isEdit ? "Update Job" : "Create Job"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

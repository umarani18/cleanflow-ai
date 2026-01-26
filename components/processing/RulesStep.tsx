"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    Loader2,
    ArrowLeft,
    Play,
    ChevronDown,
    ChevronRight,
    Plus,
    Trash2,
    Sparkles,
    Code,
} from "lucide-react"
import { useProcessingWizard, type RuleWithState } from "./WizardContext"
import { fileManagementAPI, type CustomRuleDefinition } from "@/lib/api/file-management-api"

// Mock rule definitions - in production these come from DQ engine
const GLOBAL_RULES: RuleWithState[] = [
    { rule_id: "R4", rule_name: "Whitespace Cleanup", category: "auto", selected: true, description: "Trim leading/trailing whitespace" },
    { rule_id: "R5", rule_name: "Case Normalization", category: "auto", selected: true, description: "Standardize text casing" },
    { rule_id: "R6", rule_name: "Special Characters", category: "human", selected: false, description: "Remove special characters" },
]

const SEVERITY_STYLES = {
    critical: "bg-red-500/20 text-red-500 border-red-500/30",
    warning: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    info: "bg-blue-500/20 text-blue-500 border-blue-500/30",
}

export function RulesStep() {
    const {
        uploadId,
        authToken,
        selectedColumns,
        columnProfiles,
        customRules,
        addCustomRule,
        removeCustomRule,
        disabledRules,
        nextStep,
        prevStep,
    } = useProcessingWizard()

    const [expandedColumns, setExpandedColumns] = useState<string[]>([])
    const [globalRulesState, setGlobalRulesState] = useState(GLOBAL_RULES)
    const [columnRulesState, setColumnRulesState] = useState<Record<string, RuleWithState[]>>({})

    // Custom rule form state
    const [customRuleColumn, setCustomRuleColumn] = useState("")
    const [customRulePrompt, setCustomRulePrompt] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [pendingSuggestion, setPendingSuggestion] = useState<CustomRuleDefinition | null>(null)

    const toggleColumnExpand = (col: string) => {
        setExpandedColumns((prev) =>
            prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
        )
    }

    const toggleGlobalRule = (ruleId: string) => {
        setGlobalRulesState((prev) =>
            prev.map((r) => (r.rule_id === ruleId ? { ...r, selected: !r.selected } : r))
        )
    }

    const toggleColumnRule = (column: string, ruleId: string) => {
        setColumnRulesState((prev) => {
            const rules = prev[column] || getDefaultColumnRules(column)
            return {
                ...prev,
                [column]: rules.map((r) =>
                    r.rule_id === ruleId ? { ...r, selected: !r.selected } : r
                ),
            }
        })
    }

    const getDefaultColumnRules = (column: string): RuleWithState[] => {
        const profile = columnProfiles[column]
        const autoRules = profile?.auto_rules || []
        const humanRules = profile?.human_rules || []

        return [
            ...autoRules.map((id) => ({
                rule_id: id,
                rule_name: `Rule ${id}`,
                category: "auto" as const,
                selected: true,
                column,
            })),
            ...humanRules.map((id) => ({
                rule_id: id,
                rule_name: `Rule ${id}`,
                category: "human" as const,
                selected: false,
                column,
            })),
        ]
    }

    const handleGenerateCustomRule = async () => {
        if (!customRuleColumn || !customRulePrompt.trim()) return

        setIsGenerating(true)
        try {
            const response = await fileManagementAPI.suggestCustomRule(
                uploadId,
                customRuleColumn,
                customRulePrompt,
                authToken
            )
            if (response.suggestion) {
                setPendingSuggestion(response.suggestion)
            }
        } catch (err) {
            console.error("Failed to generate rule:", err)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleApproveCustomRule = () => {
        if (!pendingSuggestion) return

        const ruleId = pendingSuggestion.rule_id || `CUST_${Date.now().toString(36)}`
        addCustomRule({
            ...pendingSuggestion,
            rule_id: ruleId,
            column: customRuleColumn,
        })
        setPendingSuggestion(null)
        setCustomRulePrompt("")
    }

    const handleStartProcessing = () => {
        nextStep()
    }

    return (
        <div className="flex flex-col h-[60vh]">
            <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                    {/* Header */}
                    <div>
                        <h2 className="text-xl font-semibold">Rule Configuration</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Configure which rules to apply during processing
                        </p>
                    </div>

                    {/* Global Rules */}
                    <Collapsible defaultOpen>
                        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                            <ChevronDown className="w-4 h-4" />
                            <h3 className="font-medium">Global Rules</h3>
                            <Badge variant="outline" className="ml-2">
                                {globalRulesState.filter((r) => r.selected).length} / {globalRulesState.length}
                            </Badge>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {globalRulesState.map((rule) => (
                                    <div
                                        key={rule.rule_id}
                                        onClick={() => toggleGlobalRule(rule.rule_id)}
                                        className={cn(
                                            "flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors",
                                            rule.selected
                                                ? "border-primary/50 bg-primary/5"
                                                : "border-muted hover:bg-muted/30"
                                        )}
                                    >
                                        <Checkbox checked={rule.selected} className="mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">{rule.rule_name}</span>
                                                <Badge variant="outline" className="text-[10px]">
                                                    {rule.category}
                                                </Badge>
                                            </div>
                                            {rule.description && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {rule.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>

                    {/* Column-specific Rules */}
                    <div className="space-y-3">
                        <h3 className="font-medium">Column Rules</h3>
                        {selectedColumns.map((col) => {
                            const isExpanded = expandedColumns.includes(col)
                            const rules = columnRulesState[col] || getDefaultColumnRules(col)
                            const columnCustomRules = customRules.filter((r) => r.column === col)

                            return (
                                <Collapsible key={col} open={isExpanded} onOpenChange={() => toggleColumnExpand(col)}>
                                    <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-md border border-muted hover:bg-muted/30">
                                        {isExpanded ? (
                                            <ChevronDown className="w-4 h-4" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4" />
                                        )}
                                        <span className="font-medium">{col}</span>
                                        <Badge variant="outline" className="ml-auto">
                                            {rules.filter((r) => r.selected).length + columnCustomRules.length} rules
                                        </Badge>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="mt-2 ml-6 space-y-3">
                                        {/* Auto rules */}
                                        {rules.filter((r) => r.category === "auto").length > 0 && (
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-2">Auto Rules (recommended)</p>
                                                <div className="space-y-1">
                                                    {rules
                                                        .filter((r) => r.category === "auto")
                                                        .map((rule) => (
                                                            <div
                                                                key={rule.rule_id}
                                                                onClick={() => toggleColumnRule(col, rule.rule_id)}
                                                                className="flex items-center gap-2 p-2 rounded hover:bg-muted/30 cursor-pointer"
                                                            >
                                                                <Checkbox checked={rule.selected} />
                                                                <span className="text-sm">{rule.rule_name}</span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Human rules */}
                                        {rules.filter((r) => r.category === "human").length > 0 && (
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-2">Human Rules (optional)</p>
                                                <div className="space-y-1">
                                                    {rules
                                                        .filter((r) => r.category === "human")
                                                        .map((rule) => (
                                                            <div
                                                                key={rule.rule_id}
                                                                onClick={() => toggleColumnRule(col, rule.rule_id)}
                                                                className="flex items-center gap-2 p-2 rounded hover:bg-muted/30 cursor-pointer"
                                                            >
                                                                <Checkbox checked={rule.selected} />
                                                                <span className="text-sm">{rule.rule_name}</span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Custom rules */}
                                        {columnCustomRules.length > 0 && (
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-2">Custom Rules</p>
                                                <div className="space-y-2">
                                                    {columnCustomRules.map((rule) => (
                                                        <div
                                                            key={rule.rule_id}
                                                            className="flex items-start gap-2 p-2 rounded border border-muted"
                                                        >
                                                            <Sparkles className="w-4 h-4 text-primary mt-0.5" />
                                                            <div className="flex-1">
                                                                <span className="text-sm font-medium">{rule.rule_name}</span>
                                                                {rule.code && (
                                                                    <details className="mt-1">
                                                                        <summary className="text-xs text-primary cursor-pointer">
                                                                            <Code className="w-3 h-3 inline mr-1" />
                                                                            View Code
                                                                        </summary>
                                                                        <pre className="mt-1 p-2 bg-zinc-900 text-green-400 text-xs rounded overflow-x-auto">
                                                                            {rule.code}
                                                                        </pre>
                                                                    </details>
                                                                )}
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6"
                                                                onClick={() => removeCustomRule(rule.rule_id!)}
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Add custom rule */}
                                        {customRuleColumn === col ? (
                                            <div className="p-3 border border-dashed border-muted rounded-md space-y-3">
                                                <Textarea
                                                    value={customRulePrompt}
                                                    onChange={(e) => setCustomRulePrompt(e.target.value)}
                                                    placeholder="Describe your rule in natural language..."
                                                    rows={2}
                                                />
                                                {pendingSuggestion && (
                                                    <div className="p-2 border border-primary/30 rounded bg-primary/5">
                                                        <div className="font-medium text-sm">{pendingSuggestion.rule_name}</div>
                                                        <p className="text-xs text-muted-foreground">{pendingSuggestion.explanation}</p>
                                                        <div className="flex gap-2 mt-2">
                                                            <Button size="sm" onClick={handleApproveCustomRule}>Approve</Button>
                                                            <Button size="sm" variant="ghost" onClick={() => setPendingSuggestion(null)}>Reject</Button>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={handleGenerateCustomRule}
                                                        disabled={isGenerating || !customRulePrompt.trim()}
                                                    >
                                                        {isGenerating ? (
                                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                        ) : (
                                                            <Sparkles className="w-4 h-4 mr-2" />
                                                        )}
                                                        Generate Rule
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => setCustomRuleColumn("")}>
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCustomRuleColumn(col)}
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add Custom Rule
                                            </Button>
                                        )}
                                    </CollapsibleContent>
                                </Collapsible>
                            )
                        })}
                    </div>
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-4 border-t border-muted/40 flex items-center justify-between">
                <Button variant="outline" onClick={prevStep}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <Button onClick={handleStartProcessing} className="bg-green-600 hover:bg-green-700">
                    <Play className="w-4 h-4 mr-2" />
                    Start Processing
                </Button>
            </div>
        </div>
    )
}

"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ArrowLeft, Play, ChevronDown, ChevronRight, Plus, Trash2, Sparkles, Loader2, Code } from "lucide-react"
import { useProcessingWizard, type RuleWithState } from "../WizardContext"
import { fileManagementAPI, type CustomRuleDefinition } from "@/lib/api/file-management-api"
import { cn } from "@/lib/utils"

export function RulesStep() {
  const {
    uploadId,
    authToken,
    selectedColumns,
    columnProfiles,
    customRules,
    addCustomRule,
    removeCustomRule,
    nextStep,
    prevStep,
    globalRules,
    setGlobalRules,
    columnRules,
    setColumnRules,
  } = useProcessingWizard()

  const [expandedColumns, setExpandedColumns] = useState<string[]>([])
  const [customRuleColumn, setCustomRuleColumn] = useState("")
  const [customRulePrompt, setCustomRulePrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [pendingSuggestion, setPendingSuggestion] = useState<CustomRuleDefinition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rawResponse, setRawResponse] = useState<string | null>(null)

  useEffect(() => {
    // Seed rules from profiles if not already set
    if (selectedColumns.length > 0 && Object.keys(columnRules).length === 0) {
      const defaults: Record<string, RuleWithState[]> = {}
      selectedColumns.forEach((col) => {
        const profile = columnProfiles[col]
        if (!profile) return
        const autoRules =
          (profile.rules || []).filter((r: any) => r.decision === "auto").map((r: any) => r.rule_id) ||
          profile.auto_rules ||
          []
        const humanRules =
          (profile.rules || []).filter((r: any) => r.decision === "human").map((r: any) => r.rule_id) ||
          profile.human_rules ||
          []
        defaults[col] = [
          ...autoRules.map((id: string) => ({
            rule_id: id,
            rule_name: `Rule ${id}`,
            category: "auto" as const,
            selected: true,
            column: col,
          })),
          ...humanRules.map((id: string) => ({
            rule_id: id,
            rule_name: `Rule ${id}`,
            category: "human" as const,
            selected: false,
            column: col,
          })),
        ]
      })
      setColumnRules(defaults)
      setGlobalRules([]) // keep empty by default
    }
  }, [selectedColumns, columnProfiles])

  const toggleColumnExpand = (col: string) => {
    setExpandedColumns((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]))
  }

  const toggleGlobalRule = (ruleId: string) => {
    setGlobalRules(globalRules.map((r) => (r.rule_id === ruleId ? { ...r, selected: !r.selected } : r)))
  }

  const toggleColumnRule = (column: string, ruleId: string) => {
    const rules = columnRules[column] || []
    setColumnRules({
      ...columnRules,
      [column]: rules.map((r) => (r.rule_id === ruleId ? { ...r, selected: !r.selected } : r)),
    })
  }

  const handleGenerateCustomRule = async () => {
    if (!customRuleColumn || !customRulePrompt.trim() || !authToken) return
    setIsGenerating(true)
    setError(null)
    setRawResponse(null)
    try {
      const response = await fileManagementAPI.suggestCustomRule(uploadId, authToken, {
        column: customRuleColumn,
        prompt: customRulePrompt.trim(),
      })
      if (response?.raw_response) {
        const raw = typeof response.raw_response === "string" ? response.raw_response : JSON.stringify(response.raw_response, null, 2)
        setRawResponse(raw)
      }
      if (response?.error || !response?.suggestion) {
        setError(response?.error || "LLM did not return a usable rule. Please adjust the prompt.")
        setPendingSuggestion(null)
        return
      }
      setPendingSuggestion(response.suggestion)
    } catch (err: any) {
      setError(err.message || "Failed to generate rule")
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

  const canProceed = true // rules optional

  return (
    <div className="flex flex-col h-[60vh]">
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Rule Configuration</h2>
            <p className="text-sm text-muted-foreground mt-1">Configure which rules to apply during processing.</p>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">Column Rules</h3>
            {selectedColumns.length === 0 && (
              <p className="text-sm text-muted-foreground">Select columns and profile them to see suggested rules.</p>
            )}
            {selectedColumns.map((col) => {
              const isExpanded = expandedColumns.includes(col)
              const rules = columnRules[col] || []
              const columnCustomRules = customRules.filter((r) => r.column === col)
              return (
                <Collapsible key={col} open={isExpanded} onOpenChange={() => toggleColumnExpand(col)}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-md border border-muted hover:bg-muted/30">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="font-medium">{col}</span>
                    <Badge variant="outline" className="ml-auto">
                      {rules.filter((r) => r.selected).length + columnCustomRules.length} rules
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 ml-6 space-y-3">
                    {rules.length === 0 && columnCustomRules.length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        No suggested rules for this column. You can add custom rules below.
                      </div>
                    )}
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

                    {columnCustomRules.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Custom Rules</p>
                        <div className="space-y-2">
                          {columnCustomRules.map((rule) => (
                            <div key={rule.rule_id} className="flex items-start gap-2 p-2 rounded border border-muted">
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
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCustomRule(rule.rule_id!)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {customRuleColumn === col ? (
                      <div className="p-3 border border-dashed border-muted rounded-md space-y-3">
                        <Textarea value={customRulePrompt} onChange={(e) => setCustomRulePrompt(e.target.value)} placeholder="Describe your rule in natural language..." rows={2} />
                    {pendingSuggestion && (
                      <div className="p-2 border border-primary/30 rounded bg-primary/5">
                        <div className="font-medium text-sm">{pendingSuggestion.rule_name}</div>
                        <p className="text-xs text-muted-foreground">{pendingSuggestion.explanation}</p>
                        <div className="flex gap-2 mt-2">
                              <Button size="sm" onClick={handleApproveCustomRule}>
                                Approve
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setPendingSuggestion(null)}>
                                Reject
                              </Button>
                            </div>
                          </div>
                        )}
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        {rawResponse && (
                          <div className="text-xs bg-muted/40 border rounded p-2 max-h-32 overflow-y-auto text-muted-foreground">
                            <div className="font-medium text-foreground mb-1">LLM raw response</div>
                            <pre className="whitespace-pre-wrap break-all">{rawResponse}</pre>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleGenerateCustomRule} disabled={isGenerating || !customRulePrompt.trim()}>
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            Generate Rule
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setCustomRuleColumn("")}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setCustomRuleColumn(col)}>
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

      <div className="p-4 border-t border-muted/40 flex items-center justify-between">
        <Button variant="outline" onClick={prevStep}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={nextStep} className="bg-green-600 hover:bg-green-700" disabled={!canProceed}>
          <Play className="w-4 h-4 mr-2" />
          Start Processing
        </Button>
      </div>
    </div>
  )
}

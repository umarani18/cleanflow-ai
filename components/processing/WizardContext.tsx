"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"
import type { CustomRuleDefinition, ColumnProfile } from "@/lib/api/file-management-api"

export type WizardStep = "columns" | "profiling" | "settings" | "rules" | "process"

export interface RuleWithState {
  rule_id: string
  rule_name: string
  category: "auto" | "human" | "custom"
  selected: boolean
  column?: string
  severity?: "critical" | "warning" | "info"
}

export interface SettingsPreset {
  preset_id: string
  preset_name: string
  config: Record<string, any>
  is_default?: boolean
}

interface WizardState {
  step: WizardStep
  uploadId: string
  fileName: string
  authToken: string
  allColumns: string[]
  selectedColumns: string[]
  columnProfiles: Record<string, ColumnProfile>
  requiredColumns: string[]
  selectedPreset: SettingsPreset | null
  presetOverrides: Record<string, any>
  globalRules: RuleWithState[]
  columnRules: Record<string, RuleWithState[]>
  customRules: CustomRuleDefinition[]
  isProcessing: boolean
  processingError: string | null
}

interface WizardActions {
  setStep: (step: WizardStep) => void
  nextStep: () => void
  prevStep: () => void
  initializeWithFile: (uploadId: string, fileName: string, columns: string[], authToken: string) => void
  setSelectedColumns: (cols: string[] | ((prev: string[]) => string[])) => void
  setColumnProfiles: (profiles: Record<string, ColumnProfile>) => void
  setRequiredColumns: (cols: string[]) => void
  setSelectedPreset: (preset: SettingsPreset | null) => void
  setPresetOverrides: (overrides: Record<string, any>) => void
  setGlobalRules: (rules: RuleWithState[]) => void
  setColumnRules: (rules: Record<string, RuleWithState[]>) => void
  addCustomRule: (rule: CustomRuleDefinition) => void
  removeCustomRule: (ruleId: string) => void
  setProcessing: (val: boolean) => void
  setProcessingError: (msg: string | null) => void
}

type WizardContextType = WizardState & WizardActions

export const STEP_ORDER: WizardStep[] = ["columns", "profiling", "settings", "rules", "process"]

const initialState: WizardState = {
  step: "columns",
  uploadId: "",
  fileName: "",
  authToken: "",
  allColumns: [],
  selectedColumns: [],
  columnProfiles: {},
  requiredColumns: [],
  selectedPreset: null,
  presetOverrides: {},
  globalRules: [],
  columnRules: {},
  customRules: [],
  isProcessing: false,
  processingError: null,
}

const WizardContext = createContext<WizardContextType | undefined>(undefined)

export function ProcessingWizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(initialState)

  const actions: WizardActions = {
    setStep: (step) => setState((s) => ({ ...s, step })),
    nextStep: () => {
      const idx = STEP_ORDER.indexOf(state.step)
      if (idx < STEP_ORDER.length - 1) setState((s) => ({ ...s, step: STEP_ORDER[idx + 1] }))
    },
    prevStep: () => {
      const idx = STEP_ORDER.indexOf(state.step)
      if (idx > 0) setState((s) => ({ ...s, step: STEP_ORDER[idx - 1] }))
    },
    initializeWithFile: (uploadId, fileName, columns, authToken) => {
      setState((prev) => {
        const sameFile = prev.uploadId === uploadId && prev.allColumns.length > 0
        const preservedStep = sameFile ? prev.step : initialState.step
        const preservedSelection =
          sameFile && prev.selectedColumns.length > 0
            ? prev.selectedColumns.filter((c) => columns.includes(c))
            : columns

        return {
          ...(sameFile ? prev : initialState),
          step: preservedStep,
          uploadId,
          fileName,
          authToken,
          allColumns: columns,
          selectedColumns: preservedSelection,
        }
      })
    },
    setSelectedColumns: (cols) =>
      setState((s) => ({
        ...s,
        selectedColumns: typeof cols === "function" ? (cols as (prev: string[]) => string[])(s.selectedColumns) : cols,
      })),
    setColumnProfiles: (profiles) => setState((s) => ({ ...s, columnProfiles: profiles })),
    setRequiredColumns: (cols) => setState((s) => ({ ...s, requiredColumns: cols })),
    setSelectedPreset: (preset) => setState((s) => ({ ...s, selectedPreset: preset })),
    setPresetOverrides: (overrides) => setState((s) => ({ ...s, presetOverrides: overrides })),
    setGlobalRules: (rules) => setState((s) => ({ ...s, globalRules: rules })),
    setColumnRules: (rules) => setState((s) => ({ ...s, columnRules: rules })),
    addCustomRule: (rule) => setState((s) => ({ ...s, customRules: [...s.customRules, rule] })),
    removeCustomRule: (ruleId) =>
      setState((s) => ({ ...s, customRules: s.customRules.filter((r) => r.rule_id !== ruleId) })),
    setProcessing: (val) => setState((s) => ({ ...s, isProcessing: val })),
    setProcessingError: (msg) => setState((s) => ({ ...s, processingError: msg })),
  }

  return (
    <WizardContext.Provider value={{ ...state, ...actions }}>
      {children}
    </WizardContext.Provider>
  )
}

export function useProcessingWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error("useProcessingWizard must be used within ProcessingWizardProvider")
  return ctx
}

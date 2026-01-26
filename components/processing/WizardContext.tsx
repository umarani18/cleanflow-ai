"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"
import type { CustomRuleDefinition, ColumnProfile } from "@/lib/api/file-management-api"

// Wizard step type
export type WizardStep = "columns" | "profiling" | "settings" | "rules" | "process"

// Settings preset
export interface SettingsPreset {
    preset_id: string
    preset_name: string
    config: {
        currency_values?: string[]
        uom_values?: string[]
        date_formats?: string[]
        custom_patterns?: Record<string, string>
        required_columns?: string[]
    }
    is_default?: boolean
}

// Rule with selection state
export interface RuleWithState {
    rule_id: string
    rule_name: string
    description?: string
    category: "auto" | "human" | "custom"
    selected: boolean
    column?: string
    severity?: "critical" | "warning" | "info"
    code?: string // For LLM-generated code rules
}

// Wizard state
export interface WizardState {
    // Current step
    step: WizardStep

    // File context
    uploadId: string
    fileName: string
    authToken: string // Add auth token to state

    // Step 1: Column Selection
    allColumns: string[]
    selectedColumns: string[]

    // Step 2: Profiling
    columnProfiles: Record<string, ColumnProfile>
    requiredColumns: string[]

    // Step 3: Settings
    selectedPreset: SettingsPreset | null
    presetOverrides: Record<string, any>

    // Step 4: Rules
    globalRules: RuleWithState[]
    columnRules: Record<string, RuleWithState[]>
    customRules: CustomRuleDefinition[]
    disabledRules: string[]

    // Step 5: Processing
    isProcessing: boolean
    processingError: string | null
}

// Wizard actions
interface WizardActions {
    setStep: (step: WizardStep) => void
    nextStep: () => void
    prevStep: () => void

    // Column selection
    setSelectedColumns: (columns: string[]) => void
    toggleColumn: (column: string) => void

    // Profiling
    setColumnProfiles: (profiles: Record<string, ColumnProfile>) => void
    setRequiredColumns: (columns: string[]) => void

    // Settings
    setSelectedPreset: (preset: SettingsPreset | null) => void
    setPresetOverrides: (overrides: Record<string, any>) => void

    // Rules
    setGlobalRules: (rules: RuleWithState[]) => void
    setColumnRules: (rules: Record<string, RuleWithState[]>) => void
    toggleRule: (ruleId: string, column?: string) => void
    addCustomRule: (rule: CustomRuleDefinition) => void
    removeCustomRule: (ruleId: string) => void

    // Processing
    startProcessing: () => void
    setProcessingError: (error: string | null) => void

    // Reset
    reset: () => void
    initializeWithFile: (uploadId: string, fileName: string, columns: string[], authToken: string) => void
}

type WizardContextType = WizardState & WizardActions

const STEP_ORDER: WizardStep[] = ["columns", "profiling", "settings", "rules", "process"]

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
    disabledRules: [],
    isProcessing: false,
    processingError: null,
}

const WizardContext = createContext<WizardContextType | undefined>(undefined)

export function ProcessingWizardProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<WizardState>(initialState)

    const actions: WizardActions = {
        setStep: (step) => setState((s) => ({ ...s, step })),

        nextStep: () => {
            const currentIndex = STEP_ORDER.indexOf(state.step)
            if (currentIndex < STEP_ORDER.length - 1) {
                setState((s) => ({ ...s, step: STEP_ORDER[currentIndex + 1] }))
            }
        },

        prevStep: () => {
            const currentIndex = STEP_ORDER.indexOf(state.step)
            if (currentIndex > 0) {
                setState((s) => ({ ...s, step: STEP_ORDER[currentIndex - 1] }))
            }
        },

        setSelectedColumns: (columns) => setState((s) => ({ ...s, selectedColumns: columns })),

        toggleColumn: (column) => {
            setState((s) => {
                const isSelected = s.selectedColumns.includes(column)
                return {
                    ...s,
                    selectedColumns: isSelected
                        ? s.selectedColumns.filter((c) => c !== column)
                        : [...s.selectedColumns, column],
                }
            })
        },

        setColumnProfiles: (profiles) => setState((s) => ({ ...s, columnProfiles: profiles })),

        setRequiredColumns: (columns) => setState((s) => ({ ...s, requiredColumns: columns })),

        setSelectedPreset: (preset) => setState((s) => ({ ...s, selectedPreset: preset })),

        setPresetOverrides: (overrides) => setState((s) => ({ ...s, presetOverrides: overrides })),

        setGlobalRules: (rules) => setState((s) => ({ ...s, globalRules: rules })),

        setColumnRules: (rules) => setState((s) => ({ ...s, columnRules: rules })),

        toggleRule: (ruleId, column) => {
            setState((s) => {
                if (column) {
                    // Toggle column-specific rule
                    const columnRules = { ...s.columnRules }
                    if (columnRules[column]) {
                        columnRules[column] = columnRules[column].map((r) =>
                            r.rule_id === ruleId ? { ...r, selected: !r.selected } : r
                        )
                    }
                    return { ...s, columnRules }
                } else {
                    // Toggle global rule
                    return {
                        ...s,
                        globalRules: s.globalRules.map((r) =>
                            r.rule_id === ruleId ? { ...r, selected: !r.selected } : r
                        ),
                    }
                }
            })
        },

        addCustomRule: (rule) => {
            setState((s) => ({ ...s, customRules: [...s.customRules, rule] }))
        },

        removeCustomRule: (ruleId) => {
            setState((s) => ({
                ...s,
                customRules: s.customRules.filter((r) => r.rule_id !== ruleId),
            }))
        },

        startProcessing: () => setState((s) => ({ ...s, isProcessing: true, processingError: null })),

        setProcessingError: (error) => setState((s) => ({ ...s, isProcessing: false, processingError: error })),

        reset: () => setState(initialState),

        initializeWithFile: (uploadId, fileName, columns, authToken) => {
            setState({
                ...initialState,
                uploadId,
                fileName,
                authToken,
                allColumns: columns,
                selectedColumns: columns, // Select all by default
            })
        },
    }

    return (
        <WizardContext.Provider value={{ ...state, ...actions }}>
            {children}
        </WizardContext.Provider>
    )
}

export function useProcessingWizard() {
    const context = useContext(WizardContext)
    if (!context) {
        throw new Error("useProcessingWizard must be used within ProcessingWizardProvider")
    }
    return context
}

export { STEP_ORDER }

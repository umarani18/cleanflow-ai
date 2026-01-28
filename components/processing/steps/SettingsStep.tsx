"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, Loader2, Plus, Settings, Star, Shield, ToggleLeft, ToggleRight, Sliders } from "lucide-react"
import { useProcessingWizard, type SettingsPreset } from "../WizardContext"
import { fileManagementAPI } from "@/lib/api/file-management-api"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const DEFAULT_PRESET: SettingsPreset & { config: Record<string, any> } = {
  preset_id: "default_dq_rules",
  preset_name: "Default Data Quality Rules",
  is_default: true,
  config: {
    ruleset_version: "dq34_v1",
    policies: {
      allow_autofix: true,
      strictness: "balanced",
      unknown_column_behavior: "safe_cleanup_only",
    },
    rules_enabled: {
      R1: true, R2: true, R3: true, R4: true, R5: true, R6: true, R7: true, R8: true, R9: true,
      R10: true, R11: true, R12: true, R13: true, R14: true, R15: true, R16: true, R17: true,
      R18: true, R19: true, R20: false, R21: true, R22: true, R23: true, R24: true, R25: true,
      R26: true, R27: true, R28: true, R29: true, R30: true, R31: true, R32: true, R33: true, R34: true,
    },
    required_columns: [],
    required_fields: {
      placeholders_treated_as_missing: ["", "na", "n/a", "null", "none", "-", "--", "?", "NA", "N/A", "NULL", "NONE"],
    },
    currency_values: [
      "USD","INR","EUR","GBP","SGD","AED","AUD","CAD","CHF","CNY","JPY","KWD","SAR","QAR","BHD","OMR"
    ],
    uom_values: [
      "EA","PCS","PC","KG","G","LTR","ML","M","CM","MM","FT","IN","YD","SQM","SQFT","CBM","CFT","HR",
      "MIN","SEC","DAY","WK","MON","YR","BOX","CTN","PAL","SET","KIT","PR","DOZ","GR","UNIT","TON","MT"
    ],
    date_formats: ["ISO","DMY","MDY"],
    enum_sets: {
      status: ["DRAFT","SUBMITTED","APPROVED","REJECTED","PENDING","PAID","CANCELLED","CLOSED","OPEN","POSTED","REVERSED","ACTIVE","INACTIVE","COMPLETED","YES","NO","Y","N","TRUE","FALSE","1","0"]
    },
    thresholds: {
      text: {
        max_len_default: 255,
      }
    }
  },
}

export function SettingsStep() {
  const {
    authToken,
    selectedPreset,
    setSelectedPreset,
    presetOverrides,
    setPresetOverrides,
    requiredColumns,
    setRequiredColumns,
    selectedColumns,
    prevStep,
    nextStep,
  } = useProcessingWizard()

  const [presets, setPresets] = useState<SettingsPreset[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [currencyValues, setCurrencyValues] = useState("")
  const [uomValues, setUomValues] = useState("")
  const [dateFormats, setDateFormats] = useState("")
  const [strictness, setStrictness] = useState("balanced")
  const [allowAutofix, setAllowAutofix] = useState(true)
  const [unknownBehavior, setUnknownBehavior] = useState("safe_cleanup_only")
  const [placeholders, setPlaceholders] = useState("")
  const [statusEnums, setStatusEnums] = useState("")
  const [maxTextLen, setMaxTextLen] = useState<number | string>(255)
  const [activeTab, setActiveTab] = useState("policies")
  const [showNewPresetDialog, setShowNewPresetDialog] = useState(false)
  const [newPresetName, setNewPresetName] = useState("")
  const [copySourceId, setCopySourceId] = useState<string>("current")

  useEffect(() => {
    fetchPresets()
  }, [authToken])

  const fetchPresets = async () => {
    if (!authToken) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await fileManagementAPI.getSettingsPresets(authToken)
      const serverPresets = response.presets || []
      const hasDefault = serverPresets.some((p: any) => p.is_default)
      const finalPresets =
        serverPresets.length === 0
          ? [DEFAULT_PRESET]
          : hasDefault
            ? serverPresets
            : [...serverPresets, DEFAULT_PRESET]
      setPresets(finalPresets)
      const defaultPreset = finalPresets.find((p: SettingsPreset) => (p as any).is_default)
      if (defaultPreset && !selectedPreset) {
        handleSelectPreset(defaultPreset.preset_id, finalPresets)
      }
    } catch (err: any) {
      const finalPresets = [DEFAULT_PRESET]
      setPresets(finalPresets)
      if (!selectedPreset) {
        handleSelectPreset(DEFAULT_PRESET.preset_id, finalPresets)
      }
      if (err.message?.includes("Unauthorized")) {
        setError("Authentication error. Please refresh and try again.")
      } else {
        setError(null) // hide error since we fell back to default
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectPreset = async (presetId: string, presetList?: SettingsPreset[]) => {
    if (presetId === "none") {
      setSelectedPreset(null)
      return
    }
    const list = presetList || presets
    const localPreset = list.find((p) => p.preset_id === presetId) as any

    if (localPreset && presetId === DEFAULT_PRESET.preset_id) {
      setSelectedPreset(localPreset)
      const config = localPreset.config || {}
      setCurrencyValues((config.currency_values || []).join(", "))
      setUomValues((config.uom_values || []).join(", "))
      setDateFormats((config.date_formats || []).join(", "))
      setStrictness(config.policies?.strictness || "balanced")
      setAllowAutofix(config.policies?.allow_autofix ?? true)
      setUnknownBehavior(config.policies?.unknown_column_behavior || "safe_cleanup_only")
      setPlaceholders((config.required_fields?.placeholders_treated_as_missing || []).join(", "))
      setStatusEnums((config.enum_sets?.status || []).join(", "))
      setMaxTextLen(config.thresholds?.text?.max_len_default ?? 255)
      if (config.required_columns) setRequiredColumns(config.required_columns)
      return
    }

    if (!authToken) return
    try {
      const response = await fileManagementAPI.getSettingsPreset(presetId, authToken)
      setSelectedPreset(response)
      const config = response.config || {}
      setCurrencyValues((config.currency_values || []).join(", "))
      setUomValues((config.uom_values || []).join(", "))
      setDateFormats((config.date_formats || []).join(", "))
      setStrictness(config.policies?.strictness || "balanced")
      setAllowAutofix(config.policies?.allow_autofix ?? true)
      setUnknownBehavior(config.policies?.unknown_column_behavior || "safe_cleanup_only")
      setPlaceholders((config.required_fields?.placeholders_treated_as_missing || []).join(", "))
      setStatusEnums((config.enum_sets?.status || []).join(", "))
      setMaxTextLen(config.thresholds?.text?.max_len_default ?? 255)
      if (config.required_columns) setRequiredColumns(config.required_columns)
    } catch (err) {
      console.error("Failed to load preset:", err)
    }
  }

  const buildConfigFromState = () => ({
    currency_values: currencyValues.split(",").map((s) => s.trim()).filter(Boolean),
    uom_values: uomValues.split(",").map((s) => s.trim()).filter(Boolean),
    date_formats: dateFormats.split(",").map((s) => s.trim()).filter(Boolean),
    policies: {
      allow_autofix: allowAutofix,
      strictness,
      unknown_column_behavior: unknownBehavior,
    },
    required_fields: {
      placeholders_treated_as_missing: placeholders.split(",").map((s) => s.trim()).filter(Boolean),
    },
    enum_sets: {
      status: statusEnums.split(",").map((s) => s.trim()).filter(Boolean),
    },
    thresholds: {
      text: {
        max_len_default: Number(maxTextLen) || 255,
      },
    },
    required_columns: requiredColumns,
  })

  const handleSaveOverrides = () => {
    const overrides = buildConfigFromState()
    setPresetOverrides(overrides)
    setEditMode(false)
  }

  const toggleRequired = (col: string) => {
    if (requiredColumns.includes(col)) {
      setRequiredColumns(requiredColumns.filter((c) => c !== col))
    } else {
      setRequiredColumns([...requiredColumns, col])
    }
  }

  const handleCreatePreset = async () => {
    if (!newPresetName.trim() || !authToken) return
    setIsLoading(true)
    try {
      let config = buildConfigFromState()
      if (copySourceId !== "current") {
        const source = presets.find((p) => p.preset_id === copySourceId)
        if (source?.config) config = source.config
      }
      const created = await fileManagementAPI.createSettingsPreset(
        newPresetName.trim(),
        config,
        authToken,
        false
      )
      await fetchPresets()
      const newId = created?.preset_id || newPresetName.trim().toLowerCase().replace(/\s+/g, "_")
      handleSelectPreset(newId)
      setShowNewPresetDialog(false)
      setNewPresetName("")
      setCopySourceId("current")
    } catch (err) {
      console.error("Failed to create preset", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePreset = async () => {
    if (!authToken || !selectedPreset || selectedPreset.preset_id === DEFAULT_PRESET.preset_id) return
    setIsLoading(true)
    try {
      const config = buildConfigFromState()
      await fileManagementAPI.updateSettingsPreset(
        selectedPreset.preset_id,
        { preset_name: selectedPreset.preset_name, config },
        authToken
      )
      await fetchPresets()
    } catch (err) {
      console.error("Failed to update preset", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePreset = async () => {
    if (!authToken || !selectedPreset || selectedPreset.preset_id === DEFAULT_PRESET.preset_id) return
    setIsLoading(true)
    try {
      await fileManagementAPI.deleteSettingsPreset(selectedPreset.preset_id, authToken)
      await fetchPresets()
      setSelectedPreset(null)
    } catch (err) {
      console.error("Failed to delete preset", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Settings Configuration</h2>
          <p className="text-sm text-muted-foreground mt-1">Select a preset or customize policy, lookups, thresholds, and required fields for this file.</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label className="text-sm mb-2 block">Settings Preset</Label>
          <Select value={selectedPreset?.preset_id || "none"} onValueChange={handleSelectPreset}>
            <SelectTrigger>
              <SelectValue placeholder="Select a preset..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">No preset (default rules)</span>
              </SelectItem>
              {presets.map((preset) => (
                <SelectItem key={preset.preset_id} value={preset.preset_id}>
                  <div className="flex items-center gap-2">
                    {preset.is_default && <Star className="w-3 h-3 text-yellow-500" />}
                    {preset.preset_name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 mt-6">
          <Button variant="outline" size="sm" onClick={() => setShowNewPresetDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Preset
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedPreset || selectedPreset.preset_id === DEFAULT_PRESET.preset_id || isLoading}
            onClick={handleUpdatePreset}
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Preset
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={!selectedPreset || selectedPreset.preset_id === DEFAULT_PRESET.preset_id || isLoading}
            onClick={handleDeletePreset}
          >
            Delete
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-destructive font-medium">Error loading presets</p>
            <p className="text-xs text-destructive/80 mt-1">{error}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchPresets}>
            Retry
          </Button>
        </div>
      )}

      {!error && !isLoading && presets.length === 0 && (
        <div className="bg-muted/40 border border-muted/60 rounded-lg p-4 text-sm text-muted-foreground">
          No presets available yet. Continue with default rules or create a new preset.
        </div>
      )}

      <div className="border border-muted rounded-xl p-5 space-y-4 bg-muted/10 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{selectedPreset ? selectedPreset.preset_name : "Default Settings"}</h3>
              <p className="text-xs text-muted-foreground">DQ policy + lookups + hygiene defaults</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditMode(!editMode)}>
            {editMode ? "Cancel" : "Edit"}
          </Button>
        </div>

        {editMode ? (
          <div className="space-y-5">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full mb-4">
                <TabsTrigger value="policies">Policies</TabsTrigger>
                <TabsTrigger value="lookups">Lookups</TabsTrigger>
                <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
                <TabsTrigger value="required">Required</TabsTrigger>
              </TabsList>

              <TabsContent value="policies" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Strictness</Label>
                    <Select value={strictness} onValueChange={setStrictness}>
                      <SelectTrigger><SelectValue placeholder="Select strictness" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lenient">Lenient</SelectItem>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="strict">Strict</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-2">Auto-fix</Label>
                    <Button type="button" variant="outline" className="w-full justify-between" onClick={() => setAllowAutofix(!allowAutofix)}>
                      <span>{allowAutofix ? "Enabled" : "Disabled"}</span>
                      {allowAutofix ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Unknown Column Behavior</Label>
                    <Select value={unknownBehavior} onValueChange={setUnknownBehavior}>
                      <SelectTrigger><SelectValue placeholder="Select behavior" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="safe_cleanup_only">Safe cleanup only</SelectItem>
                        <SelectItem value="quarantine">Quarantine unknowns</SelectItem>
                        <SelectItem value="ignore">Ignore</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="lookups" className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Currencies (comma-separated)</Label>
                    <Input value={currencyValues} onChange={(e) => setCurrencyValues(e.target.value)} placeholder="USD, EUR, GBP, INR..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">UOM (comma-separated)</Label>
                    <Input value={uomValues} onChange={(e) => setUomValues(e.target.value)} placeholder="EA, PCS, KG, LBS..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Status Enum (comma-separated)</Label>
                    <Input value={statusEnums} onChange={(e) => setStatusEnums(e.target.value)} placeholder="DRAFT, SUBMITTED, APPROVED..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Placeholders treated as missing</Label>
                    <Input value={placeholders} onChange={(e) => setPlaceholders(e.target.value)} placeholder="na, n/a, null, -, --" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="thresholds" className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Max text length</Label>
                    <Input type="number" min={1} value={maxTextLen} onChange={(e) => setMaxTextLen(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Date formats (comma-separated)</Label>
                    <Input value={dateFormats} onChange={(e) => setDateFormats(e.target.value)} placeholder="ISO, DMY, MDY" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="required" className="space-y-3">
                <p className="text-sm text-muted-foreground">Mark columns as required; they will be checked for null values.</p>
                {selectedColumns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Select columns first.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {selectedColumns.map((col) => (
                      <label key={col} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={requiredColumns.includes(col)}
                          onChange={() => toggleRequired(col)}
                          className="h-4 w-4"
                        />
                        <span>{col}</span>
                      </label>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end">
              <Button size="sm" onClick={handleSaveOverrides}>
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="border border-muted rounded-lg p-4 bg-white/60">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Shield className="w-4 h-4" /> Policies
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">Strictness: {strictness}</Badge>
                  <Badge variant={allowAutofix ? "default" : "outline"}>{allowAutofix ? "Auto-fix On" : "Auto-fix Off"}</Badge>
                  <Badge variant="outline">Unknown: {unknownBehavior}</Badge>
                </div>
              </div>
              <div className="border border-muted rounded-lg p-4 bg-white/60">
                <div className="text-sm font-medium mb-2">Lookups</div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Currencies:</span> {currencyValues || "n/a"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium text-foreground">UOM:</span> {uomValues || "n/a"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium text-foreground">Status:</span> {statusEnums || "n/a"}
                </p>
              </div>
              <div className="border border-muted rounded-lg p-4 bg-white/60">
                <div className="text-sm font-medium mb-2">Data Hygiene</div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Placeholders:</span> {placeholders || "n/a"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium text-foreground">Date formats:</span> {dateFormats || "n/a"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium text-foreground">Max text length:</span> {maxTextLen}
                </p>
              </div>
            </div>
            {!selectedPreset && <p className="text-muted-foreground text-sm">Using default validation rules</p>}
          </div>
        )}
      </div>



      <Dialog open={showNewPresetDialog} onOpenChange={setShowNewPresetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Preset</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Preset name (e.g., Automobile DQ Settings)"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
            />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Start from</Label>
              <Select value={copySourceId} onValueChange={setCopySourceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose source preset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current edits</SelectItem>
                  {presets.map((p) => (
                    <SelectItem key={p.preset_id} value={p.preset_id}>
                      {p.preset_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreatePreset} disabled={!newPresetName.trim() || isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Preset
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between pt-4 border-t border-muted/40">
        <Button variant="outline" onClick={prevStep}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={nextStep}>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

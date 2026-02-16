"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import {
  fetchFiles,
  resetFiles,
  updateFile,
  removeFile,
  selectFiles,
  selectFilesStatus,
} from "@/lib/features/files/filesSlice";
import {
  Upload,
  FileText,
  Loader2,
  Trash2,
  Eye,
  Search,
  Filter,
  Download,
  CloudUpload,
  Network,
  Play,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Brain,
  Sparkles,
  Menu,
  Columns,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/providers/auth-provider";
import { AuthGuard } from "@/components/auth/auth-guard";
import { MainLayout } from "@/components/layout/main-layout";
import {
  fileManagementAPI,
  type FileStatusResponse,
  type ProfilingResponse,
  type CustomRuleDefinition,
  type CustomRuleSuggestionResponse,
} from "@/lib/api/file-management-api";
import { cn, formatBytes, formatToIST } from "@/lib/utils";
import { DownloadFormatModal } from "@/components/files/download-format-modal";
import {
  ColumnExportContent,
  ColumnExportDialog,
} from "@/components/files/column-export-dialog";
import { ERPTransformationModal } from "@/components/files/erp-transformation-modal";
import { FileDetailsDialog } from "@/components/files/file-details-dialog";
import { WizardDialog } from "@/components/processing";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import QuickBooksImport from "@/components/quickbooks/quickbooks-import";
import ZohoBooksImport from "@/components/zoho/zoho-books-import";
import UnifiedBridgeImport from "@/components/unified-bridge/unified-bridge-import";
import CustomDestinationExport from "@/components/files/custom-destination-export";
import { PushToERPModal } from "@/components/files/push-to-erp-modal";
import { ColumnProfilingPanel } from "@/components/files/column-profiling-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RULE_IDS, getRuleMeta } from "@/lib/rule-metadata";
const STATUS_OPTIONS = [
  { label: "All", value: "all", type: "status" },
  { label: "Uploaded", value: "UPLOADED", type: "status" },
  { label: "Processed", value: "DQ_FIXED", type: "status" },
  { label: "Processing", value: "DQ_RUNNING", type: "status" },
  { label: "Queued", value: "QUEUED", type: "status" },
  { label: "Failed", value: "FAILED", type: "status" },
  { label: "separator", value: "separator", type: "separator" },
  { label: "Excellent (90-100%)", value: "excellent", type: "quality" },
  { label: "Good (70-90%)", value: "good", type: "quality" },
  { label: "Bad (<70%)", value: "bad", type: "quality" },
];

const SOURCE_OPTIONS = [
  { label: "Custom", value: "local" },
  { label: "Unified Bridge", value: "unified-bridge" },
  // { label: "ERP", value: "erp" },
];

const DESTINATION_OPTIONS = [
  { label: "None", value: "null" },
  { label: "Custom", value: "local" },
  { label: "Unified Bridge", value: "unified-bridge" },
  // { label: "ERP", value: "erp" },
];

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
];

const RULE_SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/10 text-red-700 border-red-500/20",
  warning: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  info: "bg-blue-500/10 text-blue-700 border-blue-500/20",
};

const getDqQuality = (
  score: number | null | undefined,
): "excellent" | "good" | "bad" | null => {
  if (typeof score !== "number") return null;
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  return "bad";
};

const getDqQualityLabel = (score: number | null | undefined): string => {
  const quality = getDqQuality(score);
  if (!quality) return "—";
  if (quality === "excellent") return "Excellent";
  if (quality === "good") return "Good";
  return "Bad";
};

export default function FilesPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <FilesPageContent />
      </MainLayout>
    </AuthGuard>
  );
}

function FilesPageContent() {
  const dispatch = useAppDispatch();
  // Use Redux state instead of local state
  const files = useAppSelector(selectFiles);
  const filesStatus = useAppSelector(selectFilesStatus);

  // Debug: Print API response (files list)
  useEffect(() => {
    console.log("API Response / Table Source Data:", files);
  }, [files]);

  const [loading, setLoading] = useState(false);
  const [isManualRefresh, setIsManualRefresh] = useState(false);

  // Sync local loading state with Redux status for compatibility
  useEffect(() => {
    setLoading(filesStatus === "loading");
  }, [filesStatus]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileStatusResponse | null>(
    null,
  );
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadModalFile, setDownloadModalFile] =
    useState<FileStatusResponse | null>(null);
  const [erpModalConfig, setErpModalConfig] = useState<{
    file: FileStatusResponse;
    format: "csv" | "excel" | "json";
  } | null>(null);
  const [showErpModal, setShowErpModal] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileStatusResponse | null>(
    null,
  );
  const [showPushToErpModal, setShowPushToErpModal] = useState(false);
  const [pushToErpFile, setPushToErpFile] = useState<FileStatusResponse | null>(
    null,
  );

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardFile, setWizardFile] = useState<FileStatusResponse | null>(null);

  // Profiling state
  const [profilingFileId, setProfilingFileId] = useState<string | null>(null);
  const [profilingData, setProfilingData] = useState<ProfilingResponse | null>(
    null,
  );
  const [loadingProfiling, setLoadingProfiling] = useState(false);
  const [pushQBModalOpen, setPushQBModalOpen] = useState(false);
  const [fileToPush, setFileToPush] = useState<FileStatusResponse | null>(null);
  const [activeSection, setActiveSection] = useState<"upload" | "explorer">(
    "upload",
  );
  const [selectedSource, setSelectedSource] = useState("local");
  const [selectedDestination, setSelectedDestination] = useState("null");
  const [lastActiveSelector, setLastActiveSelector] = useState<'source' | 'destination'>('source');
  const [selectedErp, setSelectedErp] = useState("quickbooks");

  // Helpers
  const updateUploadProgress = useCallback((value: number) => {
    // Clamp 0-100, round to 2 decimals to avoid long floating artefacts
    const clamped = Math.min(100, Math.max(0, value));
    setUploadProgress(Number(clamped.toFixed(2)));
  }, []);
  const [selectedDestinationErp, setSelectedDestinationErp] =
    useState("quickbooks");
  const [sortField, setSortField] = useState<
    "name" | "score" | "status" | "uploaded" | "updated"
  >("uploaded");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [columnModalFile, setColumnModalFile] =
    useState<FileStatusResponse | null>(null);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(),
  );
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [columnsError, setColumnsError] = useState<string | null>(null);
  const [selectionFileError, setSelectionFileError] = useState<string | null>(
    null,
  );
  const [displayColumnModalOpen, setDisplayColumnModalOpen] = useState(false);
  const [useCustomRules, setUseCustomRules] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set([
      "file",
      "score",
      "quality",
      "rows",
      "category",
      "status",
      "uploaded",
      "updated",
      "processingTime",
      "actions",
    ]),
  );
  const [selectedDestinationFormat, setSelectedDestinationFormat] = useState<
    string | null
  >(null);
  const [pendingVisibleColumns, setPendingVisibleColumns] = useState<
    Set<string>
  >(
    new Set([
      "file",
      "score",
      "quality",
      "rows",
      "category",
      "status",
      "uploaded",
      "updated",
      "processingTime",
      "actions",
    ]),
  );
  const [confirmColumnsOpen, setConfirmColumnsOpen] = useState(false);
  const [confirmColumns, setConfirmColumns] = useState<string[]>([]);
  const [confirmAllColumns, setConfirmAllColumns] = useState(false);
  const [selectionProfilingData, setSelectionProfilingData] =
    useState<ProfilingResponse | null>(null);
  const [selectionProfilingLoading, setSelectionProfilingLoading] =
    useState(false);
  const [selectionProfilingError, setSelectionProfilingError] = useState<
    string | null
  >(null);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [rulesConfirmed, setRulesConfirmed] = useState(false);
  const [globalDisabledRules, setGlobalDisabledRules] = useState<string[]>([]);
  const [requiredColumns, setRequiredColumns] = useState<Set<string>>(
    new Set(),
  );
  const [disableRulesByColumn, setDisableRulesByColumn] = useState<
    Record<string, string[]>
  >({});
  const [overrideRulesByColumn, setOverrideRulesByColumn] = useState<
    Record<string, string[]>
  >({});
  const [rulesDisableColumn, setRulesDisableColumn] = useState<string>("");
  const [rulesOverrideColumn, setRulesOverrideColumn] = useState<string>("");
  const [customRules, setCustomRules] = useState<CustomRuleDefinition[]>([]);
  const [customRuleColumn, setCustomRuleColumn] = useState<string>("");
  const [customRulePrompt, setCustomRulePrompt] = useState<string>("");
  const [customRuleSuggestion, setCustomRuleSuggestion] =
    useState<CustomRuleSuggestionResponse | null>(null);
  const [customRuleSuggesting, setCustomRuleSuggesting] = useState(false);
  const [customRuleSuggestError, setCustomRuleSuggestError] = useState<
    string | null
  >(null);

  // Column Export state (used in combined export dialog)
  const [showColumnExportModal, setShowColumnExportModal] = useState(false);
  const [columnExportFile, setColumnExportFile] =
    useState<FileStatusResponse | null>(null);
  const [columnExportColumns, setColumnExportColumns] = useState<string[]>([]);
  const [columnExportLoading, setColumnExportLoading] = useState(false);
  const [actionsDialogOpen, setActionsDialogOpen] = useState(false);
  const [actionsDialogFile, setActionsDialogFile] =
    useState<FileStatusResponse | null>(null);
  const [actionsErpMode, setActionsErpMode] = useState<"original" | "transform">(
    "original",
  );
  const [actionsErpTarget, setActionsErpTarget] = useState<string>("Oracle Fusion");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectionFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { idToken, hasPermission, permissionsLoaded } = useAuth();
  const canUseFilesActions = hasPermission("files");

  const showFilesPermissionDenied = useCallback(() => {
    toast({
      title: "Permission denied",
      description:
        "You do not have permission for this action. Contact your organization admin.",
      variant: "destructive",
    });
  }, [toast]);

  const ensureFilesPermission = useCallback(() => {
    if (hasPermission("files")) return true;
    showFilesPermissionDenied();
    return false;
  }, [hasPermission, showFilesPermissionDenied]);

  const renderRestrictedFilesPanel = useCallback(
    (content: React.ReactNode) => {
      if (canUseFilesActions) return content;
      return (
        <div className="relative">
          <div className="pointer-events-none select-none opacity-80 grayscale">
            {content}
          </div>
          <button
            type="button"
            aria-label="Permission restricted"
            className="absolute inset-0 z-10 cursor-not-allowed"
            onClick={showFilesPermissionDenied}
          />
        </div>
      );
    },
    [canUseFilesActions, showFilesPermissionDenied],
  );

  const renderRuleOption = (
    ruleId: string,
    checked: boolean,
    onCheckedChange: (checked: boolean) => void,
  ) => {
    const meta = getRuleMeta(ruleId);
    return (
      <label
        key={ruleId}
        className="flex items-start gap-3 rounded-md border border-muted/60 p-3"
      >
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(Boolean(value))}
        />
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{meta.name}</span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] h-5 px-2 uppercase",
                RULE_SEVERITY_STYLES[meta.severity] ||
                RULE_SEVERITY_STYLES.info,
              )}
            >
              {meta.severity}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{meta.description}</p>
          <p className="text-[10px] text-muted-foreground">Rule ID: {ruleId}</p>
        </div>
      </label>
    );
  };

  const loadFiles = useCallback(async (userInitiated = false) => {
    if (!idToken) return;
    if (permissionsLoaded && !hasPermission("files")) {
      dispatch(resetFiles());
      if (userInitiated) {
        ensureFilesPermission();
      }
      return;
    }
    // Dispatch global fetch action
    await dispatch(fetchFiles(idToken));
  }, [idToken, permissionsLoaded, hasPermission, dispatch, ensureFilesPermission]);

  useEffect(() => {
    loadFiles(false);
  }, [loadFiles]);

  const handleManualRefresh = useCallback(async () => {
    setIsManualRefresh(true);
    const startedAt = Date.now();
    try {
      await loadFiles(true);
      const elapsed = Date.now() - startedAt;
      const minSpinDurationMs = 450;
      if (elapsed < minSpinDurationMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, minSpinDurationMs - elapsed),
        );
      }
    } finally {
      setIsManualRefresh(false);
    }
  }, [loadFiles]);



  const filteredFiles = useMemo(() => files
    .filter((file) => {
      const name = (
        file.original_filename ||
        file.filename ||
        ""
      ).toLowerCase();
      const matchesSearch = name.includes(searchQuery.toLowerCase());

      // Check if statusFilter is a status or quality filter
      const filterOption = STATUS_OPTIONS.find(
        (opt) => opt.value === statusFilter,
      );
      if (!filterOption || filterOption.value === "all") {
        return matchesSearch;
      }

      if (filterOption.type === "status") {
        return matchesSearch && file.status === statusFilter;
      }

      if (filterOption.type === "quality") {
        const fileQuality = getDqQuality(file.dq_score);
        return matchesSearch && fileQuality === statusFilter;
      }

      return matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          const nameA = (a.original_filename || a.filename || "").toLowerCase();
          const nameB = (b.original_filename || b.filename || "").toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
        case "score":
          const scoreA = a.dq_score ?? -1;
          const scoreB = b.dq_score ?? -1;
          comparison = scoreA - scoreB;
          break;
        case "status":
          comparison = (a.status || "").localeCompare(b.status || "");
          break;
        case "uploaded":
          const uploadedA = new Date(
            a.uploaded_at || a.created_at || 0,
          ).getTime();
          const uploadedB = new Date(
            b.uploaded_at || b.created_at || 0,
          ).getTime();
          comparison = uploadedA - uploadedB;
          break;
        case "updated":
          const updatedA = new Date(
            a.updated_at || a.status_timestamp || 0,
          ).getTime();
          const updatedB = new Date(
            b.updated_at || b.status_timestamp || 0,
          ).getTime();
          comparison = updatedA - updatedB;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    }), [files, searchQuery, statusFilter, sortField, sortDirection]);

  const handleSort = (
    field: "name" | "score" | "status" | "uploaded" | "updated",
  ) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({
    field,
  }: {
    field: "name" | "score" | "status" | "uploaded" | "updated";
  }) => {
    if (sortField !== field)
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  const handleFileUpload = async (file: File) => {
    if (!ensureFilesPermission()) {
      return;
    }

    if (!idToken) {
      toast({
        title: "Error",
        description: "Not authenticated",
        variant: "destructive",
      });
      return;
    }

    const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
    const validExtensions = [".csv", ".xlsx", ".xls", ".json"];

    if (!validExtensions.includes(extension)) {
      toast({
        title: "Invalid file",
        description: "Please upload a CSV, Excel, or JSON file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const finalStatus = await fileManagementAPI.uploadFileComplete(
        file,
        idToken,
        useAI,
        (progress) => updateUploadProgress(progress),
        (status) => {
          // Use Redux action to update store
          dispatch(updateFile(status));
        },
        false, // Don't auto-process
      );

      toast({
        title: "Upload Complete",
        description:
          "File uploaded successfully. Click the play button to start processing.",
      });

      await loadFiles();
    } catch (error) {
      console.error("Upload failed:", error);
      const message =
        error instanceof Error ? error.message.toLowerCase() : "";
      toast({
        title: message.includes("permission denied")
          ? "Permission denied"
          : "Upload failed",
        description: message.includes("permission denied")
          ? "You do not have permission for this action. Contact your organization admin."
          : "Please try again",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      updateUploadProgress(0);
    }
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrag = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true);
    } else if (event.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleViewDetails = (file: FileStatusResponse) => {
    setSelectedFile(file);
    setDetailsOpen(true);
  };

  const handlePushToQuickBooks = (file: FileStatusResponse) => {
    if (!ensureFilesPermission()) return;
    setFileToPush(file);
    setPushQBModalOpen(true);
  };

  const handleQuickBooksImportComplete = async (uploadId: string) => {
    // Refresh file list - user will manually start processing
    loadFiles();
    toast({
      title: "Import Complete",
      description:
        "File imported successfully. Click the play button to start processing.",
    });
  };

  const doStartProcessing = async (
    file: FileStatusResponse,
    cols?: string[],
  ) => {
    if (!idToken) return;
    if (!ensureFilesPermission()) return;

    try {
      await fileManagementAPI.startProcessing(file.upload_id, idToken, {
        selected_columns: cols,
        required_columns: Array.from(requiredColumns),
        global_disabled_rules: globalDisabledRules,
        disable_rules: disableRulesByColumn,
        column_rules_override: overrideRulesByColumn,
        custom_rules: customRules,
      });
      toast({
        title: "Processing Started",
        description: `Starting data quality processing for ${file.original_filename || file.filename}...`,
      });
      loadFiles();
    } catch (error) {
      console.error("Processing failed:", error);
      toast({
        title: "Processing Failed",
        description: "Failed to start data quality processing",
        variant: "destructive",
      });
    }
  };

  const handleStartProcessing = async (file: FileStatusResponse) => {
    if (!idToken) return;
    if (!ensureFilesPermission()) return;
    setWizardFile(file);
    setWizardOpen(true);
  };

  const handleWizardOpenChange = (open: boolean) => {
    setWizardOpen(open);
    if (!open) {
      setWizardFile(null);
    }
  };

  const handleWizardComplete = () => {
    loadFiles();
    if (wizardFile) {
      setSelectedFile(wizardFile);
      setDetailsOpen(true);
    }
    setWizardOpen(false);
    setWizardFile(null);
  };

  const handleColumnConfirm = async () => {
    if (!columnModalFile || !idToken) return;

    const cols =
      availableColumns.length === 0
        ? undefined
        : Array.from(selectedColumns.values());

    if (availableColumns.length > 0 && (!cols || cols.length === 0)) {
      toast({
        title: "Select at least one column",
        description: "Choose the columns to process or cancel.",
        variant: "destructive",
      });
      return;
    }

    setConfirmColumns(cols ?? []);
    setConfirmAllColumns(!cols || cols.length === 0);
    setConfirmColumnsOpen(true);
    setColumnModalOpen(false);
  };

  const handleColumnCancel = () => {
    setColumnModalOpen(false);
    setColumnModalFile(null);
    setSelectedColumns(new Set());
    setAvailableColumns([]);
    setColumnsError(null);
    setSelectionFileError(null);
    setSelectionProfilingData(null);
    setSelectionProfilingError(null);
    setSelectionProfilingLoading(false);
  };

  const handleOpenRulesDialog = () => {
    setRulesDialogOpen(true);
  };

  const handleCloseRulesDialog = () => {
    setRulesDialogOpen(false);
  };

  const handleConfirmRulesDialog = () => {
    setRulesConfirmed(true);
    setRulesDialogOpen(false);
  };

  const handleGenerateCustomRule = async () => {
    if (!columnModalFile || !idToken) return;
    if (!customRuleColumn) {
      toast({
        title: "Select a column",
        description: "Choose the column to apply the custom check.",
        variant: "destructive",
      });
      return;
    }
    if (!customRulePrompt.trim()) {
      toast({
        title: "Enter a prompt",
        description: "Describe the validation rule you want to create.",
        variant: "destructive",
      });
      return;
    }

    setCustomRuleSuggesting(true);
    setCustomRuleSuggestError(null);
    try {
      const response = await fileManagementAPI.suggestCustomRule(
        columnModalFile.upload_id,
        idToken,
        {
          column: customRuleColumn,
          prompt: customRulePrompt.trim(),
        },
      );
      setCustomRuleSuggestion(response);
      if (response.error) {
        setCustomRuleSuggestError(response.error);
      }
    } catch (error) {
      console.error("Custom rule suggestion failed:", error);
      setCustomRuleSuggestError("Failed to generate rule suggestion.");
    } finally {
      setCustomRuleSuggesting(false);
    }
  };

  const handleApproveCustomRule = () => {
    const suggestion = customRuleSuggestion?.suggestion;
    if (!suggestion || customRuleSuggestion?.executable === false) {
      return;
    }

    const ruleId =
      suggestion.rule_id?.toUpperCase() ||
      `CUST_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    const nextRule: CustomRuleDefinition = {
      ...suggestion,
      rule_id: ruleId,
      column: customRuleColumn,
    };
    setCustomRules((prev) => [...prev, nextRule]);
    setCustomRuleSuggestion(null);
    setCustomRulePrompt("");
  };

  const handleRemoveCustomRule = (ruleId?: string) => {
    if (!ruleId) return;
    setCustomRules((prev) => prev.filter((rule) => rule.rule_id !== ruleId));
  };

  const toggleRuleInList = (
    rules: string[],
    ruleId: string,
    checked: boolean,
  ) => {
    const normalized = ruleId.toUpperCase();
    if (checked) {
      return rules.includes(normalized) ? rules : [...rules, normalized];
    }
    return rules.filter((r) => r !== normalized);
  };

  const getSuggestedRules = (column: string) => {
    const profile = selectionProfilingData?.profiles?.[column];
    if (!profile?.rules) return [];
    return profile.rules.map((r) => r.rule_id.toUpperCase());
  };

  const handleToggleGlobalRule = (ruleId: string, checked: boolean) => {
    setGlobalDisabledRules((prev) => toggleRuleInList(prev, ruleId, checked));
  };

  const handleToggleRequiredColumn = (col: string, checked: boolean) => {
    setRequiredColumns((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(col);
      } else {
        next.delete(col);
      }
      return next;
    });
  };

  const handleSelectDisableColumn = (col: string) => {
    setRulesDisableColumn(col);
    if (!disableRulesByColumn[col]) {
      setDisableRulesByColumn((prev) => ({ ...prev, [col]: [] }));
    }
  };

  const handleSelectOverrideColumn = (col: string) => {
    setRulesOverrideColumn(col);
    if (!overrideRulesByColumn[col]) {
      const suggested = getSuggestedRules(col);
      setOverrideRulesByColumn((prev) => ({ ...prev, [col]: suggested }));
    }
  };

  const handleToggleDisableRule = (
    col: string,
    ruleId: string,
    checked: boolean,
  ) => {
    setDisableRulesByColumn((prev) => {
      const current = prev[col] || [];
      return { ...prev, [col]: toggleRuleInList(current, ruleId, checked) };
    });
  };

  const handleToggleOverrideRule = (
    col: string,
    ruleId: string,
    checked: boolean,
  ) => {
    setOverrideRulesByColumn((prev) => {
      const current = prev[col] || [];
      return { ...prev, [col]: toggleRuleInList(current, ruleId, checked) };
    });
  };

  const handleToggleColumn = (col: string, checked: boolean) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(col);
      } else {
        next.delete(col);
      }
      return next;
    });
  };

  const handleToggleAllColumns = (checked: boolean) => {
    setSelectedColumns(checked ? new Set(availableColumns) : new Set());
  };

  const calculateProcessingTime = (
    uploadedAt: string | null | undefined,
    updatedAt: string | null | undefined,
  ): string => {
    if (!uploadedAt || !updatedAt) return "—";

    const uploadTime = new Date(uploadedAt).getTime();
    const updateTime = new Date(updatedAt).getTime();
    const diffMs = updateTime - uploadTime;

    if (diffMs < 0) return "—";

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };
  const handleConfirmColumnsCancel = () => {
    setConfirmColumnsOpen(false);
    setConfirmColumns([]);
    setConfirmAllColumns(false);
    setColumnModalOpen(true);
  };

  const handleConfirmColumnsProceed = async () => {
    if (!columnModalFile || !idToken) return;
    const cols = confirmAllColumns ? undefined : confirmColumns;
    setConfirmColumnsOpen(false);
    await doStartProcessing(columnModalFile, cols);
    setColumnModalFile(null);
    setSelectedColumns(new Set());
    setAvailableColumns([]);
    setSelectionFileError(null);
    setConfirmColumns([]);
    setConfirmAllColumns(false);
  };

  const normalizeColumnName = (name: string) => name.trim();

  const applySelection = (mode: "include" | "exclude", cols: string[]) => {
    if (!availableColumns.length) return;

    const normalizedSet = new Set(
      cols.map(normalizeColumnName).filter(Boolean),
    );
    let next: Set<string>;

    if (mode === "include") {
      next = new Set(
        availableColumns.filter((c) =>
          normalizedSet.has(normalizeColumnName(c)),
        ),
      );
    } else {
      next = new Set(
        availableColumns.filter(
          (c) => !normalizedSet.has(normalizeColumnName(c)),
        ),
      );
    }

    if (next.size === 0) {
      setSelectionFileError(
        "Selection file resulted in zero columns. Please adjust and try again.",
      );
      return;
    }

    setSelectionFileError(null);
    setSelectedColumns(next);
    toast({
      title: "Selection applied",
      description: `${mode === "include" ? "Included" : "Excluded"} ${next.size} column(s) based on file.`,
    });
  };

  const parseSelectionJson = (
    text: string,
  ): { mode: "include" | "exclude"; columns: string[] } | null => {
    try {
      const obj = JSON.parse(text);
      if (Array.isArray(obj?.columns)) {
        const mode = obj.mode === "exclude" ? "exclude" : "include";
        return {
          mode,
          columns: obj.columns.map((c: any) =>
            String(c.name ?? c.column ?? c).trim(),
          ),
        };
      }
      if (Array.isArray(obj)) {
        return {
          mode: "include",
          columns: obj.map((c: any) => String(c).trim()),
        };
      }
    } catch (e) {
      console.error("Failed to parse JSON selection file", e);
    }
    return null;
  };

  const parseSelectionRows = (
    rows: any[][],
  ): { mode: "include" | "exclude"; columns: string[] } | null => {
    if (!rows.length) return null;
    const header = rows[0].map((h: any) =>
      String(h || "")
        .toLowerCase()
        .trim(),
    );
    const nameIdx = header.findIndex((h: string) =>
      ["name", "column", "column_name"].includes(h),
    );
    const includeIdx = header.findIndex((h: string) =>
      ["include", "selected", "select"].includes(h),
    );
    if (nameIdx === -1 || includeIdx === -1) return null;

    const truthy = new Set(["true", "1", "yes", "y", "include"]);
    const selected: string[] = [];
    rows.slice(1).forEach((row) => {
      const colName = String(row[nameIdx] ?? "").trim();
      if (!colName) return;
      const includeVal = String(row[includeIdx] ?? "")
        .toLowerCase()
        .trim();
      if (truthy.has(includeVal)) selected.push(colName);
    });
    return { mode: "include", columns: selected };
  };

  const handleSelectionFile = async (file: File) => {
    setSelectionFileError(null);
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    try {
      if (ext === "json") {
        const text = await file.text();
        const parsed = parseSelectionJson(text);
        if (parsed) {
          applySelection(parsed.mode, parsed.columns);
          return;
        }
      } else if (ext === "csv") {
        const text = await file.text();
        const rows = text
          .split(/\r?\n/)
          .filter((line) => line.trim() !== "")
          .map((line) => line.split(","));
        const parsed = parseSelectionRows(rows);
        if (parsed) {
          applySelection(parsed.mode, parsed.columns);
          return;
        }
      } else if (ext === "xlsx" || ext === "xls") {
        const XLSX = await import("xlsx");
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        const parsed = parseSelectionRows(rows);
        if (parsed) {
          applySelection(parsed.mode, parsed.columns);
          return;
        }
      }
      setSelectionFileError(
        "Could not understand selection file. Use columns with 'name' and 'include'.",
      );
    } catch (error) {
      console.error("Failed to apply selection file", error);
      setSelectionFileError(
        "Unable to apply selection file. Please check the format and try again.",
      );
    }
  };

  const handleSelectionFileInput = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleSelectionFile(file);
    }
    // reset so same file can be re-selected
    if (selectionFileInputRef.current) {
      selectionFileInputRef.current.value = "";
    }
  };

  const handleViewProfiling = async (fileId: string) => {
    setProfilingFileId(fileId);
    setLoadingProfiling(true);
    setProfilingData(null);

    try {
      if (!idToken) return;
      const data = await fileManagementAPI.getColumnProfiling(fileId, idToken);
      setProfilingData(data);
    } catch (error) {
      console.error("Failed to load profiling data:", error);
      toast({
        title: "Error",
        description: "Failed to load column profiling data",
        variant: "destructive",
      });
      setProfilingFileId(null);
    } finally {
      setLoadingProfiling(false);
    }
  };

  const handleDeleteClick = (file: FileStatusResponse) => {
    setFileToDelete(file);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete || !idToken) return;
    if (!ensureFilesPermission()) return;

    setDeleting(fileToDelete.upload_id);
    setShowDeleteModal(false);

    try {
      await fileManagementAPI.deleteUpload(fileToDelete.upload_id, idToken);
      toast({
        title: "File deleted",
        description: "File removed successfully",
      });
      await loadFiles();
    } catch (error) {
      console.error("Delete error:", error);
      const message =
        error instanceof Error &&
        error.message.toLowerCase().includes("permission denied")
          ? "You do not have permission for this action. Contact your organization admin."
          : "Unable to delete file";
      toast({
        title: "Delete failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
      setFileToDelete(null);
    }
  };

  const handleDownloadClick = (file: FileStatusResponse) => {
    if (!ensureFilesPermission()) return;
    setDownloadModalFile(file);
    setShowDownloadModal(true);
  };

  const openActionsDialog = (file: FileStatusResponse) => {
    if (!ensureFilesPermission()) return;
    setActionsDialogFile(file);
    setColumnExportFile(file);
    setActionsDialogOpen(true);
    void handleColumnExportClick(file);
  };

  const handleColumnExportClick = async (file: FileStatusResponse) => {
    if (!idToken) return;
    if (!ensureFilesPermission()) return;

    setColumnExportFile(file);
    setColumnExportLoading(true);

    try {
      // Fetch columns from the file
      const resp = await fileManagementAPI.getFileColumns(
        file.upload_id,
        idToken,
      );
      setColumnExportColumns(resp.columns || []);
    } catch (error) {
      console.error("Failed to fetch columns for export:", error);
      // Try to get columns from preview as fallback
      try {
        const preview = await fileManagementAPI.getFilePreview(
          file.upload_id,
          idToken,
        );
        setColumnExportColumns(preview.headers || []);
      } catch (previewError) {
        console.error("Failed to get columns from preview:", previewError);
        setColumnExportColumns([]);
        toast({
          title: "Warning",
          description:
            "Could not load column list. Export may not work correctly.",
          variant: "destructive",
        });
      }
    } finally {
      setColumnExportLoading(false);
    }
  };

  const handleColumnExport = async (options: {
    format: "csv" | "excel" | "json";
    dataType: "all" | "clean" | "quarantine";
    columns: string[];
    columnMapping: Record<string, string>;
  }) => {
    if (!columnExportFile || !idToken) return;
    if (!ensureFilesPermission()) return;

    setDownloading(columnExportFile.upload_id);

    try {
      const exportResult = await fileManagementAPI.exportWithColumns(
        columnExportFile.upload_id,
        idToken,
        {
          format: options.format,
          data: options.dataType,
          columns: options.columns,
          columnMapping: options.columnMapping,
        },
      );

      const baseFilename = (
        columnExportFile.original_filename ||
        columnExportFile.filename ||
        "file"
      ).replace(/\.[^/.]+$/, "");
      const extension =
        options.format === "excel"
          ? ".xlsx"
          : options.format === "json"
            ? ".json"
            : ".csv";
      const filename = `${baseFilename}_export${extension}`;

      const link = document.createElement("a");
      if (exportResult.blob) {
        const url = URL.createObjectURL(exportResult.blob);
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (exportResult.downloadUrl) {
        link.href = exportResult.downloadUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error("No downloadable export payload received");
      }

      toast({
        title: "Export Complete",
        description: `Exported ${options.columns.length} columns with ${Object.keys(options.columnMapping).length} renamed`,
      });

      setActionsDialogOpen(false);
      setColumnExportFile(null);
    } catch (error) {
      console.error("Column export error:", error);
      toast({
        title: "Export Failed",
        description: "Unable to export file with selected columns",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleColumnExportWithErp = async (options: {
    format: "csv" | "excel" | "json";
    dataType: "all" | "clean" | "quarantine";
    columns: string[];
    columnMapping: Record<string, string>;
  }) => {
    if (!columnExportFile || !idToken) return;
    if (!ensureFilesPermission()) return;

    setDownloading(columnExportFile.upload_id);

    try {
      const exportResult = await fileManagementAPI.exportWithColumns(
        columnExportFile.upload_id,
        idToken,
        {
          format: options.format,
          data: options.dataType,
          columns: options.columns,
          columnMapping: options.columnMapping,
          erp: actionsErpMode === "transform" ? actionsErpTarget : undefined,
        },
      );

      const baseFilename = (
        columnExportFile.original_filename ||
        columnExportFile.filename ||
        "file"
      ).replace(/\.[^/.]+$/, "");
      const extension =
        options.format === "excel"
          ? ".xlsx"
          : options.format === "json"
            ? ".json"
            : ".csv";
      const filename = `${baseFilename}_erp${extension}`;

      const link = document.createElement("a");
      if (exportResult.blob) {
        const url = URL.createObjectURL(exportResult.blob);
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (exportResult.downloadUrl) {
        link.href = exportResult.downloadUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error("No downloadable export payload received");
      }

      toast({
        title: "ERP Export Complete",
        description:
          actionsErpMode === "transform"
            ? `Exported with ${actionsErpTarget} formatting`
            : "Exported in original format",
      });
      setActionsDialogOpen(false);
    } catch (error) {
      console.error("ERP export error:", error);
      const message =
        error instanceof Error &&
        error.message.toLowerCase().includes("permission denied")
          ? "You do not have permission for this action. Contact your organization admin."
          : "Unable to export ERP file";
      toast({
        title: "ERP Export Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleFormatSelected = (
    format: "csv" | "excel" | "json",
    dataType: "original" | "clean",
  ) => {
    if (!downloadModalFile) return;
    if (!ensureFilesPermission()) return;
    setShowDownloadModal(false);

    if (dataType === "clean") {
      setErpModalConfig({ file: downloadModalFile, format });
      setShowErpModal(true);
    } else {
      handleDirectDownload(downloadModalFile, format, dataType);
    }
  };

  const handleDirectDownload = async (
    file: FileStatusResponse,
    format: "csv" | "excel" | "json",
    dataType: "original" | "clean",
  ) => {
    if (!idToken) return;
    if (!ensureFilesPermission()) return;

    setDownloadingFormat(`${file.upload_id}-${format}`);
    setDownloading(file.upload_id);

    try {
      const exportResult = await fileManagementAPI.exportWithColumns(
        file.upload_id,
        idToken,
        {
          format,
          data: dataType === "original" ? "raw" : "clean",
        },
      );

      const baseFilename = (
        file.original_filename ||
        file.filename ||
        "file"
      ).replace(/\.[^/.]+$/, "");
      const extension =
        format === "excel" ? ".xlsx" : format === "json" ? ".json" : ".csv";
      const dataSuffix = dataType === "original" ? "_original" : "_clean";
      const filename = `${baseFilename}${dataSuffix}${extension}`;

      const link = document.createElement("a");
      if (exportResult.blob) {
        const url = URL.createObjectURL(exportResult.blob);
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (exportResult.downloadUrl) {
        link.href = exportResult.downloadUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error("No downloadable export payload received");
      }

      toast({ title: "Success", description: "File downloaded" });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Unable to download file",
        variant: "destructive",
      });
    } finally {
      setDownloadingFormat(null);
      setDownloading(null);
    }
  };

  const handleDownloadWithErp = async (
    targetErp: string | null,
    dataType: "clean" | "quarantine" | "all" = "all",
  ) => {
    if (!erpModalConfig || !idToken) return;
    if (!ensureFilesPermission()) return;

    const { file, format } = erpModalConfig;
    setDownloadingFormat(`${file.upload_id}-${format}`);
    setDownloading(file.upload_id);
    setShowErpModal(false);

    try {
      const exportResult = await fileManagementAPI.exportWithColumns(
        file.upload_id,
        idToken,
        {
          format,
          data: dataType,
          erp: targetErp || undefined,
        },
      );

      const baseFilename = (
        file.original_filename ||
        file.filename ||
        "file"
      ).replace(/\.[^/.]+$/, "");
      const extension =
        format === "excel" ? ".xlsx" : format === "json" ? ".json" : ".csv";
      const erpSuffix = targetErp
        ? `_${targetErp.replace(/\s+/g, "_").toLowerCase()}`
        : "";
      const dataTypeSuffix =
        dataType === "clean"
          ? "_clean"
          : dataType === "quarantine"
            ? "_quarantined"
            : "_full";
      const filename = `${baseFilename}${dataTypeSuffix}${erpSuffix}${extension}`;

      const link = document.createElement("a");
      if (exportResult.blob) {
        const url = URL.createObjectURL(exportResult.blob);
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (exportResult.downloadUrl) {
        link.href = exportResult.downloadUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error("No downloadable export payload received");
      }

      toast({
        title: "Success",
        description: targetErp
          ? `Downloaded with ${targetErp}`
          : "File downloaded",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Unable to download file",
        variant: "destructive",
      });
    } finally {
      setDownloadingFormat(null);
      setDownloading(null);
      setErpModalConfig(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "DQ_FIXED":
      case "COMPLETED":
        return "bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-400 border-green-300 dark:border-green-500/30";
      case "FAILED":
      case "DQ_FAILED":
      case "REJECTED":
        return "bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400 border-red-300 dark:border-red-500/30";
      case "DQ_RUNNING":
      case "NORMALIZING":
        return "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-500/30";
      case "QUEUED":
      case "UPLOADED":
      case "DQ_DISPATCHED":
        return "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30";
      default:
        return "bg-gray-100 dark:bg-gray-500/20 text-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-500/30";
    }
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) {
      return "bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-400 border-green-300 dark:border-green-500/30";
    } else if (score >= 70) {
      return "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30";
    } else {
      return "bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400 border-red-300 dark:border-red-500/30";
    }
  };

  const tableEmpty = filteredFiles.length === 0;

  // Intent-based rendering mode
  // - 'export': Last active selector is destination AND destination !== 'null'
  // - 'import': Otherwise (source is always valid)
  const pageMode: 'import' | 'export' =
    lastActiveSelector === 'destination' && selectedDestination !== 'null'
      ? 'export'
      : 'import';

  return (
    <TooltipProvider>
      <div className="space-y-4 p-3 sm:p-0">
        {/* Segmented Tab Navigation */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border bg-muted p-1 flex-1 sm:flex-none">
            <button
              onClick={() => setActiveSection("upload")}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-md px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-all flex-1 sm:flex-none",
                activeSection === "upload"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Upload className="h-4 w-4" />
              <span className="hidden xs:inline">File</span> Upload
            </button>
            <button
              onClick={() => setActiveSection("explorer")}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-md px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-all flex-1 sm:flex-none",
                activeSection === "explorer"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FileText className="h-4 w-4" />
              <span className="hidden xs:inline">File</span> Explorer
              {files.length > 0 && (
                <span className="ml-1 rounded-full bg-muted-foreground/20 px-1.5 sm:px-2 py-0.5 text-xs">
                  {files.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* File Upload Section */}
        {activeSection === "upload" && (
          <div className="space-y-4">
            {/* Header Row: Source selector + ERP dropdown */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground shrink-0">
                    Source:
                  </span>
                  <Select
                    value={selectedSource}
                    onValueChange={(value) => {
                      setSelectedSource(value);
                      setLastActiveSelector('source');
                      console.log(`Selected Source: ${value}`);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[180px] h-9">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSource === "erp" && (
                    <Select value={selectedErp} onValueChange={setSelectedErp}>
                      <SelectTrigger className="w-full sm:w-[180px] h-9">
                        <SelectValue placeholder="Select ERP" />
                      </SelectTrigger>
                      <SelectContent>
                        {ERP_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground shrink-0">
                    Destination:
                  </span>
                  <Select
                    value={selectedDestination}
                    onValueChange={(value) => {
                      setSelectedDestination(value);
                      if (value !== 'null') {
                        setLastActiveSelector('destination');
                      }
                      console.log(`Selected Destination: ${value}`);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[180px] h-9">
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {DESTINATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selectedDestination !== "null" &&
                selectedDestination === "local" && (
                  <Button
                    size="sm"
                    className="gap-2"
                    variant={selectedDestinationFormat ? "default" : "outline"}
                    disabled={!selectedDestinationFormat}
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                )}
            </div>

            {/* Content Area - Rendering based on derived pageMode */}
            {pageMode === 'import' ? (
              // ========= SOURCE/IMPORT SECTION =========
              <div className="space-y-4">
                {selectedSource === "local" ? (
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl border-2 border-dashed min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] p-6 sm:p-12 lg:p-20 transition-all cursor-pointer",
                      dragActive
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50",
                    )}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => {
                      if (uploading) return;
                      if (!ensureFilesPermission()) return;
                      fileInputRef.current?.click();
                    }}
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center gap-4 sm:gap-6 lg:gap-8">
                        <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20 animate-spin text-primary" />
                        <div className="text-center">
                          <p className="text-base sm:text-lg font-medium">
                            Uploading...
                          </p>
                          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mt-1 sm:mt-2">
                            {uploadProgress.toFixed(2)}%
                          </p>
                        </div>
                        <Progress
                          value={uploadProgress}
                          className="w-48 sm:w-60 lg:w-72 h-2 sm:h-3"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 sm:gap-4 lg:gap-6 text-center">
                        <div className="rounded-full bg-primary/10 p-4 sm:p-6 lg:p-8">
                          <Upload className="h-8 w-8 sm:h-12 sm:w-12 lg:h-16 lg:w-16 text-primary" />
                        </div>
                        <div className="space-y-1 sm:space-y-2">
                          <p className="text-base sm:text-lg lg:text-xl font-medium">
                            Upload your data for transformation
                          </p>
                          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
                            Drag & drop or click to browse
                          </p>
                        </div>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls,.json,.sql"
                      className="hidden"
                      onChange={handleFileInput}
                    />
                  </div>
                ) : selectedSource === "unified-bridge" ? (
                  renderRestrictedFilesPanel(
                    <div className="min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] rounded-xl border bg-card p-4">
                      <UnifiedBridgeImport
                        mode="source"
                        onImportComplete={handleQuickBooksImportComplete}
                        onPermissionDenied={showFilesPermissionDenied}
                        onNotification={(message, type) => {
                          toast({
                            title: type === "success" ? "Success" : "Error",
                            description: message,
                            variant: type === "error" ? "destructive" : "default",
                          });
                        }}
                      />
                    </div>,
                  )
                ) : selectedSource === "erp" && selectedErp === "quickbooks" ? (
                  renderRestrictedFilesPanel(
                    <div className="min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]">
                      <QuickBooksImport
                        mode="source"
                        onImportComplete={handleQuickBooksImportComplete}
                        onPermissionDenied={showFilesPermissionDenied}
                        onNotification={(message, type) => {
                          toast({
                            title: type === "success" ? "Success" : "Error",
                            description: message,
                            variant: type === "error" ? "destructive" : "default",
                          });
                        }}
                      />
                    </div>,
                  )
                ) : selectedSource === "erp" && selectedErp === "zoho-books" ? (
                  renderRestrictedFilesPanel(
                    <div className="min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]">
                      <ZohoBooksImport
                        mode="source"
                        onImportComplete={handleQuickBooksImportComplete}
                        onPermissionDenied={showFilesPermissionDenied}
                        onNotification={(message, type) => {
                          toast({
                            title: type === "success" ? "Success" : "Error",
                            description: message,
                            variant: type === "error" ? "destructive" : "default",
                          });
                        }}
                      />
                    </div>,
                  )
                ) : selectedSource === "erp" ? (
                  <div className="flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] p-6 sm:p-12 lg:p-20 border-2 border-dashed rounded-xl bg-muted/5">
                    <div className="rounded-full bg-muted p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8">
                      <Network className="h-8 w-8 sm:h-12 sm:w-12 lg:h-16 lg:w-16 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-medium mb-2 sm:mb-3 lg:mb-4 text-center">
                      {ERP_OPTIONS.find((e) => e.value === selectedErp)?.label}
                    </h3>
                    <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-6 sm:mb-8 lg:mb-10 max-w-lg text-center px-4">
                      Connect your{" "}
                      {ERP_OPTIONS.find((e) => e.value === selectedErp)?.label}{" "}
                      account to import data directly.
                    </p>
                    <Button
                      disabled
                      size="lg"
                      className="px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-base"
                    >
                      Connect
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 sm:gap-4 lg:gap-6 text-center">
                    <div className="rounded-full bg-primary/10 p-4 sm:p-6 lg:p-8">
                      <Upload className="h-8 w-8 sm:h-12 sm:w-12 lg:h-16 lg:w-16 text-primary" />
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <p className="text-base sm:text-lg lg:text-xl font-medium">
                        Upload your data for transformation
                      </p>
                      <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
                        Drag & drop or click to browse
                      </p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.json,.sql"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>
            ) : pageMode === 'export' ? (
              // ========= DESTINATION/EXPORT SECTION =========
              <div className="space-y-4">
                {selectedDestination === "local" ? (
                  renderRestrictedFilesPanel(
                    <CustomDestinationExport
                      selectedFormat={selectedDestinationFormat}
                      onFormatChange={setSelectedDestinationFormat}
                      onPermissionDenied={showFilesPermissionDenied}
                    />,
                  )
                ) : selectedDestination === "unified-bridge" ? (
                  renderRestrictedFilesPanel(
                    <div className="min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] rounded-xl border bg-card p-4">
                      <UnifiedBridgeImport
                        mode="destination"
                        onImportComplete={handleQuickBooksImportComplete}
                        onPermissionDenied={showFilesPermissionDenied}
                        onNotification={(message, type) => {
                          toast({
                            title: type === "success" ? "Success" : "Error",
                            description: message,
                            variant: type === "error" ? "destructive" : "default",
                          });
                        }}
                      />
                    </div>,
                  )
                ) : selectedDestination === "erp" &&
                  selectedDestinationErp === "quickbooks" ? (
                  renderRestrictedFilesPanel(
                    <div className="min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] rounded-xl border bg-card p-4">
                      <QuickBooksImport
                        mode="destination"
                        onPermissionDenied={showFilesPermissionDenied}
                        onNotification={(message, type) => {
                          toast({
                            title: type === "success" ? "Success" : "Error",
                            description: message,
                            variant: type === "error" ? "destructive" : "default",
                          });
                        }}
                      />
                    </div>,
                  )
                ) : selectedDestination === "erp" &&
                  selectedDestinationErp === "zoho-books" ? (
                  renderRestrictedFilesPanel(
                    <div className="min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] rounded-xl border bg-card p-4">
                      <ZohoBooksImport
                        mode="destination"
                        onPermissionDenied={showFilesPermissionDenied}
                        onNotification={(message, type) => {
                          toast({
                            title: type === "success" ? "Success" : "Error",
                            description: message,
                            variant: type === "error" ? "destructive" : "default",
                          });
                        }}
                      />
                    </div>,
                  )
                ) : selectedDestination === "erp" ? (
                  <div className="flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] p-6 sm:p-12 lg:p-20 border-2 border-dashed rounded-xl bg-muted/5">
                    <div className="rounded-full bg-muted p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8">
                      <Network className="h-8 w-8 sm:h-12 sm:w-12 lg:h-16 lg:w-16 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-medium mb-2 sm:mb-3 lg:mb-4 text-center">
                      {
                        ERP_OPTIONS.find(
                          (e) => e.value === selectedDestinationErp,
                        )?.label
                      }
                    </h3>
                    <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-6 sm:mb-8 lg:mb-10 max-w-lg text-center px-4">
                      Connect your{" "}
                      {
                        ERP_OPTIONS.find(
                          (e) => e.value === selectedDestinationErp,
                        )?.label
                      }{" "}
                      account to export data directly.
                    </p>
                    <Button
                      disabled
                      size="lg"
                      className="px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-base"
                    >
                      Connect
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        {/* File Explorer Section */}
        {activeSection === "explorer" && (
          <div className="space-y-4">
            {/* Search and Filter Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="h-9 w-full sm:w-48 pl-8 text-sm"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 w-32 sm:w-36 text-sm justify-between"
                    >
                      <span className="truncate">
                        {STATUS_OPTIONS.find(
                          (opt) => opt.value === statusFilter,
                        )?.label || "Filter"}
                      </span>
                      <Filter className="h-3.5 w-3.5 ml-2 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                      All
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setStatusFilter("UPLOADED")}
                    >
                      Uploaded
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setStatusFilter("DQ_FIXED")}
                    >
                      Processed
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setStatusFilter("DQ_RUNNING")}
                    >
                      Processing
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("QUEUED")}>
                      Queued
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("FAILED")}>
                      Failed
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Quality</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem
                          onClick={() => setStatusFilter("excellent")}
                        >
                          Excellent
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setStatusFilter("good")}
                        >
                          Good
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setStatusFilter("bad")}
                        >
                          Bad
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
                {(searchQuery || statusFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2 shrink-0"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                    }}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3"
                  onClick={handleManualRefresh}
                  disabled={isManualRefresh}
                >
                  <RefreshCw
                    className={cn(
                      "h-4 w-4 mr-1.5",
                      isManualRefresh && "animate-spin",
                    )}
                  />
                  Refresh
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setDisplayColumnModalOpen(true)}
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Column Picker</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      {visibleColumns.has("file") && (
                        <TableHead
                          className="text-xs cursor-pointer hover:text-foreground transition-colors text-left"
                          onClick={() => handleSort("name")}
                        >
                          <span className="flex items-center">
                            File
                            <SortIcon field="name" />
                          </span>
                        </TableHead>
                      )}
                      {visibleColumns.has("score") && (
                        <TableHead
                          className="text-xs cursor-pointer hover:text-foreground transition-colors text-left"
                          onClick={() => handleSort("score")}
                        >
                          <span className="flex items-center">
                            Score
                            <SortIcon field="score" />
                          </span>
                        </TableHead>
                      )}
                      {visibleColumns.has("quality") && (
                        <TableHead className="text-xs text-left">
                          Data Quality
                        </TableHead>
                      )}
                      {visibleColumns.has("rows") && (
                        <TableHead className="text-xs text-left">
                          Rows
                        </TableHead>
                      )}
                      {visibleColumns.has("category") && (
                        <TableHead className="text-xs text-left">
                          Ingestion Type
                        </TableHead>
                      )}
                      {visibleColumns.has("status") && (
                        <TableHead
                          className="text-xs cursor-pointer hover:text-foreground transition-colors text-left"
                          onClick={() => handleSort("status")}
                        >
                          <span className="flex items-center">
                            Status
                            <SortIcon field="status" />
                          </span>
                        </TableHead>
                      )}
                      {visibleColumns.has("uploaded") && (
                        <TableHead
                          className="text-xs cursor-pointer hover:text-foreground transition-colors text-left"
                          onClick={() => handleSort("uploaded")}
                        >
                          <span className="flex items-center">
                            Uploaded
                            <SortIcon field="uploaded" />
                          </span>
                        </TableHead>
                      )}
                      {visibleColumns.has("updated") && (
                        <TableHead
                          className="text-xs cursor-pointer hover:text-foreground transition-colors text-left"
                          onClick={() => handleSort("updated")}
                        >
                          <span className="flex items-center">
                            Updated
                            <SortIcon field="updated" />
                          </span>
                        </TableHead>
                      )}
                      {visibleColumns.has("processingTime") && (
                        <TableHead className="text-xs text-left">
                          Processing Time
                        </TableHead>
                      )}
                      {visibleColumns.has("actions") && (
                        <TableHead className="text-xs text-left">
                          Actions
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && files.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading && tableEmpty && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-24 text-center text-sm text-muted-foreground"
                        >
                          <FileText className="h-6 w-6 mx-auto mb-1 opacity-50" />
                          No files found
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredFiles.map((file) => (
                      <TableRow
                        key={file.upload_id}
                        className="hover:bg-muted/50"
                      >
                        {visibleColumns.has("file") && (
                          <TableCell className="text-left">
                            <div>
                              <p className="text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-[200px]">
                                {file.original_filename ||
                                  file.filename ||
                                  "Untitled"}
                              </p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
                                {formatBytes(
                                  file.input_size_bytes || file.file_size || 0,
                                )}
                              </p>
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.has("score") && (
                          <TableCell className="text-left">
                            {typeof file.dq_score === "number" ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "w-[58px] justify-center text-xs tabular-nums font-medium",
                                  getScoreBadgeColor(file.dq_score),
                                )}
                              >
                                {file.dq_score.toFixed(1)}%
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.has("quality") && (
                          <TableCell className="text-left">
                            {typeof file.dq_score === "number" ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "w-20 justify-center text-xs font-medium",
                                  getScoreBadgeColor(file.dq_score),
                                )}
                              >
                                {getDqQualityLabel(file.dq_score)}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.has("rows") && (
                          <TableCell className="text-sm text-muted-foreground tabular-nums text-left">
                            {file.rows_clean || file.rows_in || 0}
                          </TableCell>
                        )}
                        {visibleColumns.has("category") && (
                          <TableCell className="text-xs text-muted-foreground text-left">
                            {(() => {
                              // Hash-based deterministic assignment: 98% Batch, 2% Realtime
                              const hash = file.upload_id
                                .split("")
                                .reduce(
                                  (acc, char) => acc + char.charCodeAt(0),
                                  0,
                                );
                              return hash % 100 < 98 ? "Batch" : "Realtime";
                            })()}
                          </TableCell>
                        )}
                        {visibleColumns.has("status") && (
                          <TableCell className="text-left">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs font-medium whitespace-nowrap px-2 py-0.5",
                                getStatusBadgeColor(file.status),
                              )}
                            >
                              {file.status || "UNKNOWN"}
                            </Badge>
                          </TableCell>
                        )}
                        {visibleColumns.has("uploaded") && (
                          <TableCell className="text-xs text-muted-foreground tabular-nums text-left">
                            {formatToIST(file.uploaded_at || file.created_at)}
                          </TableCell>
                        )}
                        {visibleColumns.has("updated") && (
                          <TableCell className="text-xs text-muted-foreground tabular-nums text-left">
                            {formatToIST(
                              file.updated_at || file.status_timestamp,
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.has("processingTime") && (
                          <TableCell className="text-xs text-muted-foreground text-left">
                            {(() => {
                              const procTime =
                                file.processing_time_seconds ??
                                (typeof file.processing_time === "number"
                                  ? file.processing_time
                                  : file.processing_time
                                    ? parseFloat(file.processing_time)
                                    : 0);

                              if (procTime && procTime > 0) {
                                if (procTime < 1)
                                  return `${(procTime * 1000).toFixed(0)}ms`;
                                if (procTime < 60)
                                  return `${procTime.toFixed(2)}s`;
                                const minutes = Math.floor(procTime / 60);
                                const remainingSeconds = Math.floor(
                                  procTime % 60,
                                );
                                if (minutes < 60)
                                  return `${minutes}m ${remainingSeconds}s`;
                                const hours = Math.floor(minutes / 60);
                                const remainingMinutes = minutes % 60;
                                return `${hours}h ${remainingMinutes}m`;
                              }

                              return "—";
                            })()}
                          </TableCell>
                        )}
                        {visibleColumns.has("actions") && (
                          <TableCell className="text-left">
                            <div className="flex justify-start gap-0.5 sm:gap-1">
                              {(file.status === "UPLOADED" ||
                                file.status === "DQ_FAILED" ||
                                file.status === "FAILED" ||
                                file.status === "UPLOAD_FAILED") && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 sm:h-8 sm:w-8 text-primary hover:text-primary hover:bg-primary/10"
                                        onClick={() =>
                                          handleStartProcessing(file)
                                        }
                                      >
                                        <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Start Processing
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 sm:h-8 sm:w-8"
                                    onClick={() => handleViewDetails(file)}
                                  >
                                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Details</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 sm:h-8 sm:w-8"
                                    onClick={() => openActionsDialog(file)}
                                    disabled={downloading === file.upload_id}
                                  >
                                    {downloading === file.upload_id ? (
                                      <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                                    ) : (
                                      <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Download</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 sm:h-8 sm:w-8"
                                    onClick={() => {
                                      setFileToPush(file);
                                      setPushQBModalOpen(true);
                                    }}
                                  >
                                    <CloudUpload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Export to ERP</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteClick(file)}
                                    disabled={deleting === file.upload_id}
                                  >
                                    {deleting === file.upload_id ? (
                                      <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {filteredFiles.length > 0 && (
                <p className="px-4 py-2 text-xs text-muted-foreground border-t">
                  Timestamps in IST (UTC+5:30)
                </p>
              )}
            </div>
          </div>
        )}

        {/* Modals */}
        <AlertDialog
          open={displayColumnModalOpen}
          onOpenChange={setDisplayColumnModalOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Display Columns</AlertDialogTitle>
              <AlertDialogDescription>
                Select which columns to display in the file explorer table.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all-display-columns"
                    checked={pendingVisibleColumns.size === 10}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setPendingVisibleColumns(
                          new Set([
                            "file",
                            "score",
                            "quality",
                            "rows",
                            "category",
                            "status",
                            "uploaded",
                            "updated",
                            "processingTime",
                            "actions",
                          ]),
                        );
                      } else {
                        setPendingVisibleColumns(new Set());
                      }
                    }}
                  />
                  <Label
                    htmlFor="select-all-display-columns"
                    className="text-sm font-medium"
                  >
                    Select all
                  </Label>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {[
                  { id: "file", label: "File" },
                  { id: "score", label: "Score" },
                  { id: "quality", label: "Data Quality" },
                  { id: "rows", label: "Rows" },
                  { id: "category", label: "Ingestion Type" },
                  { id: "status", label: "Status" },
                  { id: "uploaded", label: "Uploaded" },
                  { id: "updated", label: "Updated" },
                  { id: "processingTime", label: "Processing Time" },
                  { id: "actions", label: "Actions" },
                ].map((col) => (
                  <div key={col.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`display-col-${col.id}`}
                      checked={pendingVisibleColumns.has(col.id)}
                      onCheckedChange={(checked) => {
                        const newVisible = new Set(pendingVisibleColumns);
                        if (checked) {
                          newVisible.add(col.id);
                        } else {
                          newVisible.delete(col.id);
                        }
                        setPendingVisibleColumns(newVisible);
                      }}
                    />
                    <Label
                      htmlFor={`display-col-${col.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {col.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <AlertDialogFooter>
              <Button
                onClick={() => {
                  setVisibleColumns(new Set(pendingVisibleColumns));
                  setDisplayColumnModalOpen(false);
                }}
              >
                Apply
              </Button>
              <AlertDialogCancel
                onClick={() => {
                  setPendingVisibleColumns(new Set(visibleColumns));
                }}
              >
                Close
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={columnModalOpen} onOpenChange={setColumnModalOpen}>
          <AlertDialogContent className="!max-w-[95vw] !w-[95vw] h-[90vh] sm:!max-w-[95vw] overflow-hidden grid-rows-[auto_1fr_auto]">
            <AlertDialogHeader>
              <AlertDialogTitle>Select columns to process</AlertDialogTitle>
              <AlertDialogDescription>
                Choose which columns should be included for this run. All
                columns are selected by default.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 overflow-hidden pr-1 min-h-0">
              {columnsLoading ? (
                <div className="col-span-full flex items-center justify-center h-full text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading columns...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 min-h-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all-columns"
                        checked={
                          availableColumns.length > 0 &&
                          selectedColumns.size === availableColumns.length
                        }
                        onCheckedChange={(checked) =>
                          handleToggleAllColumns(Boolean(checked))
                        }
                      />
                      <Label htmlFor="select-all-columns" className="text-sm">
                        Select all
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        ref={selectionFileInputRef}
                        type="file"
                        accept=".json,.csv,.xlsx,.xls"
                        className="hidden"
                        onChange={handleSelectionFileInput}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectionFileInputRef.current?.click()}
                      >
                        Upload selection
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-muted-foreground">
                      Tip: upload a CSV / Excel / JSON with columns:{" "}
                      <code>name</code> and <code>include</code> (true/false) to
                      quickly apply selections.
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 max-h-[60vh]">
                    {availableColumns.map((col) => (
                      <div key={col} className="flex items-center space-x-2">
                        <Checkbox
                          id={`col-${col}`}
                          checked={selectedColumns.has(col)}
                          onCheckedChange={(checked) =>
                            handleToggleColumn(col, Boolean(checked))
                          }
                        />
                        <Label htmlFor={`col-${col}`} className="text-sm">
                          {col}
                        </Label>
                      </div>
                    ))}
                    {availableColumns.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Columns could not be detected automatically. You can
                        still proceed to process all columns.
                      </p>
                    )}
                  </div>
                  {columnsError && (
                    <p className="text-sm text-destructive">{columnsError}</p>
                  )}
                  {selectionFileError && (
                    <p className="text-sm text-destructive">
                      {selectionFileError}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2 min-h-0 overflow-hidden">
                <p className="text-sm font-medium">Column profiling preview</p>
                {selectionProfilingError && (
                  <p className="text-sm text-destructive mt-1">
                    {selectionProfilingError}
                  </p>
                )}
                {selectionProfilingLoading || selectionProfilingData ? (
                  <div className="mt-2 min-h-0 overflow-y-auto">
                    <ColumnProfilingPanel
                      data={selectionProfilingData}
                      loading={selectionProfilingLoading}
                      embedded
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Profiling preview will appear here.
                  </p>
                )}
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleColumnCancel}>
                Cancel
              </AlertDialogCancel>
              {!columnsLoading &&
                !selectionProfilingLoading &&
                !rulesConfirmed && (
                  <Button variant="outline" onClick={handleOpenRulesDialog}>
                    Next: Review rules
                  </Button>
                )}
              {!columnsLoading &&
                !selectionProfilingLoading &&
                rulesConfirmed && (
                  <AlertDialogAction onClick={handleColumnConfirm}>
                    Proceed
                  </AlertDialogAction>
                )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={rulesDialogOpen} onOpenChange={setRulesDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>AI-based suggestions (optional)</DialogTitle>
              <DialogDescription>
                AI reviews this dataset and suggests extra checks. Review and
                confirm before applying.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Add deterministic checks for specific columns. Nothing is
                auto-fixed or deleted.
              </p>
              <p className="text-xs text-muted-foreground">
                Scope: this dataset only. You can change these settings before
                processing starts.
              </p>
            </div>

            <Tabs defaultValue="global" className="space-y-4">
              <TabsList>
                <TabsTrigger value="custom">Custom Checks</TabsTrigger>
                <TabsTrigger value="global">Global Rules</TabsTrigger>
                <TabsTrigger value="required">Required Fields</TabsTrigger>
                <TabsTrigger value="disable">Disable Rules</TabsTrigger>
                <TabsTrigger value="override">Edit Rules</TabsTrigger>
              </TabsList>

              <TabsContent value="custom" className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Column
                    </Label>
                    <Select
                      value={customRuleColumn}
                      onValueChange={setCustomRuleColumn}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColumns.map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs text-muted-foreground">
                      Prompt
                    </Label>
                    <Input
                      value={customRulePrompt}
                      onChange={(event) =>
                        setCustomRulePrompt(event.target.value)
                      }
                      placeholder="Validate this column as IPv4 address"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={handleGenerateCustomRule}
                      disabled={customRuleSuggesting}
                    >
                      {customRuleSuggesting ? "Generating..." : "Generate rule"}
                    </Button>
                  </div>
                </div>

                {customRuleSuggestError && (
                  <p className="text-sm text-destructive">
                    {customRuleSuggestError}
                  </p>
                )}

                {customRuleSuggestion?.suggestion && (
                  <div className="rounded-md border border-muted/60 p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {customRuleSuggestion.suggestion.rule_name ||
                          "Suggested rule"}
                      </span>
                      {customRuleSuggestion.suggestion.severity && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] h-5 px-2 uppercase",
                            RULE_SEVERITY_STYLES[
                            customRuleSuggestion.suggestion.severity
                            ] || RULE_SEVERITY_STYLES.info,
                          )}
                        >
                          {customRuleSuggestion.suggestion.severity}
                        </Badge>
                      )}
                      {typeof customRuleSuggestion.suggestion.confidence ===
                        "number" && (
                          <span className="text-xs text-muted-foreground">
                            {(
                              customRuleSuggestion.suggestion.confidence * 100
                            ).toFixed(0)}
                            % confidence
                          </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Template: {customRuleSuggestion.suggestion.template}
                    </p>
                    {customRuleSuggestion.suggestion.explanation && (
                      <p className="text-xs text-muted-foreground">
                        {customRuleSuggestion.suggestion.explanation}
                      </p>
                    )}
                    {customRuleSuggestion.suggestion.template === "code" &&
                      customRuleSuggestion.suggestion.code && (
                        <details className="mt-2">
                          <summary className="text-xs text-primary cursor-pointer hover:underline">
                            View Python Code
                          </summary>
                          <pre className="mt-2 p-3 bg-zinc-900 text-green-400 text-xs rounded-md overflow-x-auto max-h-48 overflow-y-auto">
                            <code>{customRuleSuggestion.suggestion.code}</code>
                          </pre>
                        </details>
                      )}
                    {customRuleSuggestion.executable === false && (
                      <p className="text-xs text-destructive">
                        This rule template is not supported for execution yet.
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleApproveCustomRule}
                        disabled={customRuleSuggestion.executable === false}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setCustomRuleSuggestion(null)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Approved checks will run during processing for this file.
                  </p>
                  {customRules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No custom checks added yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {customRules.map((rule) => (
                        <div
                          key={rule.rule_id}
                          className="flex items-start justify-between gap-4 rounded-md border border-muted/60 p-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">
                                {rule.rule_name || "Custom check"}
                              </span>
                              {rule.severity && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] h-5 px-2 uppercase",
                                    RULE_SEVERITY_STYLES[rule.severity] ||
                                    RULE_SEVERITY_STYLES.info,
                                  )}
                                >
                                  {rule.severity}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Column: {rule.column} · Template: {rule.template}
                            </p>
                            {rule.explanation && (
                              <p className="text-xs text-muted-foreground">
                                {rule.explanation}
                              </p>
                            )}
                            {rule.template === "code" && rule.code && (
                              <details className="mt-1">
                                <summary className="text-xs text-primary cursor-pointer hover:underline">
                                  View Python Code
                                </summary>
                                <pre className="mt-2 p-2 bg-zinc-900 text-green-400 text-xs rounded-md overflow-x-auto max-h-32 overflow-y-auto">
                                  <code>{rule.code}</code>
                                </pre>
                              </details>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCustomRule(rule.rule_id)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="global" className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Turn off specific checks for all columns in this dataset.
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {RULE_IDS.map((ruleId) =>
                    renderRuleOption(
                      ruleId,
                      globalDisabledRules.includes(ruleId),
                      (checked) => handleToggleGlobalRule(ruleId, checked),
                    ),
                  )}
                </div>
              </TabsContent>

              <TabsContent value="required" className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Mark columns as required. Missing values will be flagged.
                </p>
                {availableColumns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No columns available.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                    {availableColumns.map((col) => (
                      <label
                        key={col}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={requiredColumns.has(col)}
                          onCheckedChange={(checked) =>
                            handleToggleRequiredColumn(col, Boolean(checked))
                          }
                        />
                        <span>{col}</span>
                      </label>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="disable" className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Turn off checks for a specific column.
                </p>
                <Select
                  value={rulesDisableColumn}
                  onValueChange={handleSelectDisableColumn}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {rulesDisableColumn ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {RULE_IDS.map((ruleId) => {
                      const selected =
                        disableRulesByColumn[rulesDisableColumn] || [];
                      return renderRuleOption(
                        ruleId,
                        selected.includes(ruleId),
                        (checked) =>
                          handleToggleDisableRule(
                            rulesDisableColumn,
                            ruleId,
                            checked,
                          ),
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a column to configure disabled rules.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="override" className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Edit suggested checks for a specific column.
                </p>
                <Select
                  value={rulesOverrideColumn}
                  onValueChange={handleSelectOverrideColumn}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {rulesOverrideColumn ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {RULE_IDS.map((ruleId) => {
                      const selected =
                        overrideRulesByColumn[rulesOverrideColumn] || [];
                      return renderRuleOption(
                        ruleId,
                        selected.includes(ruleId),
                        (checked) =>
                          handleToggleOverrideRule(
                            rulesOverrideColumn,
                            ruleId,
                            checked,
                          ),
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a column to edit suggested rules.
                  </p>
                )}
              </TabsContent>
            </Tabs>
            <AlertDialogFooter>
              <Button variant="outline" onClick={handleCloseRulesDialog}>
                Back
              </Button>
              <Button onClick={handleConfirmRulesDialog}>Done</Button>
            </AlertDialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={confirmColumnsOpen}
          onOpenChange={setConfirmColumnsOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm columns</AlertDialogTitle>
              <AlertDialogDescription>
                Review the columns to be processed. Click Proceed to start
                processing.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              {confirmAllColumns ? (
                <p className="text-sm text-muted-foreground">
                  All columns will be processed.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {confirmColumns.length} column(s) selected:
                  </p>
                  <div className="max-h-64 overflow-y-auto pr-1">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Column name</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {confirmColumns.map((col) => (
                          <TableRow key={col}>
                            <TableCell className="text-sm">{col}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleConfirmColumnsCancel}>
                Back
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmColumnsProceed}>
                Proceed
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete file?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove{" "}
                {fileToDelete?.original_filename || fileToDelete?.filename}. The
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <FileDetailsDialog
          file={selectedFile}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />

        <DownloadFormatModal
          open={showDownloadModal}
          onOpenChange={setShowDownloadModal}
          file={downloadModalFile}
          onDownload={handleFormatSelected}
          downloading={Boolean(downloadingFormat)}
        />

        <ERPTransformationModal
          open={showErpModal}
          onOpenChange={setShowErpModal}
          onDownload={handleDownloadWithErp}
          downloading={Boolean(downloadingFormat)}
          filename={
            downloadModalFile?.original_filename ||
            downloadModalFile?.filename ||
            erpModalConfig?.file.original_filename ||
            erpModalConfig?.file.filename ||
            "selected file"
          }
          dqStats={{
            cleanRows: erpModalConfig?.file.rows_out
              ? erpModalConfig.file.rows_out -
              (erpModalConfig.file.rows_fixed || 0)
              : undefined,
            fixedRows: erpModalConfig?.file.rows_fixed,
            quarantinedRows: erpModalConfig?.file.rows_quarantined,
            totalRows: erpModalConfig?.file.rows_in,
          }}
        />

        <PushToERPModal
          open={pushQBModalOpen}
          onOpenChange={setPushQBModalOpen}
          file={fileToPush}
          onSuccess={() => {
            toast({
              title: "Success",
              description: "Data pushed to ERP successfully",
            });
            setPushQBModalOpen(false);
            setFileToPush(null);
          }}
          onError={(error) => {
            toast({
              title: "Push failed",
              description: error,
              variant: "destructive",
            });
          }}
        />

        <WizardDialog
          open={wizardOpen && !!wizardFile}
          onOpenChange={handleWizardOpenChange}
          file={wizardFile}
          authToken={idToken || ""}
          onComplete={handleWizardComplete}
        />

        <ColumnExportDialog
          open={showColumnExportModal}
          onOpenChange={(open) => {
            setShowColumnExportModal(open);
            if (!open) {
              setColumnExportFile(null);
              setColumnExportColumns([]);
            }
          }}
          fileName={
            columnExportFile?.original_filename ||
            columnExportFile?.filename ||
            "file"
          }
          columns={columnExportColumns}
          onExport={handleColumnExport}
          exporting={
            downloading === columnExportFile?.upload_id || columnExportLoading
          }
        />

        <Dialog open={actionsDialogOpen} onOpenChange={setActionsDialogOpen}>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="border-b pb-4">
              <DialogTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
                  <CloudUpload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                Download Data
              </DialogTitle>
              <DialogDescription>
                Configure your data and select a destination.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
              <div className="rounded-lg border p-4 bg-muted/30">
                <div className="text-sm font-medium">
                  {actionsDialogFile?.original_filename ||
                    actionsDialogFile?.filename ||
                    "Selected file"}
                </div>
                {actionsDialogFile && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {actionsDialogFile.rows_clean ||
                      actionsDialogFile.rows_out ||
                      0}{" "}
                    clean rows ready to export
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    1
                  </span>
                  ERP Transformation (Optional)
                </Label>
                <RadioGroup
                  value={actionsErpMode}
                  onValueChange={(value) =>
                    setActionsErpMode(value as "original" | "transform")
                  }
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2 rounded-lg border p-3">
                    <RadioGroupItem value="original" id="erp-original" />
                    <Label htmlFor="erp-original" className="cursor-pointer">
                      Original Format (CSV)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg border p-3">
                    <RadioGroupItem value="transform" id="erp-transform" />
                    <Label htmlFor="erp-transform" className="cursor-pointer">
                      Transform for ERP System
                    </Label>
                  </div>
                </RadioGroup>

                {actionsErpMode === "transform" && (
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">ERP System</Label>
                    <Select
                      value={actionsErpTarget}
                      onValueChange={setActionsErpTarget}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ERP" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "Oracle Fusion",
                          "SAP ERP",
                          "Microsoft Dynamics",
                          "NetSuite",
                          "Workday",
                          "QuickBooks Online",
                          "Zoho Books",
                          "Custom ERP",
                        ].map((erp) => (
                          <SelectItem key={erp} value={erp}>
                            {erp}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {columnExportLoading ? (
                <div className="text-sm text-muted-foreground">
                  Loading columns…
                </div>
              ) : (
                <ColumnExportContent
                  fileName={
                    actionsDialogFile?.original_filename ||
                    actionsDialogFile?.filename ||
                    "Selected file"
                  }
                  columns={columnExportColumns}
                  onExport={handleColumnExport}
                  primaryActionLabel="Download"
                  exporting={
                    downloading === columnExportFile?.upload_id ||
                    columnExportLoading
                  }
                  onCancel={() => setActionsDialogOpen(false)}
                  showTitle={false}
                  className="min-h-[360px]"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!profilingFileId}
          onOpenChange={(open) => !open && setProfilingFileId(null)}
        >
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle>Column Profiling & DQ Analysis</DialogTitle>
              <DialogDescription>
                Detailed analysis of data types, quality issues, and suggested
                rules.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 pt-2">
              <ColumnProfilingPanel
                data={profilingData}
                loading={loadingProfiling}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Processing Wizard Dialog */}
        <WizardDialog
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          file={wizardFile}
          authToken={idToken || ""}
          onStarted={() => {
            setWizardOpen(false);
            setWizardFile(null);
            loadFiles(); // Refresh file list after processing starts
          }}
          onComplete={() => {
            setWizardOpen(false);
            setWizardFile(null);
            loadFiles(); // Refresh file list after processing
          }}
        />
      </div>
    </TooltipProvider>
  );
}


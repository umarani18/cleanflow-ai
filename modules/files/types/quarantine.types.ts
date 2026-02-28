// ─── Quarantine Editor Type Definitions ──────────────────────────────────────
//
// This file contains all type definitions for the quarantine editor feature,
// including domain models, API requests/responses, and UI state types.

// ========== Domain Types ==========

/**
 * Quarantine manifest containing metadata about quarantined rows
 */
export interface QuarantineManifest {
  upload_id: string
  root_upload_id: string
  row_count_quarantined: number
  columns: string[]
  editable_columns: string[]
  shard_count: number
  etag: string
}

/**
 * Active quarantine editing session
 */
export interface QuarantineSession {
  session_id: string
  base_upload_id: string
  session_etag: string
}

/**
 * A single quarantined row with row_id and dynamic columns
 */
export interface QuarantineRow {
  row_id: string
  [columnName: string]: any
}

/**
 * Batch of edits for specific row
 */
export interface QuarantineEditsBatch {
  row_id: string
  cells: Record<string, any>
}

/**
 * File version summary for lineage display
 */
export interface FileVersionSummary {
  upload_id: string
  version_number: number
  root_upload_id?: string
  parent_upload_id?: string | null
  is_latest?: boolean
  created_at?: string
  patch_notes?: string | null
  reprocess_count?: number
  rows_quarantined?: number
  status?: string
  dq_score?: number | null
  original_filename?: string
  uploaded_at?: string
  updated_at?: string
  rows_in?: number
  rows_clean?: number
  rows_fixed?: number
}

// ========== API Request Types ==========

/**
 * Request payload for querying quarantined rows
 */
export interface QuarantineQueryRequest {
  version?: string
  session_id?: string
  cursor?: string
  limit?: number
}

/**
 * Request payload for saving edits batch
 */
export interface QuarantineSaveBatchRequest {
  session_id: string
  if_match_etag: string
  edits: QuarantineEditsBatch[]
}

/**
 * Request payload for submitting reprocess
 */
export interface QuarantineReprocessRequest {
  session_id: string
  if_match_base_upload_id: string
  patch_notes?: string
  submit_token: string
}

/**
 * Legacy reprocess request (fallback compatibility)
 */
export interface LegacyReprocessQuarantinedRequest {
  edited_rows: Record<string, any>[]
  patch_notes?: string
}

/**
 * Request for backfilling read model
 */
export interface QuarantineBackfillRequest {
  version: string
}

// ========== API Response Types ==========

/**
 * Response from manifest query
 */
export interface QuarantineManifestResponse extends QuarantineManifest {}

/**
 * Response from session start
 */
export interface QuarantineSessionStartResponse extends QuarantineSession {}

/**
 * Response from quarantined rows query
 */
export interface QuarantineQueryResponse {
  rows: QuarantineRow[]
  next_cursor?: string | null
  etag?: string
}

/**
 * Response from saving edits batch
 */
export interface QuarantineSaveBatchResponse {
  next_etag: string
  accepted: number
  rejected?: Array<{ row_id: string; reason: string }>
}

/**
 * Response from submitting reprocess
 */
export interface QuarantineReprocessResponse {
  execution_arn?: string
  new_upload_id?: string
  status: string
  version_number?: number
}

/**
 * Response from backfill operation
 */
export interface QuarantineReadModelBackfillResponse {
  status: string
  message?: string
}

/**
 * Response containing file versions
 */
export interface FileVersionsResponse {
  versions: FileVersionSummary[]
  count: number
}

// ========== UI State Types ==========

/**
 * Complete state for the quarantine editor
 */
export interface QuarantineEditorState {
  // Session & manifest
  manifest: QuarantineManifest | null
  session: QuarantineSession | null
  versions: FileVersionSummary[]
  etag: string

  // Data
  rows: QuarantineRow[]
  cursor: string | null
  hasMore: boolean

  // Edits
  editsMap: Record<string, Record<string, any>>
  activeCell: { rowId: string; col: string } | null

  // Loading states
  loading: boolean
  saving: boolean
  submitting: boolean

  // Modes
  compatibilityMode: boolean

  // UI state
  scrollTop: number
  lastSaveSummary: { accepted: number; rejected: number } | null
  showLineage: boolean
}

/**
 * Configuration constants for quarantine editor
 */
export interface QuarantineEditorConfig {
  pageSize: number
  maxRowsInMemory: number
  maxEditsPerBatch: number
  autosaveDebounceMs: number
  rowHeight: number
  headerHeight: number
  overscan: number
}

/**
 * Props for QuarantineEditorDialog component
 */
export interface QuarantineEditorDialogProps {
  file: {
    upload_id: string
    filename?: string
    original_filename?: string
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Cell editing state
 */
export interface ActiveCell {
  rowId: string
  col: string
}

/**
 * Save summary result
 */
export interface SaveSummary {
  accepted: number
  rejected: number
}

// ========== Utility Types ==========

/**
 * CSV parse result
 */
export interface CsvParseResult {
  columns: string[]
  rows: Record<string, any>[]
}

/**
 * Compatibility reprocess via upload payload
 */
export interface CompatibilityReprocessPayload {
  rows: Record<string, any>[]
  originalFilename?: string
  processingOptions?: any
}

// ========== Error Types ==========

/**
 * Quarantine editor specific errors
 */
export type QuarantineEditorErrorType =
  | 'MANIFEST_FETCH_FAILED'
  | 'SESSION_START_FAILED'
  | 'ROWS_QUERY_FAILED'
  | 'SAVE_FAILED'
  | 'REPROCESS_FAILED'
  | 'ETAG_CONFLICT'
  | 'COMPATIBILITY_MODE_REQUIRED'
  | 'BACKFILL_FAILED'

export interface QuarantineEditorError {
  type: QuarantineEditorErrorType
  message: string
  details?: any
}

# CleanFlowAI – New Features (DQ Matrix + Presets) Overview

## Backend

### Endpoints
- `GET /files/{upload_id}/dq-matrix`
  - Query params: `limit|n` (default 25, no hard max), `offset`, `start`, `end` (inclusive).
  - Behavior: Returns slice of dq_matrix JSON with stats.
  - Fallback keys searched (in order):
    1. `dq_matrix_s3` from FileRegistry
    2. `results/{user_id}/{upload_id}/dq_matrix.json`
    3. `results/{user_id}/{upload_id}/final_result.json`
    4. Latest `dq_jobs/{user_id}/{upload_id}/.../final_result.json`
  - Response shape:
    ```json
    {
      "results": [ ...issue rows... ],
      "returned": <int>,
      "total_results": <int>,
      "offset": <int>,
      "next_offset": <int|null>,
      "total_rows": <int>,
      "clean_rows": <int>,
      "fixed_rows": <int>,
      "quarantined_rows": <int>,
      "columns_processed": [...],
      "primary_key_columns": [...],
      "dq_matrix_key": "<s3 key used>"
    }
    ```
  - CORS: enabled via API Gateway (GET/OPTIONS).

- Settings Presets (unchanged paths):
  - `GET /settings`
  - `POST /settings`
  - `GET /settings/{preset_id}`
  - `PUT /settings/{preset_id}`
  - `DELETE /settings/{preset_id}`
  - Auto-seed: if a user has no presets or none marked default, backend seeds `preset_default` from `DEFAULT_DQ_RULES_KEY` (default `dq_rules/current.json` in the bucket).

### Schema snippets
- **Preset item (Dynamo)**: `{ user_id, preset_id, preset_name, config: <JSON>, is_default: bool, created_at, updated_at }`
- **DQ Matrix issue row** (in `results`): `{ row_idx, primary_key, status: "clean|fixed|quarantined", fixed_values: {...}, issues: [{ column, rule_id, issue_type, description, original_value, fixed_value }] }`

## Frontend

### API client (`lib/api/file-management-api.ts`)
- Endpoints fixed to `/settings` and `/settings/{id}`.
- Added: `createSettingsPreset`, `updateSettingsPreset`, `deleteSettingsPreset`.
- Added: `getDQMatrix(uploadId, token, {limit, offset, start, end})`.
- Added endpoint constant: `/files/{id}/dq-matrix`.

### Settings Step UI (`components/processing/steps/SettingsStep.tsx`)
- Always keeps a default preset available.
- Create preset dialog:
  - “Start from” selector (current edits or any existing preset).
  - Calls backend create; refreshes list; selects new preset.
- Save Preset: updates selected preset (except default) via backend.
- Delete Preset: deletes selected preset (except default) via backend.
- Overrides built from current UI state (policies, lookups, thresholds, required columns).

### File Details Dialog (`components/files/file-details-dialog.tsx`)
- Download DQ Matrix button with modal (limit, start offset, optional end).
- Fetches totals (issue rows, total rows) via a 1-row head call.
- Downloads dq_matrix JSON using new endpoint; reports returned rows.
- Download Report button unchanged.

## Deployment Notes
- After backend changes, deploy `base dq-pipeline` so API Gateway exposes `/files/{id}/dq-matrix` with CORS.
- Frontend needs no additional config; just rebuild.

## Quick Usage Examples
- Fetch first 100 issue rows:
  `GET /files/abc123/dq-matrix?limit=100`
- Fetch range 200–300:
  `GET /files/abc123/dq-matrix?start=200&end=300`
- Create preset via API:
  `POST /settings` with `{ "preset_name": "Automobile DQ", "config": {...}, "is_default": false }`
- Update preset:
  `PUT /settings/automobile_dq` with `{ "config": { ...updated... } }`
- Delete preset:
  `DELETE /settings/automobile_dq`

## Frontend UX Flow
1. Settings step: pick preset ? edit ? Save Preset, or New Preset (copy from existing/current).
2. File preview dialog (eye icon): click “Download DQ Matrix” ? enter limit/range ? download JSON; “Download Report” remains available.
## Rules Step (UI ? Backend)

### Endpoints
- `GET /files/{upload_id}/profiling`
  - Returns column profiles with suggested rules per column.
  - Key fields per column:
    - `type_guess`, `type_confidence`, `null_rate`, `unique_ratio`
    - `rules`: array of `{ rule_id, rule_name, confidence, decision: "auto" | "human", reasoning }`

- `POST /files/{upload_id}/custom-rule-suggest`
  - Body: `{ column: string, prompt: string }`
  - Response: `suggestion` with optional `code`/`params` (template-specific) and `confidence`.

- `POST /files/{upload_id}/process`
  - Aggregates all rule selections and kicks off DQ processing.
  - Body fields (all optional except `selected_columns` when you want column filtering):
    - `selected_columns: string[]` – columns to process.
    - `required_columns: string[]` – applies R1 to these columns only.
    - `global_disabled_rules: string[]` – rule_ids to disable for all columns.
    - `disable_rules: { [column: string]: string[] }` – rule_ids to disable per column.
    - `column_rules_override: { [column: string]: string[] }` – explicit rule_ids to run per column (overrides suggestions).
    - `custom_rules: Array<{ rule_id?, column, template, params?, rule_name?, explanation?, severity? }>`
    - `custom_rule_prompt: string` – if using LLM-generated custom rules.
    - `preset_id: string` – chosen preset id (optional).
    - `preset_overrides: object` – ad-hoc overrides from Settings step (optional).

### UI Wiring (RulesStep)
- Uses column profiling to list Auto vs Human suggestions; user toggles selection.
- Custom rule generation calls `POST /files/{id}/custom-rule-suggest` per column prompt.
- Final “Start Processing” sends `POST /files/{id}/process` with:
  - selected columns
  - required columns (from Settings)
  - selected rules per column (as overrides/disable lists)
  - any custom rules added
  - preset id + overrides (if chosen in Settings)

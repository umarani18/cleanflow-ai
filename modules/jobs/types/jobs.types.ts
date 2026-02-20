// ─── Jobs types ───────────────────────────────────────────────────────────────
// Extracted from lib/api/jobs-api.ts

export type JobStatus = 'ACTIVE' | 'PAUSED' | 'FAILED'
export type JobFrequency = '15min' | '1hr' | 'daily' | 'cron'
export type ERPType = 'quickbooks' | 'zoho_books'
export type DQMode = 'default' | 'custom'

export interface DQConfig {
    mode: DQMode
    columns?: string[] | null
    preset_id?: string | null
    rules?: any[] | null
}

export interface Job {
    job_id: string
    name: string
    source: ERPType
    destination: ERPType
    entities?: string[]
    // Backend stores these two fields (not a single 'frequency')
    frequency_type?: string   // 'rate' | 'cron'
    frequency_value?: string  // e.g. '15 minutes', '1 hour', '1 day', or cron expr
    // Convenience field (computed by frontend)
    frequency?: JobFrequency
    cron_expression?: string
    dq_config: DQConfig
    status: JobStatus
    max_records?: number
    created_at?: string
    updated_at?: string
    last_run_at?: string
    last_run_status?: string
}

export interface JobRun {
    run_id: string
    job_id: string
    status: 'SUCCESS' | 'FAILED' | 'RUNNING'
    started_at: string
    completed_at?: string
    records_fetched?: number
    records_written?: number
    error?: string
    duration_seconds?: number
}

export interface CreateJobPayload {
    name: string
    source: ERPType
    destination: ERPType
    entities?: string[]
    frequency_type: string
    frequency_value: string
    dq_config?: Partial<DQConfig>
    max_records?: number
}

export interface UpdateJobPayload {
    name?: string
    source?: ERPType
    destination?: ERPType
    entities?: string[]
    frequency_type?: string
    frequency_value?: string
    dq_config?: Partial<DQConfig>
    max_records?: number
}

"use client"

import { AWS_CONFIG } from '../aws-config'

const API_BASE_URL = AWS_CONFIG.API_BASE_URL

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Frequency Helpers ────────────────────────────────────────────────────────

/** Convert frontend shorthand to backend frequency_type + frequency_value */
export function frequencyToBackend(freq: JobFrequency, cronExpr?: string): { frequency_type: string; frequency_value: string } {
    switch (freq) {
        case '15min': return { frequency_type: 'rate', frequency_value: '15 minutes' }
        case '1hr': return { frequency_type: 'rate', frequency_value: '1 hour' }
        case 'daily': return { frequency_type: 'rate', frequency_value: '1 day' }
        case 'cron': return { frequency_type: 'cron', frequency_value: cronExpr || '0 * * * ? *' }
        default: return { frequency_type: 'rate', frequency_value: '1 hour' }
    }
}

/** Convert backend frequency_type + frequency_value to frontend shorthand */
export function frequencyFromBackend(freqType?: string, freqValue?: string): { frequency: JobFrequency; cronExpression: string } {
    if (freqType === 'cron') {
        return { frequency: 'cron', cronExpression: freqValue || '' }
    }
    // Parse rate value like '15 minutes', '1 hour', '1 day'
    const val = (freqValue || '').toLowerCase().trim()
    if (val.includes('minute')) return { frequency: '15min', cronExpression: '' }
    if (val.includes('hour')) return { frequency: '1hr', cronExpression: '' }
    if (val.includes('day')) return { frequency: 'daily', cronExpression: '' }
    return { frequency: '1hr', cronExpression: '' }
}

// ─── API Endpoints ────────────────────────────────────────────────────────────

const ENDPOINTS = {
    JOBS: '/jobs',
    JOB_BY_ID: (id: string) => `/jobs/${id}`,
    JOB_PAUSE: (id: string) => `/jobs/${id}/pause`,
    JOB_RESUME: (id: string) => `/jobs/${id}/resume`,
    JOB_RUNS: (id: string) => `/jobs/${id}/runs`,
}

// ─── API Client ───────────────────────────────────────────────────────────────

class JobsAPI {
    private baseURL: string

    constructor(baseURL: string = API_BASE_URL) {
        this.baseURL = baseURL
    }

    private async makeRequest(endpoint: string, authToken: string, options: RequestInit = {}): Promise<any> {
        const url = `${this.baseURL}${endpoint}`
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...options.headers as Record<string, string>
        }

        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`
        }

        const response = await fetch(url, { ...options, headers })

        if (!response.ok) {
            const raw = await response.json().catch(() => ({}))
            const errorData = (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw : {}
            const fallbackMsg = typeof raw === "string" ? raw : `HTTP ${response.status}`
            throw new Error(errorData.error || errorData.message || fallbackMsg)
        }

        return await response.json()
    }

    private getAuth(): string {
        if (typeof window === 'undefined') return ''
        try {
            const raw = window.localStorage.getItem('authTokens')
            if (raw) {
                const parsed = JSON.parse(raw)
                return parsed?.idToken || parsed?.accessToken || ''
            }
        } catch { /* ignore */ }
        return ''
    }

    // ─── CRUD Operations ─────────────────────────────────────────────────────

    async listJobs(): Promise<{ jobs: Job[] }> {
        const token = this.getAuth()
        try {
            return await this.makeRequest(ENDPOINTS.JOBS, token, { method: 'GET' })
        } catch {
            return { jobs: [] }
        }
    }

    async getJob(jobId: string): Promise<Job> {
        const token = this.getAuth()
        return this.makeRequest(ENDPOINTS.JOB_BY_ID(jobId), token, { method: 'GET' })
    }

    async createJob(payload: CreateJobPayload): Promise<Job> {
        const token = this.getAuth()
        return this.makeRequest(ENDPOINTS.JOBS, token, {
            method: 'POST',
            body: JSON.stringify(payload)
        })
    }

    async updateJob(jobId: string, payload: UpdateJobPayload): Promise<Job> {
        const token = this.getAuth()
        return this.makeRequest(ENDPOINTS.JOB_BY_ID(jobId), token, {
            method: 'PUT',
            body: JSON.stringify(payload)
        })
    }

    async deleteJob(jobId: string): Promise<{ message: string }> {
        const token = this.getAuth()
        return this.makeRequest(ENDPOINTS.JOB_BY_ID(jobId), token, { method: 'DELETE' })
    }

    // ─── Job Actions ──────────────────────────────────────────────────────────

    async pauseJob(jobId: string): Promise<Job> {
        const token = this.getAuth()
        return this.makeRequest(ENDPOINTS.JOB_PAUSE(jobId), token, { method: 'POST' })
    }

    async resumeJob(jobId: string): Promise<Job> {
        const token = this.getAuth()
        return this.makeRequest(ENDPOINTS.JOB_RESUME(jobId), token, { method: 'POST' })
    }

    // ─── Job Runs ─────────────────────────────────────────────────────────────

    async getJobRuns(jobId: string, limit: number = 10): Promise<{ runs: JobRun[] }> {
        const token = this.getAuth()
        const qs = limit ? `?limit=${limit}` : ''
        try {
            return await this.makeRequest(`${ENDPOINTS.JOB_RUNS(jobId)}${qs}`, token, { method: 'GET' })
        } catch {
            return { runs: [] }
        }
    }
}

export const jobsAPI = new JobsAPI()

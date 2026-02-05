import { AWS_CONFIG } from '../aws-config'

const API_BASE_URL = AWS_CONFIG.API_BASE_URL

export interface ZohoBooksConnectResponse {
  auth_url: string
  state: string
}

export interface ZohoBooksConnectionStatus {
  connected: boolean
  org_id?: string
  zoho_user_id?: string
  zoho_accounts_user_id?: string
  linked_at?: string
}

export interface ZohoBooksImportResponse {
  upload_id: string
  filename: string
  records_imported: number
  message: string
}

export interface ZohoBooksExportResponse {
  total_records: number
  success_count: number
  failed_count: number
  results?: Array<{ row: number; status: string; id?: string; error?: string }>
}

export interface ZohoBooksImportFilters {
  limit?: number
  page?: number
  date_from?: string
  date_to?: string
  all?: boolean
  max_pages?: number
}

class ZohoBooksService {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    skipAuth: boolean = false,
    retries: number = 0
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (!skipAuth) {
      const token = this.getAuthToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000)

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      if ((error as Error).name === 'AbortError' && retries < 2) {
        await new Promise((resolve) => setTimeout(resolve, (retries + 1) * 2000))
        return this.makeRequest<T>(endpoint, options, skipAuth, retries + 1)
      }
      throw error
    }
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null
    try {
      const tokensStr = localStorage.getItem('authTokens')
      if (tokensStr) {
        const tokens = JSON.parse(tokensStr)
        return tokens.idToken || null
      }
    } catch {
      // ignore
    }
    return null
  }

  async connect(): Promise<ZohoBooksConnectResponse> {
    return await this.makeRequest<ZohoBooksConnectResponse>('/zoho-books/connect', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  }

  async getConnectionStatus(): Promise<ZohoBooksConnectionStatus> {
    try {
      return await this.makeRequest<ZohoBooksConnectionStatus>('/zoho-books/connections', {
        method: 'GET',
      })
    } catch {
      return { connected: false }
    }
  }

  async disconnect(): Promise<void> {
    await this.makeRequest('/zoho-books/disconnect', {
      method: 'DELETE',
    })
  }

  async importData(
    entity: 'contacts' | 'items' | 'invoices' | 'customers' | 'vendors',
    filters: ZohoBooksImportFilters = {},
    orgId?: string
  ): Promise<ZohoBooksImportResponse> {
    return await this.makeRequest<ZohoBooksImportResponse>('/zoho-books/import', {
      method: 'POST',
      body: JSON.stringify({
        entity,
        filters,
        org_id: orgId,
      }),
    })
  }

  async exportToZoho(
    uploadId: string,
    entity?: string,
    orgId?: string,
    columnMapping?: Record<string, string>
  ): Promise<ZohoBooksExportResponse> {
    return await this.makeRequest<ZohoBooksExportResponse>('/zoho-books/export', {
      method: 'POST',
      body: JSON.stringify({
        upload_id: uploadId,
        entity,
        org_id: orgId,
        column_mapping: columnMapping,
      }),
    })
  }

  async openOAuthPopup(): Promise<{ success: boolean; error?: string }> {
    return new Promise(async (resolve) => {
      try {
        const response = await this.connect()

        if (!response.auth_url) {
          resolve({ success: false, error: 'No auth URL received' })
          return
        }

        const width = 600
        const height = 700
        const left = window.screen.width / 2 - width / 2
        const top = window.screen.height / 2 - height / 2

        const authWindow = window.open(
          response.auth_url,
          'Zoho Books OAuth',
          `width=${width},height=${height},top=${top},left=${left}`
        )

        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === 'zoho-books-auth-success') {
            window.removeEventListener('message', messageHandler)
            resolve({ success: true })
          } else if (event.data.type === 'zoho-books-auth-error') {
            window.removeEventListener('message', messageHandler)
            resolve({ success: false, error: event.data.error || 'Authorization failed' })
          }
        }

        window.addEventListener('message', messageHandler)

        const pollTimer = setInterval(() => {
          if (authWindow && authWindow.closed) {
            clearInterval(pollTimer)
            window.removeEventListener('message', messageHandler)
            resolve({ success: false, error: 'Auth window closed' })
          }
        }, 500)
      } catch (error) {
        resolve({ success: false, error: (error as Error).message || 'Connection failed' })
      }
    })
  }
}

export const zohoBooksAPI = new ZohoBooksService()
export default zohoBooksAPI

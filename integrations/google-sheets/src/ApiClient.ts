import { API_BASE_URL, DEFAULT_PAGE_SIZE } from './config'
import { getAuthorizationHeader } from './Auth'
import type { ReportsCatalogResponse, ReportsResponse, ReportCatalogEntry } from './types'

export interface ApiErrorWithUpgrade extends Error {
  upgradeUrl?: string
}

function makeApiError(message: string, upgradeUrl?: string): ApiErrorWithUpgrade {
  const err = new Error(message) as ApiErrorWithUpgrade
  if (upgradeUrl) {
    err.upgradeUrl = upgradeUrl
  }
  return err
}

function extractApiErrorDetails(body: string): { message: string; upgradeUrl?: string } | null {
  if (!body) {
    return null
  }
  try {
    const parsed = JSON.parse(body) as {
      error_message?: unknown
      upgrade_url?: unknown
      google_sheet_url?: unknown
    }
    const message = typeof parsed.error_message === 'string' ? parsed.error_message.trim() : ''
    const upgradeUrlRaw =
      typeof parsed.upgrade_url === 'string'
        ? parsed.upgrade_url
        : typeof parsed.google_sheet_url === 'string'
          ? parsed.google_sheet_url
          : ''
    const upgradeUrl = upgradeUrlRaw.trim()

    if (!message) {
      return null
    }
    if (!upgradeUrl) {
      return { message }
    }
    return { message, upgradeUrl }
  } catch {
    return null
  }
}

function apiFetch(path: string, options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions): string {
  const auth = getAuthorizationHeader()
  if (!auth) {
    throw new Error('Учётные данные не заданы. Выполните вход в панели FBox Отчёты.')
  }

  const url = `${API_BASE_URL}${path}`
  const response = UrlFetchApp.fetch(url, {
    ...options,
    muteHttpExceptions: true,
    headers: {
      ...(options.headers as Record<string, string> | undefined),
      Authorization: auth,
      'Content-Type': 'application/json',
    },
  })

  const code = response.getResponseCode()
  const body = response.getContentText()
  if (code < 200 || code >= 300) {
    const details = extractApiErrorDetails(body)
    if (details) {
      throw makeApiError(details.message, details.upgradeUrl)
    }
    throw new Error(`HTTP ${code}: ${body.slice(0, 200)}`)
  }
  return body
}

export function fetchCatalog(): ReportCatalogEntry[] {
  const body = apiFetch('/reports/catalog/v3', { method: 'get' })
  const json = JSON.parse(body) as ReportsCatalogResponse
  if (!json.success) {
    throw makeApiError(
      json.error_message ?? 'Не удалось загрузить каталог отчётов',
      json.upgrade_url,
    )
  }
  return json.reports ?? []
}

export function fetchReportPage(
  payload: Record<string, unknown>,
): ReportsResponse {
  const body = apiFetch('/reports', {
    method: 'post',
    payload: JSON.stringify(payload),
  })
  const json = JSON.parse(body) as ReportsResponse
  if (!json.success) {
    throw makeApiError(
      json.error_message ?? 'Ошибка загрузки отчёта',
      json.upgrade_url ?? json.google_sheet_url,
    )
  }
  return json
}

export interface FetchAllItemsResult {
  items: Array<Record<string, unknown>>
  totalCount?: number
  truncatedByMaxRows: boolean
}

export function fetchAllReportItems(
  basePayload: Record<string, unknown>,
  pageSize: number = DEFAULT_PAGE_SIZE,
  onProgress?: (loaded: number, totalCount?: number) => void,
  maxRows?: number,
): FetchAllItemsResult {
  const items: Array<Record<string, unknown>> = []
  let pageToken: string | undefined
  let totalCount: number | undefined
  let truncatedByMaxRows = false
  const maxPages = 200

  for (let i = 0; i < maxPages; i += 1) {
    const payload: Record<string, unknown> = {
      ...basePayload,
      page_size: pageSize,
    }
    if (pageToken) {
      payload.page_token = pageToken
    }

    const page = fetchReportPage(payload)
    if (page.total_count !== undefined) {
      totalCount = page.total_count
    }

    const pageItems = page.items ?? []
    for (let j = 0; j < pageItems.length; j += 1) {
      if (maxRows !== undefined && maxRows > 0 && items.length >= maxRows) {
        truncatedByMaxRows = true
        break
      }
      items.push(pageItems[j])
    }
    onProgress?.(items.length, totalCount)

    if (truncatedByMaxRows) {
      break
    }

    pageToken = page.page_next_token
    if (!pageToken) {
      break
    }
  }

  if (pageToken && !truncatedByMaxRows) {
    throw new Error('Отчёт слишком большой. Сузьте период или обратитесь в поддержку.')
  }

  return { items, totalCount, truncatedByMaxRows }
}

export function findCatalogEntry(
  catalog: ReportCatalogEntry[],
  reportId: number,
): ReportCatalogEntry | undefined {
  for (let i = 0; i < catalog.length; i += 1) {
    if (catalog[i].report_id === reportId) {
      return catalog[i]
    }
  }
  return undefined
}

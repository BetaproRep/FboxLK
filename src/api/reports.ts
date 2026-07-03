/**
 * Analytics reports API (`POST /reports`, `GET /reports/catalog`).
 * Used by the portal (optional) and documented for Excel / Google Sheets clients.
 */

import { apiClient } from './client'
import { itemsToRows } from '@/utils/reportRows'
import type {
  FetchAllReportPagesOptions,
  FetchAllReportPagesResult,
  ReportCatalogEntry,
  ReportsCatalogResponse,
  ReportsRequest,
  ReportsResponse,
} from '@/types/reports'

const DEFAULT_PAGE_SIZE = 5000
const DEFAULT_MAX_PAGES = 200

export async function fetchReportsCatalog(): Promise<ReportCatalogEntry[]> {
  const { data } = await apiClient.get<ReportsCatalogResponse>('/reports/catalog', {
    skipToast: true,
  } as object)
  return data.reports ?? []
}

export async function fetchReport(body: ReportsRequest): Promise<ReportsResponse> {
  const { data } = await apiClient.post<ReportsResponse>('/reports', body, {
    skipToast: true,
  } as object)
  return data
}

/**
 * Fetches all pages of a report using `page_token` / `page_next_token`.
 */
export async function fetchAllReportPages(
  baseRequest: Omit<ReportsRequest, 'page_token'>,
  options: FetchAllReportPagesOptions = {},
): Promise<FetchAllReportPagesResult> {
  const pageSize = options.pageSize ?? baseRequest.page_size ?? DEFAULT_PAGE_SIZE
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES
  const items: Array<Record<string, unknown>> = []
  let pageToken: string | undefined
  let totalCount: number | undefined
  let pagesFetched = 0

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const response = await fetchReport({
      ...baseRequest,
      page_size: pageSize,
      page_token: pageToken,
    } as ReportsRequest)

    if (!response.success) {
      throw new Error(response.error_message ?? 'Ошибка загрузки отчёта')
    }

    if (response.total_count !== undefined) {
      totalCount = response.total_count
    }

    const pageItems = response.items ?? []
    items.push(...pageItems)
    pagesFetched += 1
    options.onPage?.({ pageIndex, itemCount: pageItems.length, totalCount })

    pageToken = response.page_next_token
    if (!pageToken) {
      break
    }
  }

  if (pagesFetched >= maxPages && pageToken) {
    throw new Error(
      `Превышен лимит страниц отчёта (${maxPages}). Сузьте период или увеличьте page_size.`,
    )
  }

  return { items, totalCount, pagesFetched }
}

export function getCatalogEntry(
  catalog: ReportCatalogEntry[],
  reportId: number,
): ReportCatalogEntry | undefined {
  return catalog.find((r) => r.report_id === reportId)
}

export { itemsToRows }

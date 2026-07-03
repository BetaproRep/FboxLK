/** Report parameter kinds for catalog-driven forms (portal, Sheets). */
export type ReportParamType = 'date' | 'datetime' | 'string' | 'integer' | 'boolean' | 'select'

export interface ReportCatalogParam {
  name: string
  type: ReportParamType
  required?: boolean
  label: string
  description?: string
  /** For type `select`. */
  options?: Array<{ value: string | number; label: string }>
  default?: string | number | boolean
}

export type ReportColumnType = 'string' | 'integer' | 'number' | 'boolean' | 'date' | 'datetime'

export interface ReportCatalogColumn {
  /** Key in each `items[]` object (may match localized API field names). */
  key: string
  title: string
  type: ReportColumnType
}

export interface ReportCatalogEntry {
  report_id: number
  name: string
  description?: string
  params: ReportCatalogParam[]
  columns: ReportCatalogColumn[]
  /** Suggested page size for POST /reports (default applied server-side if omitted). */
  default_page_size?: number
  /** Soft limit hint for clients (rows). */
  max_rows_hint?: number
}

export interface ReportsCatalogResponse {
  success: boolean
  reports: ReportCatalogEntry[]
  error_code?: number
  error_message?: string
}

/** Legacy column metadata (still returned by some report types). */
export interface ReportTypeMeta {
  name: string
  type: string
}

export type ReportsRequest = {
  report_id: number
  page_size?: number
  page_token?: string
} & Record<string, string | number | boolean | undefined>

export interface ReportsResponse {
  success: boolean
  report_id?: number
  types?: ReportTypeMeta[]
  items?: Array<Record<string, unknown>>
  headers?: string[]
  rows?: Array<Array<string | number | boolean | null>>
  page_next_token?: string
  total_count?: number
  error_code?: number
  error_message?: string
}

export interface FetchAllReportPagesOptions {
  pageSize?: number
  maxPages?: number
  onPage?: (info: { pageIndex: number; itemCount: number; totalCount?: number }) => void
}

export interface FetchAllReportPagesResult {
  items: Array<Record<string, unknown>>
  totalCount?: number
  pagesFetched: number
}

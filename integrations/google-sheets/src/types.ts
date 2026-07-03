export interface ReportCatalogParam {
  name: string
  type: string
  required?: boolean
  label: string
  options?: Array<{ value: string | number; label: string }>
}

export interface ReportCatalogColumn {
  key: string
  title: string
  type: string
  /** Подсказка при наведении на заголовок (note в ячейке). */
  description?: string
}

export interface ReportCatalogEntry {
  report_id: number
  name: string
  description?: string
  params: ReportCatalogParam[]
  columns: ReportCatalogColumn[]
  default_page_size?: number
  max_rows_hint?: number
}

export interface ReportsCatalogResponse {
  success: boolean
  reports?: ReportCatalogEntry[]
  error_message?: string
  upgrade_url?: string
  google_sheet_url?: string
}

export interface ReportsResponse {
  success: boolean
  items?: Array<Record<string, unknown>>
  page_next_token?: string
  total_count?: number
  error_message?: string
  upgrade_url?: string
  google_sheet_url?: string
}

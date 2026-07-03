/** API base URL without trailing slash. */
export const API_BASE_URL = 'https://lpw.betta.ru:8084/grh/api'

/** Единственный служебный лист в мастер-копии (скрипт не перезаписывает). */
export const SHEET_INSTRUCTIONS = 'Инструкция'

/** Rows per setValues chunk (Google payload limits). */
export const WRITE_CHUNK_ROWS = 5000

/** Default page size when requesting report data. */
export const DEFAULT_PAGE_SIZE = 5000

export const CATALOG_CACHE_SECONDS = 900

export const AUTH_PROPERTY_KEY = 'fbox_basic_auth'
export const AUTH_PARTNER_KEY = 'fbox_partner_id'

export const PARAMS_KEY_PREFIX = 'fbox_params_'

export const LAST_REPORT_ID_KEY = 'fbox_last_report_id'

export const LOAD_PROGRESS_KEY = 'fbox_load_progress'

/** Header row index (1-based). */
export const REPORT_HEADER_ROW = 3

/** First data row index (1-based). */
export const REPORT_DATA_START_ROW = 4

/** Строк данных (без заголовка таблицы) для подбора ширины столбцов. */
export const AUTO_RESIZE_MAX_DATA_ROWS = 500

/**
 * Макс. строк данных для умной таблицы через API (`addTable`).
 * 0 = без лимита, создавать всегда (для сравнения с UI «Преобразовать в таблицу»).
 */
export const SMART_TABLE_MAX_DATA_ROWS = 0

/** Выше порога не переключать активный лист автоматически (меньше лагов UI). */
export const SKIP_ACTIVATE_SHEET_ABOVE_ROWS = 5000

/** Имена Tables уникальны в пределах книги — включаем sheetId листа. */
export function tableNameForSheet(reportId: number, sheetId: number): string {
  return `FBoxReport_${reportId}_${sheetId}`
}

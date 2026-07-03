import { DEFAULT_PAGE_SIZE } from './config'
import {
  clearAuthorization,
  getPartnerIdHint,
  hasAuthorization,
  setAuthorization,
} from './Auth'
import { clearCatalogCache, getCatalogCached, putCatalogCache, refreshCatalogCache } from './Catalog'
import {
  fetchAllReportItems,
  fetchCatalog,
  findCatalogEntry,
  type ApiErrorWithUpgrade,
} from './ApiClient'
import { LoadProfiler } from './LoadProfiler'
import { clearLoadProgress, getLoadProgress, setLoadProgress } from './LoadProgress'
import {
  loadLastReportId,
  loadReportParams,
  saveLastReportId,
  saveReportParams,
} from './ParamStore'
import { ensureSpreadsheetOpenTrigger } from './Addon'
import { canonicalSheetName } from './SheetNames'
import { writeReportToSheet } from './ReportWriter'
import type { ReportCatalogEntry } from './types'

function extractErrorDetails(e: unknown): { message: string; upgradeUrl?: string } {
  if (e instanceof Error) {
    return {
      message: e.message,
      upgradeUrl: (e as ApiErrorWithUpgrade).upgradeUrl,
    }
  }
  return { message: String(e) }
}

function formatDateParam(value: unknown): string {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd')
  }
  const s = String(value ?? '').trim()
  if (!s) {
    throw new Error('Укажите значение даты.')
  }
  return s.slice(0, 10)
}

function buildPayloadFromParams(
  entry: ReportCatalogEntry,
  params: Record<string, unknown>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    report_id: entry.report_id,
  }

  for (let i = 0; i < entry.params.length; i += 1) {
    const p = entry.params[i]
    const raw = params[p.name]
    if (raw === undefined || raw === null || raw === '') {
      if (p.required) {
        throw new Error(`Не задан параметр: ${p.label}`)
      }
      continue
    }
    if (p.type === 'date' || p.type === 'datetime') {
      payload[p.name] = formatDateParam(raw)
    } else if (p.type === 'integer') {
      payload[p.name] = Number(raw)
    } else if (p.type === 'boolean') {
      payload[p.name] = raw === true || raw === 'true' || raw === 1 || raw === '1'
    } else {
      payload[p.name] = raw
    }
  }

  return payload
}

function loadReportCore(
  params: Record<string, unknown>,
  reportId: number,
): {
  rowCount: number
  sheetName: string
  profile: string[]
  truncatedByMaxRows: boolean
  maxRows?: number
} {
  const catalog = getCatalogCached()
  const entry = findCatalogEntry(catalog, reportId)
  if (!entry) {
    throw new Error(`Отчёт report_id=${reportId} не найден в каталоге.`)
  }

  const pageSize = entry.default_page_size ?? DEFAULT_PAGE_SIZE
  const payload = buildPayloadFromParams(entry, params)
  const maxRows = entry.max_rows_hint && entry.max_rows_hint > 0 ? entry.max_rows_hint : undefined

  clearLoadProgress()
  setLoadProgress('Загрузка отчёта…')

  const profiler = new LoadProfiler(setLoadProgress)

  const { items, totalCount, truncatedByMaxRows } = fetchAllReportItems(
    payload,
    pageSize,
    (loaded, total) => {
      const hint = total !== undefined ? ` / ${total}` : ''
      setLoadProgress(`API: загружено ${loaded}${hint} строк`)
    },
    maxRows,
  )
  profiler.mark('api_fetch', `API готово: ${items.length} строк`)

  if (truncatedByMaxRows && maxRows) {
    const totalHint = totalCount !== undefined ? ` (всего ${totalCount})` : ''
    setLoadProgress(`Загружено ${items.length} строк${totalHint}; достигнут предел ${maxRows}`)
  } else if (entry.max_rows_hint && totalCount && totalCount > entry.max_rows_hint) {
    setLoadProgress(
      `Загружено ${items.length} строк (всего ${totalCount}, рекомендуемый предел ${entry.max_rows_hint})`,
    )
  }

  writeReportToSheet(entry, params, items, profiler)
  saveReportParams(reportId, params)
  saveLastReportId(reportId)
  profiler.mark('save_params')

  clearLoadProgress()
  return {
    rowCount: items.length,
    sheetName: canonicalSheetName(entry),
    profile: profiler.formatSummary(),
    truncatedByMaxRows,
    maxRows,
  }
}

export function loginSidebar(
  partnerId: string,
  password: string,
): {
  ok: boolean
  message?: string
  catalog?: ReportCatalogEntry[]
  partnerId?: string
  lastReportId?: number | null
  upgradeUrl?: string
} {
  const login = String(partnerId ?? '').trim()
  if (!login) {
    return { ok: false, message: 'Укажите код партнёра.' }
  }
  if (!password) {
    return { ok: false, message: 'Укажите пароль.' }
  }

  try {
    setAuthorization(login, password)
    ensureSpreadsheetOpenTrigger()
    const catalog = fetchCatalogFromApi()
    return { ok: true, catalog, partnerId: login, lastReportId: loadLastReportId() }
  } catch (e) {
    clearAuthorization()
    clearCatalogCache()
    const details = extractErrorDetails(e)
    return { ok: false, message: details.message, upgradeUrl: details.upgradeUrl }
  }
}

function fetchCatalogFromApi(): ReportCatalogEntry[] {
  const catalog = fetchCatalog()
  putCatalogCache(catalog)
  return catalog
}

export function logoutSidebar(): { ok: boolean } {
  clearAuthorization()
  clearCatalogCache()
  clearLoadProgress()
  return { ok: true }
}

export function refreshCatalogSidebar(): {
  ok: boolean
  message?: string
  catalog?: ReportCatalogEntry[]
  upgradeUrl?: string
} {
  if (!hasAuthorization()) {
    return { ok: false, message: 'Сначала выполните вход.' }
  }
  try {
    const catalog = refreshCatalogCache()
    return { ok: true, catalog }
  } catch (e) {
    const details = extractErrorDetails(e)
    return { ok: false, message: details.message, upgradeUrl: details.upgradeUrl }
  }
}

export function getSidebarState(): {
  isLoggedIn: boolean
  partnerId: string | null
  catalog: ReportCatalogEntry[]
  lastReportId: number | null
} {
  if (!hasAuthorization()) {
    return { isLoggedIn: false, partnerId: null, catalog: [], lastReportId: null }
  }
  try {
    const catalog = getCatalogCached()
    return {
      isLoggedIn: true,
      partnerId: getPartnerIdHint(),
      catalog,
      lastReportId: loadLastReportId(),
    }
  } catch {
    return {
      isLoggedIn: true,
      partnerId: getPartnerIdHint(),
      catalog: [],
      lastReportId: loadLastReportId(),
    }
  }
}

export function getSavedParams(reportId: number): Record<string, unknown> | null {
  return loadReportParams(reportId)
}

export function loadReportFromSidebar(form: {
  report_id: number
  params: Record<string, unknown>
}): {
  ok: boolean
  message: string
  profile?: string[]
  lastReportId?: number
  upgradeUrl?: string
} {
  if (!hasAuthorization()) {
    return { ok: false, message: 'Сначала выполните вход.' }
  }
  try {
    const result = loadReportCore(form.params, form.report_id)
    const truncateNote =
      result.truncatedByMaxRows && result.maxRows
        ? ` (достигнут предел ${result.maxRows})`
        : ''
    return {
      ok: true,
      message: `Готово: ${result.rowCount} строк на листе «${result.sheetName}»${truncateNote}`,
      profile: result.profile,
      lastReportId: form.report_id,
    }
  } catch (e) {
    clearLoadProgress()
    const details = extractErrorDetails(e)
    return { ok: false, message: details.message, upgradeUrl: details.upgradeUrl }
  }
}

export function getLoadProgressMessage(): string {
  return getLoadProgress()
}

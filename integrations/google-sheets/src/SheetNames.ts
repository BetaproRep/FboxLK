import type { ReportCatalogEntry, ReportCatalogParam } from './types'

const FORBIDDEN = /[\\/?*[\]]/g
const MAX_SHEET_NAME_LEN = 100

export function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(FORBIDDEN, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned) {
    return 'Отчет'
  }
  if (cleaned.length <= MAX_SHEET_NAME_LEN) {
    return cleaned
  }
  return cleaned.slice(0, MAX_SHEET_NAME_LEN).trim()
}

export function canonicalSheetName(entry: ReportCatalogEntry): string {
  return sanitizeSheetName(`${entry.report_id} - ${entry.name}`)
}

export function formatParamDisplay(p: ReportCatalogParam, raw: unknown): string {
  if (raw === undefined || raw === null || raw === '') {
    return ''
  }
  if (p.type === 'boolean') {
    return raw === true || raw === 'true' || raw === 1 || raw === '1' ? 'да' : 'нет'
  }
  if (p.type === 'date' || p.type === 'datetime') {
    const s = String(raw).slice(0, 10)
    const parts = s.split('-')
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0].slice(-2)}`
    }
  }
  return String(raw)
}

export function resolveReportSheet(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  entry: ReportCatalogEntry,
): GoogleAppsScript.Spreadsheet.Sheet {
  const name = canonicalSheetName(entry)
  let sheet = ss.getSheetByName(name)
  if (!sheet) {
    sheet = ss.insertSheet(name)
  }
  return sheet
}

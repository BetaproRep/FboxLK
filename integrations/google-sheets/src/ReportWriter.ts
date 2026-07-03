import {
  AUTO_RESIZE_MAX_DATA_ROWS,
  REPORT_DATA_START_ROW,
  REPORT_HEADER_ROW,
  SKIP_ACTIVATE_SHEET_ABOVE_ROWS,
  SMART_TABLE_MAX_DATA_ROWS,
  WRITE_CHUNK_ROWS,
  tableNameForSheet,
} from './config'
import type { LoadProfiler } from './LoadProfiler'
import { canonicalSheetName, formatParamDisplay, resolveReportSheet } from './SheetNames'
import type { ReportCatalogColumn, ReportCatalogEntry } from './types'

const DATETIME_FORMAT = 'dd.mm.yyyy hh:mm'
const DATE_FORMAT = 'dd.mm.yyyy'
const TITLE_FONT_SIZE = 12

type TitleSegmentStyle = 'normal' | 'bold' | 'italic'

interface TitleSegment {
  text: string
  style: TitleSegmentStyle
}

function formatReportGeneratedAt(): string {
  const tz = Session.getScriptTimeZone()
  const now = new Date()
  const datePart = Utilities.formatDate(now, tz, 'dd.MM.yy')
  const timePart = Utilities.formatDate(now, tz, 'HH:mm')
  return `Сформировано ${datePart} в ${timePart}`
}

function titleStyleFor(kind: TitleSegmentStyle): GoogleAppsScript.Spreadsheet.TextStyle {
  const builder = SpreadsheetApp.newTextStyle().setFontSize(TITLE_FONT_SIZE)
  if (kind === 'bold') {
    builder.setBold(true)
  }
  if (kind === 'italic') {
    builder.setItalic(true)
  }
  return builder.build()
}

function cellValue(value: unknown): string | number | boolean {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'object') {
    return String(value)
  }
  return value as string | number | boolean
}

function buildDataMatrix(
  entry: ReportCatalogEntry,
  items: Array<Record<string, unknown>>,
): unknown[][] {
  const headers = entry.columns.map((c) => c.title)
  const rows = items.map((item) =>
    entry.columns.map((col: ReportCatalogColumn) => {
      const raw = item[col.key]
      if (col.type === 'string' && raw !== null && raw !== undefined) {
        // Для string-колонок сохраняем значение как текст (в т.ч. лидирующие нули).
        return String(raw)
      }
      return cellValue(raw)
    }),
  )
  return [headers, ...rows]
}

function columnIndexToA1(columnIndex: number): string {
  let col = columnIndex
  let label = ''
  while (col > 0) {
    const rem = (col - 1) % 26
    label = String.fromCharCode(65 + rem) + label
    col = Math.floor((col - 1) / 26)
  }
  return label
}

function a1SheetName(name: string): string {
  return `'${name.replace(/'/g, "''")}'`
}

function tryWriteMatrixViaSheetsApi(
  spreadsheetId: string,
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  startRow: number,
  matrix: unknown[][],
): boolean {
  const valuesApi = Sheets.Spreadsheets?.Values
  if (!valuesApi?.batchUpdate) {
    return false
  }

  const colCount = (matrix[0] as unknown[]).length
  const endCol = columnIndexToA1(colCount)
  const sheetPrefix = a1SheetName(sheet.getName())
  const data: GoogleAppsScript.Sheets.Schema.ValueRange[] = []

  for (let offset = 0; offset < matrix.length; offset += WRITE_CHUNK_ROWS) {
    const chunk = matrix.slice(offset, offset + WRITE_CHUNK_ROWS)
    const rowStart = startRow + offset
    const rowEnd = rowStart + chunk.length - 1
    data.push({
      range: `${sheetPrefix}!A${rowStart}:${endCol}${rowEnd}`,
      majorDimension: 'ROWS',
      values: chunk as string[][],
    })
  }

  try {
    valuesApi.batchUpdate(
      {
        // RAW предотвращает автоматическое преобразование строк в числа/даты.
        valueInputOption: 'RAW',
        data,
      },
      spreadsheetId,
    )
    return true
  } catch (e) {
    Logger.log(`Values.batchUpdate fallback to setValues: ${e}`)
    return false
  }
}

function writeMatrixAtRow(
  spreadsheetId: string,
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  startRow: number,
  matrix: unknown[][],
  profiler?: LoadProfiler,
): void {
  if (tryWriteMatrixViaSheetsApi(spreadsheetId, sheet, startRow, matrix)) {
    profiler?.mark('write_values_api')
    return
  }

  const colCount = (matrix[0] as unknown[]).length
  const totalRows = matrix.length

  if (totalRows <= WRITE_CHUNK_ROWS) {
    sheet.getRange(startRow, 1, totalRows, colCount).setValues(matrix as string[][])
    profiler?.mark('write_values_setValues')
    return
  }

  let row = startRow
  let offset = 0
  while (offset < totalRows) {
    const chunk = matrix.slice(offset, offset + WRITE_CHUNK_ROWS)
    const chunkLen = chunk.length
    sheet.getRange(row, 1, chunkLen, colCount).setValues(chunk as string[][])
    row += chunkLen
    offset += WRITE_CHUNK_ROWS
  }
  SpreadsheetApp.flush()
  profiler?.mark('write_values_setValues')
}

/** A1: описание + параметры; значения параметров — жирным. Строка 2 пустая (под UI таблицы). */
function setTitleRow(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  entry: ReportCatalogEntry,
  params: Record<string, unknown>,
): void {
  const description = entry.description ?? entry.name
  const segments: TitleSegment[] = [{ text: description, style: 'normal' }]

  let firstParam = true
  for (let i = 0; i < entry.params.length; i += 1) {
    const p = entry.params[i]
    const display = formatParamDisplay(p, params[p.name])
    if (!display) {
      continue
    }
    if (firstParam) {
      segments.push({ text: ' ', style: 'normal' })
      firstParam = false
    } else {
      segments.push({ text: ', ', style: 'normal' })
    }
    segments.push({ text: `${p.label}: `, style: 'normal' })
    segments.push({ text: display, style: 'bold' })
  }

  segments.push({ text: ` ${formatReportGeneratedAt()}`, style: 'italic' })

  const fullText = segments.map((s) => s.text).join('')
  const builder = SpreadsheetApp.newRichTextValue().setText(fullText)
  builder.setTextStyle(0, fullText.length, titleStyleFor('normal'))
  let offset = 0
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i]
    if (seg.style !== 'normal') {
      builder.setTextStyle(offset, offset + seg.text.length, titleStyleFor(seg.style))
    }
    offset += seg.text.length
  }
  const titleCell = sheet.getRange(1, 1)
  try {
    titleCell.breakApart()
  } catch {
    // ячейка могла быть не объединена
  }
  titleCell
    .setRichTextValue(builder.build())
    .setWrap(false)
    .setVerticalAlignment('top')
    .setFontSize(TITLE_FONT_SIZE)

  sheet.getRange(2, 1).clearContent()
}

function applyColumnFormats(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  entry: ReportCatalogEntry,
  dataRowCount: number,
): void {
  if (dataRowCount <= 0) {
    return
  }
  for (let col = 0; col < entry.columns.length; col += 1) {
    const type = entry.columns[col].type
    const range = sheet.getRange(REPORT_DATA_START_ROW, col + 1, dataRowCount, 1)
    if (type === 'string') {
      range.setNumberFormat('@')
      continue
    }
    if (type === 'date' || type === 'datetime') {
      range.setNumberFormat(type === 'datetime' ? DATETIME_FORMAT : DATE_FORMAT)
    }
  }
}

function applyHeaderNotes(sheet: GoogleAppsScript.Spreadsheet.Sheet, entry: ReportCatalogEntry): void {
  for (let col = 0; col < entry.columns.length; col += 1) {
    const column = entry.columns[col]
    const note = column.description?.trim()
    if (!note) {
      continue
    }
    sheet.getRange(REPORT_HEADER_ROW, col + 1).setNote(note)
  }
}

function columnWidthFromMaxDisplayLength(maxLen: number): number {
  return Math.min(Math.max(maxLen * 7 + 24, 72), 420)
}

/** Подбор ширины по заголовку таблицы и первым N строкам данных; A1 не учитывается. */
function autoResizeDataColumns(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  headerRow: number,
  lastRow: number,
  colCount: number,
): void {
  if (colCount < 1 || lastRow < headerRow) {
    return
  }

  try {
    const sampleLastRow = Math.min(lastRow, headerRow + AUTO_RESIZE_MAX_DATA_ROWS)
    const numRows = sampleLastRow - headerRow + 1
    const values = sheet.getRange(headerRow, 1, numRows, colCount).getDisplayValues()

    for (let col = 0; col < colCount; col += 1) {
      let maxLen = 8
      for (let row = 0; row < values.length; row += 1) {
        const len = String(values[row][col] ?? '').length
        if (len > maxLen) {
          maxLen = len
        }
      }
      sheet.setColumnWidth(col + 1, columnWidthFromMaxDisplayLength(maxLen))
    }
  } catch (e) {
    Logger.log(`autoResizeColumns skipped: ${e}`)
  }
}

function removeExistingReportTable(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  reportId: number,
): void {
  deleteSmartTableByName(
    spreadsheet.getId(),
    sheet.getSheetId(),
    tableNameForSheet(reportId, sheet.getSheetId()),
  )
}

function removeSheetFilter(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  const filter = sheet.getFilter()
  if (filter) {
    filter.remove()
  }
}

function deleteSmartTableByName(
  spreadsheetId: string,
  sheetId: number,
  tableName: string,
): void {
  const sheetsApi = Sheets.Spreadsheets
  if (!sheetsApi) {
    return
  }

  try {
    const meta = sheetsApi.get(spreadsheetId, {
      fields: 'sheets(properties.sheetId,tables(tableId,name))',
    })
    const requests: GoogleAppsScript.Sheets.Schema.Request[] = []
    const sheets = (meta.sheets ?? []) as Array<{
      properties?: { sheetId?: number }
      tables?: Array<{ tableId?: string; name?: string }>
    }>
    for (let i = 0; i < sheets.length; i += 1) {
      const sh = sheets[i]
      if (sh.properties?.sheetId !== sheetId) {
        continue
      }
      const tables = sh.tables ?? []
      for (let t = 0; t < tables.length; t += 1) {
        const table = tables[t]
        if (table.name === tableName && table.tableId) {
          requests.push({
            deleteTable: { tableId: table.tableId },
          } as unknown as GoogleAppsScript.Sheets.Schema.Request)
        }
      }
    }
    if (requests.length > 0) {
      sheetsApi.batchUpdate({ requests }, spreadsheetId)
    }
  } catch (e) {
    Logger.log(`deleteTable skipped: ${e}`)
  }
}

function tryAddSmartTable(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  headerRow: number,
  totalTableRows: number,
  colCount: number,
  reportId: number,
): boolean {
  const sheetsApi = Sheets.Spreadsheets
  if (!sheetsApi) {
    return false
  }

  const sheetId = sheet.getSheetId()
  const tableName = tableNameForSheet(reportId, sheetId)

  const startRowIndex = headerRow - 1
  const endRowIndex = startRowIndex + totalTableRows
  const requests = [
    {
      addTable: {
        table: {
          name: tableName,
          range: {
            sheetId,
            startRowIndex,
            endRowIndex,
            startColumnIndex: 0,
            endColumnIndex: colCount,
          },
        },
      },
    },
  ] as unknown as GoogleAppsScript.Sheets.Schema.Request[]

  try {
    sheetsApi.batchUpdate({ requests }, spreadsheet.getId())
    sheet.setFrozenRows(REPORT_HEADER_ROW)
    return true
  } catch (e) {
    Logger.log(`Smart table (addTable) skipped: ${e}`)
    return false
  }
}

function ensureDataFilter(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  headerRow: number,
  totalTableRows: number,
  colCount: number,
): void {
  const range = sheet.getRange(headerRow, 1, totalTableRows, colCount)
  const existing = range.getFilter()
  if (existing) {
    existing.remove()
  }
  range.createFilter()
  sheet.setFrozenRows(REPORT_HEADER_ROW)
}

function shouldUseSmartTable(dataRowCount: number): boolean {
  if (SMART_TABLE_MAX_DATA_ROWS <= 0) {
    return true
  }
  return dataRowCount <= SMART_TABLE_MAX_DATA_ROWS
}

function ensureTableLayout(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  entry: ReportCatalogEntry,
  dataMatrixRowCount: number,
  dataRowCount: number,
  colCount: number,
  profiler?: LoadProfiler,
): void {
  if (dataMatrixRowCount < 1 || colCount < 1) {
    return
  }

  if (!shouldUseSmartTable(dataRowCount)) {
    sheet.setFrozenRows(REPORT_HEADER_ROW)
    profiler?.mark('table_layout_skip')
    return
  }

  profiler?.mark('table_layout_start', `Умная таблица (${dataRowCount} строк)…`)
  if (!tryAddSmartTable(spreadsheet, sheet, REPORT_HEADER_ROW, dataMatrixRowCount, colCount, entry.report_id)) {
    ensureDataFilter(sheet, REPORT_HEADER_ROW, dataMatrixRowCount, colCount)
  }
  profiler?.mark('table_layout')
}

export function writeReportToSheet(
  entry: ReportCatalogEntry,
  params: Record<string, unknown>,
  items: Array<Record<string, unknown>>,
  profiler?: LoadProfiler,
): void {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = resolveReportSheet(ss, entry)

  profiler?.mark('sheet_resolve', 'Подготовка листа…')
  sheet.clear()
  sheet.clearFormats()
  removeSheetFilter(sheet)
  removeExistingReportTable(ss, sheet, entry.report_id)
  profiler?.mark('sheet_clear')

  const colCount = entry.columns.length

  if (items.length === 0) {
    const headers = entry.columns.map((c) => c.title)
    sheet.getRange(REPORT_HEADER_ROW, 1, 1, headers.length).setValues([headers])
    applyHeaderNotes(sheet, entry)
    autoResizeDataColumns(sheet, REPORT_HEADER_ROW, REPORT_HEADER_ROW, colCount)
    profiler?.mark('column_width_done')
    setTitleRow(sheet, entry, params)
    profiler?.mark('title_row')
    profiler?.mark('empty_sheet_layout')
    ss.setActiveSheet(sheet)
    profiler?.mark('activate_sheet')
    return
  }

  profiler?.mark('build_matrix_start', `Подготовка ${items.length} строк…`)
  const matrix = buildDataMatrix(entry, items)
  profiler?.mark('build_matrix', `Запись ${items.length} строк на лист…`)
  writeMatrixAtRow(ss.getId(), sheet, REPORT_HEADER_ROW, matrix, profiler)
  const lastRow = REPORT_HEADER_ROW + matrix.length - 1
  profiler?.mark('formats_start', 'Форматирование…')
  applyColumnFormats(sheet, entry, items.length)
  applyHeaderNotes(sheet, entry)
  profiler?.mark(
    'formats_notes',
    shouldUseSmartTable(items.length) ? 'Умная таблица…' : 'Закрепление заголовка…',
  )
  ensureTableLayout(ss, sheet, entry, matrix.length, items.length, colCount, profiler)
  profiler?.mark('column_width', 'Ширина столбцов…')
  autoResizeDataColumns(sheet, REPORT_HEADER_ROW, lastRow, colCount)
  profiler?.mark('column_width_done')
  setTitleRow(sheet, entry, params)
  profiler?.mark('title_row')
  if (items.length <= SKIP_ACTIVATE_SHEET_ABOVE_ROWS) {
    ss.setActiveSheet(sheet)
  }
  profiler?.mark('activate_sheet')
}

export { canonicalSheetName }

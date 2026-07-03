/**
 * Dashboard data contract.
 *
 * Source of truth for the GET /web/dashboard endpoint that powers the V1 Operational
 * dashboard. The UI consumes data through `fetchDashboardSummary` (via
 * `useDashboardData`) so swapping the transport stays a single-file concern.
 */

import { apiClient } from './client'
import { GOOGLE_SHEETS_TEMPLATE_URL } from '@/config/googleSheets'

export type PeriodKey =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'prev_week'
  | 'this_month'
  | 'prev_month'

export interface DashboardTimeSeriesPoint {
  date: string
  value: number
}

export interface DocsItems {
  docs: number
  items: number
}

export interface DashboardOrdersCard {
  waiting: number
  inwork: number
}

export interface DashboardGoodsSupplyCard {
  waiting: DocsItems
  inwork: DocsItems
}

export interface DashboardGoodsShipmentCard {
  waiting: DocsItems
  inwork: DocsItems
}

export interface DashboardReport {
  file_name: string
  is_custom: boolean
  url: string
}

/** @deprecated Используйте `google_sheets`. Fallback: [{ name, url }]. */
export interface DashboardGoogleSheetsReport {
  name: string
  url: string
  is_custom?: boolean
}

/** Подключение аналитики в Google Таблицах (GET /web/dashboard). */
export interface DashboardGoogleSheets {
  enabled?: boolean
  google_sheet_url: string
  link_label?: string
  modal_title?: string
  summary?: string
  description_paragraphs?: string[]
  steps?: string[]
  requirements?: string[]
}

export interface DashboardTableRow {
  key: string
  label: string
  values: Partial<Record<PeriodKey, number>>
  time_series?: DashboardTimeSeriesPoint[]
}

export interface DashboardTable {
  rows: DashboardTableRow[]
}

export interface DashboardData {
  cards?: {
    orders?: DashboardOrdersCard
    goods_supply?: DashboardGoodsSupplyCard
    goods_shipment?: DashboardGoodsShipmentCard
  }
  reports?: DashboardReport[]
  /** Предпочтительный блок для Google Таблиц. */
  google_sheets?: DashboardGoogleSheets
  /** @deprecated → `google_sheets` */
  google_sheets_reports?: DashboardGoogleSheetsReport[]
  tables?: {
    orders?: DashboardTable
    goods?: DashboardTable
  }
}

export async function fetchDashboardSummary(): Promise<DashboardData> {
  const { data } = await apiClient.get<{ success: boolean } & DashboardData>(
    '/web/dashboard',
  )
  return {
    cards: data.cards,
    reports: data.reports,
    google_sheets: data.google_sheets,
    google_sheets_reports: data.google_sheets_reports,
    tables: data.tables,
  }
}

const DEFAULT_GOOGLE_SHEETS_STEPS = [
  'Откройте ссылку ниже и нажмите «Создать копию» — таблица сохранится в ваш Google Drive.',
  'При открытии файла откроется панель FBox Отчёты (или меню FBox Отчёты → Открыть панель).',
  'Введите код партнёра и пароль API (как в личном кабинете) и нажмите «Войти».',
  'Выберите отчёт, укажите параметры и нажмите «Обновить отчёт».',
]

const DEFAULT_GOOGLE_SHEETS_REQUIREMENTS = [
  'Аккаунт Google с доступом к Google Таблицам.',
  'Код партнёра и пароль API — те же, что для входа в личный кабинет.',
]

/** Нормализация блока Google Таблиц: API → legacy → env. */
export function resolveDashboardGoogleSheets(
  data: Pick<DashboardData, 'google_sheets' | 'google_sheets_reports'>,
): DashboardGoogleSheets | null {
  const gs = data.google_sheets
  if (gs?.google_sheet_url?.trim() && gs.enabled !== false) {
    return {
      ...gs,
      google_sheet_url: gs.google_sheet_url.trim(),
      steps: gs.steps?.length ? gs.steps : DEFAULT_GOOGLE_SHEETS_STEPS,
      requirements: gs.requirements?.length ? gs.requirements : DEFAULT_GOOGLE_SHEETS_REQUIREMENTS,
      link_label: gs.link_label ?? 'Создать копию шаблона',
      modal_title: gs.modal_title ?? 'Отчёты в Google Таблицах',
    }
  }

  const legacy = data.google_sheets_reports
  if (legacy?.length && legacy[0].url?.trim()) {
    return {
      google_sheet_url: legacy[0].url.trim(),
      link_label: legacy[0].name || 'Создать копию шаблона',
      modal_title: 'Отчёты в Google Таблицах',
      steps: DEFAULT_GOOGLE_SHEETS_STEPS,
      requirements: DEFAULT_GOOGLE_SHEETS_REQUIREMENTS,
    }
  }

  if (GOOGLE_SHEETS_TEMPLATE_URL.includes('REPLACE_WITH_MASTER_SHEET_ID')) {
    return null
  }

  return {
    google_sheet_url: GOOGLE_SHEETS_TEMPLATE_URL,
    link_label: 'Создать копию шаблона',
    modal_title: 'Отчёты в Google Таблицах',
    steps: DEFAULT_GOOGLE_SHEETS_STEPS,
    requirements: DEFAULT_GOOGLE_SHEETS_REQUIREMENTS,
  }
}

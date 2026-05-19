/**
 * Dashboard data contract.
 *
 * Source of truth for the GET /web/dashboard endpoint that powers the V1 Operational
 * dashboard. The UI consumes data through `fetchDashboardSummary` (via
 * `useDashboardData`) so swapping the transport stays a single-file concern.
 */

import { apiClient } from './client'

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
    tables: data.tables,
  }
}

import { useEffect, useState, type ReactNode } from 'react'
import Spinner from '@/components/ui/Spinner'
import { useDashboardData } from '../hooks/useDashboardData'
import PeriodTable from '../components/PeriodTable'
import TableTimeSeriesChart from '../components/TableTimeSeriesChart'
import { fmt } from '../utils/fmt'
import InlineHelpPanel, { HelpIconButton } from '@/components/ui/InlineHelpPanel'
import { getTabHelp } from '@/content/pageHelp'
import { usePageHelpWriterMode } from '@/content/authoringState'
import {
  resolveDashboardGoogleSheets,
  type DashboardOrdersCard,
  type DashboardGoodsSupplyCard,
  type DashboardGoodsShipmentCard,
  type DocsItems,
} from '@/api/dashboard'
import AnalyticsReportsCard from '../components/AnalyticsReportsCard'

function isPresent<T>(v: T | undefined | null): v is T {
  if (v === undefined || v === null) return false
  if (Array.isArray(v) && v.length === 0) return false
  if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0) {
    return false
  }
  return true
}

const CARDS_GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
}

function NumCell({ value, tone }: { value: number; tone: string }) {
  const cls = value < 0 ? 'text-red-600' : tone
  return <span className={`tabular-nums text-right font-semibold ${cls}`}>{fmt(value)}</span>
}

function OrdersCard({ data }: { data: DashboardOrdersCard }) {
  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm shadow-sm">
      <div className="font-semibold text-sky-900 mb-2">Заказы</div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sky-900/90">В ожидании</span>
          <NumCell value={data.waiting} tone="text-sky-900" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sky-900/90">В работе</span>
          <NumCell value={data.inwork} tone="text-sky-900" />
        </div>
      </div>
    </div>
  )
}

interface DocsItemsCardProps {
  title: string
  borderClass: string
  bgClass: string
  textClass: string
  textMuted: string
  rows: Array<{ label: string; value: DocsItems }>
}

function DocsItemsCard({
  title,
  borderClass,
  bgClass,
  textClass,
  textMuted,
  rows,
}: DocsItemsCardProps) {
  return (
    <div className={`rounded-lg border ${borderClass} ${bgClass} px-4 py-3 text-sm shadow-sm`}>
      <div className={`grid grid-cols-[minmax(0,1fr)_72px_96px] gap-x-4 mb-2 font-semibold ${textClass}`}>
        <span>{title}</span>
        <span className="tabular-nums text-right">заданий</span>
        <span className="tabular-nums text-right">товаров</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_72px_96px] gap-x-4 gap-y-1.5">
        {rows.map((r) => (
          <RowFragment key={r.label} label={r.label} value={r.value} textMuted={textMuted} tone={textClass} />
        ))}
      </div>
    </div>
  )
}

function RowFragment({
  label,
  value,
  textMuted,
  tone,
}: {
  label: string
  value: DocsItems
  textMuted: string
  tone: string
}) {
  return (
    <>
      <span className={textMuted}>{label}</span>
      <NumCell value={value.docs} tone={tone} />
      <NumCell value={value.items} tone={tone} />
    </>
  )
}

function GoodsSupplyCard({ data }: { data: DashboardGoodsSupplyCard }) {
  return (
    <DocsItemsCard
      title="Поставка товаров"
      borderClass="border-emerald-200"
      bgClass="bg-emerald-50"
      textClass="text-emerald-900"
      textMuted="text-emerald-900/90"
      rows={[
        { label: 'В ожидании',     value: data.waiting },
        { label: 'В работе',       value: data.inwork },
      ]}
    />
  )
}

function GoodsShipmentCard({ data }: { data: DashboardGoodsShipmentCard }) {
  return (
    <DocsItemsCard
      title="Отгрузка товаров"
      borderClass="border-yellow-200"
      bgClass="bg-yellow-50"
      textClass="text-yellow-900"
      textMuted="text-yellow-900/90"
      rows={[
        { label: 'В ожидании',       value: data.waiting },
        { label: 'В работе',         value: data.inwork },
      ]}
    />
  )
}

export default function V1Operational() {
  const writerMode = usePageHelpWriterMode()
  const tabHelp = getTabHelp('dashboard', 'v1')
  const [tabHelpOpen, setTabHelpOpen] = useState(false)
  const { data, isLoading, error } = useDashboardData()
  useEffect(() => {
    if (writerMode) setTabHelpOpen(true)
  }, [writerMode])

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    )
  }
  if (error) {
    return <div className="text-red-600">Ошибка загрузки</div>
  }

  const cards: ReactNode[] = []
  if (isPresent(data.cards?.orders)) {
    cards.push(<OrdersCard key="orders" data={data.cards!.orders!} />)
  }
  if (isPresent(data.cards?.goods_supply)) {
    cards.push(<GoodsSupplyCard key="goods_supply" data={data.cards!.goods_supply!} />)
  }
  if (isPresent(data.cards?.goods_shipment)) {
    cards.push(<GoodsShipmentCard key="goods_shipment" data={data.cards!.goods_shipment!} />)
  }
  const googleSheets = resolveDashboardGoogleSheets(data)
  const excelReports = data.reports ?? []
  if (googleSheets || excelReports.length > 0) {
    cards.push(
      <AnalyticsReportsCard
        key="analytics-reports"
        googleSheets={googleSheets}
        excelReports={excelReports}
      />,
    )
  }

  const tables: ReactNode[] = []
  if (isPresent(data.tables?.orders)) {
    const hasOrdersSeries = data.tables!.orders!.rows.some((row) => (row.time_series?.length ?? 0) > 0)
    tables.push(
      <div key="orders-table" className="space-y-0">
        <PeriodTable
          title="Заказы"
          rows={data.tables!.orders!.rows}
          unitsHint="штук заказов"
          mergeWithNext={hasOrdersSeries}
        />
        <TableTimeSeriesChart
          rows={data.tables!.orders!.rows}
          mergeWithPrevious={hasOrdersSeries}
        />
      </div>,
    )
  }
  if (isPresent(data.tables?.goods)) {
    const hasGoodsSeries = data.tables!.goods!.rows.some((row) => (row.time_series?.length ?? 0) > 0)
    tables.push(
      <div key="goods-table" className="space-y-0">
        <PeriodTable
          title="Товары"
          rows={data.tables!.goods!.rows}
          unitsHint="единиц товара"
          mergeWithNext={hasGoodsSeries}
        />
        <TableTimeSeriesChart
          rows={data.tables!.goods!.rows}
          mergeWithPrevious={hasGoodsSeries}
        />
      </div>,
    )
  }

  const cardsGridCols = CARDS_GRID_COLS[cards.length] ?? 'grid-cols-1'
  const tablesGridCols = tables.length >= 2 ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'

  return (
    <div className="space-y-6">
      {(writerMode || tabHelp) && (
        <div className="flex justify-end">
          <HelpIconButton onClick={() => setTabHelpOpen((v) => !v)} title="Пояснение к текущему виду дашборда" />
        </div>
      )}
      {(writerMode || tabHelp) && (
        <InlineHelpPanel
          content={tabHelp?.content ?? ''}
          marker="tab:dashboard:v1"
          markerTemplate="### Операционный вид {#tab:dashboard:v1}"
          isOpen={tabHelpOpen}
          onClose={() => setTabHelpOpen(false)}
          isAuthoringMode={writerMode}
        />
      )}
      {cards.length > 0 && (
        <div className={`grid ${cardsGridCols} gap-3`}>{cards}</div>
      )}
      {tables.length > 0 && (
        <div className={`grid ${tablesGridCols} gap-3`}>{tables}</div>
      )}
    </div>
  )
}

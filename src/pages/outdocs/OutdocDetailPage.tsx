import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { isTextSelected } from '@/utils/selection'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { outdocsApi } from '@/api/outdocs'
import { goodsApi } from '@/api/goods'
import { ordersApi } from '@/api/orders'
import OrderStateBadge from '@/components/ui/OrderStateBadge'
import PageHeader from '@/components/ui/PageHeader'
import InlineHelpPanel, { HelpIconButton } from '@/components/ui/InlineHelpPanel'
import { getPageHelp, getTabHelp } from '@/content/pageHelp'
import { usePageHelpWriterMode } from '@/content/authoringState'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { dict, dictEnum } from '@/constants/dict'
import Hint from '@/components/ui/Hint'
import PropList from '@/components/ui/PropList'
import JsonViewer from '@/components/ui/JsonViewer'
import type { IndocAttribute } from '@/types/indoc'
import type { GoodsSupplyGoodItem, GoodsExpiryItem, GpltOut, GpltBox, CorrectionGoodItem, OrderOutItem, OutdocOrderItem, ReturnOrderEntry, ReturnGoodItem, OutdocGood, OutdocSerialNumber, OutdocPhoto } from '@/types/outdoc'
import type { PropItem } from '@/components/ui/PropList'
import { OutdocsBlock, OutdocsRow } from '@/components/ui/OutdocsRow'

// ─── Вкладки ────────────────────────────────────────────────────────────────

type CoreTab = 'goods' | 'sn' | 'attrs' | 'files' | 'photos' | 'json'
type TypeTab = 'supply_goods' | 'supply_expiry' | 'shipment_pallets' | 'correction_goods' | 'shipments' | 'outdoc_orders' | 'return_orders'
type Tab = CoreTab | TypeTab

const PAGE_HELP_KEY = 'outdoc-detail'

const TAB_HELP_TITLES: Record<Tab, string> = {
  supply_goods: 'Принятые товары',
  supply_expiry: 'Срок годности',
  shipment_pallets: 'Паллеты и короба',
  correction_goods: 'Корректировка остатков',
  shipments: 'Отправления',
  outdoc_orders: 'Заказы',
  return_orders: 'Возвраты',
  goods: 'Движение товаров',
  sn: 'Серийные номера',
  attrs: 'Атрибуты',
  files: 'Файлы',
  photos: 'Фото',
  json: 'JSON',
}

const SHIPMENT_TYPES      = new Set(['goods_shipment', 'goods_shipment_ready'])
const ORDERS_TYPES        = new Set(['orders_pallet', 'orders_shipment'])
const OUTDOC_ORDERS_TYPES = new Set(['orders_receiving', 'orders_deficit', 'orders_production_start', 'orders_cancel', 'orders_full_return', 'orders_payment', 'orders_payment_transfer', 'orders_shipment_refusal'])
const PAYMENT_TYPES       = new Set(['orders_payment', 'orders_payment_transfer'])
const RETURN_TYPES        = new Set(['orders_part_return', 'orders_client_return'])

const GOODS_MOVEMENT_TYPES = new Set(['orders_full_return', 'goods_correction', 'orders_shipment', 'goods_supply', 'goods_shipment', 'orders_part_return', 'orders_client_return', 'goods_from_long_storage', 'goods_to_long_storage'])
const FILES_TYPES          = new Set(['goods_shipment', 'goods_shipment_ready', 'goods_shipment_start'])
const PHOTOS_TYPES         = new Set(['goods_correction', 'goods_supply', 'goods_supply_start', 'goods_shipment', 'goods_shipment_ready', 'goods_shipment_start', 'orders_client_return', 'orders_full_return', 'orders_part_return', 'orders_shipment', 'orders_pallet', 'orders_shipment_refusal'])

// ─── Компоненты вкладок ──────────────────────────────────────────────────────

type SortKey = 'good_id' | 'good_name' | 'plan_qnt' | 'useful_qnt' | 'defective_qnt' | 'qnt_diff'
type SortDir = 'asc' | 'desc'

function SortTh<K extends string>({
  label, hint, sortKey, current, dir, onSort, className,
}: {
  label: string; hint: string; sortKey: K
  current: K; dir: SortDir; onSort: (k: K) => void; className?: string
}) {
  const active = current === sortKey
  return (
    <th
      className={`th cursor-pointer select-none ${className ?? ''}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        <Hint text={hint}>{label}</Hint>
        <span className={`text-xs ${active ? 'text-primary-600' : 'text-gray-300'}`}>
          {active ? (dir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </span>
    </th>
  )
}

function SupplyGoodsTab({ goods }: { goods: GoodsSupplyGoodItem[] }) {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<SortKey>('good_id')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const goodIds = goods.map((g) => g.good_id)

  const { data: goodsData, isLoading } = useQuery({
    queryKey: ['goods-by-ids', goodIds],
    queryFn: () => goodsApi.list({ good_ids: goodIds }),
    enabled: goodIds.length > 0,
  })

  const goodsMap = new Map(goodsData?.items.map((g) => [g.good_id, g.good_name]))

  function handleSort(k: SortKey) {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(k); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    const getValue = (item: GoodsSupplyGoodItem): string | number => {
      if (sortKey === 'good_name') return goodsMap.get(item.good_id) ?? ''
      if (sortKey === 'qnt_diff')  return item.useful_qnt + item.defective_qnt - item.plan_qnt
      return item[sortKey as keyof GoodsSupplyGoodItem]
    }
    return [...goods].sort((a, b) => {
      const va = getValue(a), vb = getValue(b)
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'ru')
      return sortDir === 'asc' ? cmp : -cmp
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goods, sortKey, sortDir, goodsData])

  if (isLoading) {
    return <div className="flex justify-center py-8"><Spinner className="w-6 h-6 text-primary-600" /></div>
  }

  const sortProps = { current: sortKey, dir: sortDir, onSort: handleSort }

  return (
    <div className="card overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <SortTh sortKey="good_id"      label={dict('good_id', 'short')}      hint={dict('good_id', 'hint')}      {...sortProps} />
            <SortTh sortKey="good_name"    label={dict('good_name', 'short')}    hint={dict('good_name', 'hint')}    {...sortProps} />
            <SortTh sortKey="plan_qnt"     label={dict('plan_qnt__in', 'short')} hint={dict('plan_qnt__in', 'hint')} {...sortProps} className="text-right" />
            <SortTh sortKey="useful_qnt"   label={dict('useful_qnt', 'short')}   hint={dict('useful_qnt', 'hint')}   {...sortProps} className="text-right" />
            <SortTh sortKey="defective_qnt" label={dict('defective_qnt', 'short')} hint={dict('defective_qnt', 'hint')} {...sortProps} className="text-right" />
            <SortTh sortKey="qnt_diff"     label={dict('qnt_diff', 'short')}     hint={dict('qnt_diff', 'hint')}     {...sortProps} className="text-right" />
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {sorted.map((item, i) => {
            const diff = item.useful_qnt + item.defective_qnt - item.plan_qnt
            return (
              <tr
                key={i}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => { if (isTextSelected()) return; navigate(`/goods/${encodeURIComponent(item.good_id)}`) }}
              >
                <td className="td font-medium text-primary-600">{item.good_id}</td>
                <td className="td text-gray-700">
                  {goodsMap.get(item.good_id) ?? <span className="text-gray-400 italic">—</span>}
                </td>
                <td className="td text-right">{item.plan_qnt}</td>
                <td className="td text-right">{item.useful_qnt}</td>
                <td className="td text-right">
                  {item.defective_qnt > 0
                    ? <span className="text-red-600 font-medium">{item.defective_qnt}</span>
                    : item.defective_qnt}
                </td>
                <td className="td text-right font-medium">
                  {diff > 0
                    ? <span className="text-green-600">+{diff}</span>
                    : diff < 0
                      ? <span className="text-red-600">{diff}</span>
                      : <span className="text-gray-400">0</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {goods.length === 0 && <EmptyState title="Товаров нет" />}
    </div>
  )
}

type ExpirySortKey = 'good_id' | 'good_name' | 'qual_type' | 'expiry_date' | 'qnt'

function ExpiryTab({ items }: { items: GoodsExpiryItem[] }) {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<ExpirySortKey>('good_id')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const goodIds = [...new Set(items.map((g) => g.good_id))]

  const { data: goodsData, isLoading } = useQuery({
    queryKey: ['goods-by-ids', goodIds],
    queryFn: () => goodsApi.list({ good_ids: goodIds }),
    enabled: goodIds.length > 0,
  })

  const goodsMap = new Map(goodsData?.items.map((g) => [g.good_id, g.good_name]))

  function handleSort(k: ExpirySortKey) {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(k); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    const getValue = (item: GoodsExpiryItem): string | number => {
      if (sortKey === 'good_name') return goodsMap.get(item.good_id) ?? ''
      if (sortKey === 'qual_type') return dictEnum('qual_type', item.qual_type)
      return item[sortKey]
    }
    return [...items].sort((a, b) => {
      const va = getValue(a), vb = getValue(b)
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'ru')
      return sortDir === 'asc' ? cmp : -cmp
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sortKey, sortDir, goodsData])

  if (isLoading) {
    return <div className="flex justify-center py-8"><Spinner className="w-6 h-6 text-primary-600" /></div>
  }

  const sortProps = { current: sortKey, dir: sortDir, onSort: handleSort }

  return (
    <div className="card overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <SortTh sortKey="good_id"     label={dict('good_id', 'short')}     hint={dict('good_id', 'hint')}     {...sortProps} />
            <SortTh sortKey="good_name"   label={dict('good_name', 'short')}   hint={dict('good_name', 'hint')}   {...sortProps} />
            <SortTh sortKey="qual_type"   label={dict('qual_type', 'short')}   hint={dict('qual_type', 'hint')}   {...sortProps} />
            <SortTh sortKey="expiry_date" label={dict('expiry_date', 'short')} hint={dict('expiry_date', 'hint')} {...sortProps} />
            <SortTh sortKey="qnt"         label={dict('qnt', 'short')}         hint={dict('qnt', 'hint')}         {...sortProps} className="text-right" />
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {sorted.map((item, i) => (
            <tr
              key={i}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => { if (isTextSelected()) return; navigate(`/goods/${encodeURIComponent(item.good_id)}`) }}
            >
              <td className="td font-medium text-primary-600">{item.good_id}</td>
              <td className="td text-gray-700">
                {goodsMap.get(item.good_id) ?? <span className="text-gray-400 italic">—</span>}
              </td>
              <td className="td text-gray-500">{dictEnum('qual_type', item.qual_type)}</td>
              <td className="td text-gray-500">{new Date(item.expiry_date).toLocaleDateString('ru-RU')}</td>
              <td className="td text-right">{item.qnt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type CorrSortKey = 'good_id' | 'good_name' | 'qual_type' | 'stock_qnt' | 'quarantine_qnt'

function CorrectionGoodsTab({ goods }: { goods: CorrectionGoodItem[] }) {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<CorrSortKey>('good_id')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const goodIds = useMemo(() => [...new Set(goods.map((g) => g.good_id))], [goods])

  const { data: goodsData, isLoading } = useQuery({
    queryKey: ['goods-by-ids', goodIds],
    queryFn: () => goodsApi.list({ good_ids: goodIds }),
    enabled: goodIds.length > 0,
  })

  const goodsMap = new Map(goodsData?.items.map((g) => [g.good_id, g.good_name]))

  const showQuarantine = goods.some((g) => g.quarantine_qnt !== 0)

  function handleSort(k: CorrSortKey) {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(k); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    const getValue = (item: CorrectionGoodItem): string | number => {
      if (sortKey === 'good_name') return goodsMap.get(item.good_id) ?? ''
      if (sortKey === 'qual_type') return dictEnum('qual_type', item.qual_type)
      return item[sortKey]
    }
    return [...goods].sort((a, b) => {
      const va = getValue(a), vb = getValue(b)
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'ru')
      return sortDir === 'asc' ? cmp : -cmp
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goods, sortKey, sortDir, goodsData])

  if (isLoading) {
    return <div className="flex justify-center py-8"><Spinner className="w-6 h-6 text-primary-600" /></div>
  }

  const sortProps = { current: sortKey, dir: sortDir, onSort: handleSort }

  return (
    <div className="card overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <SortTh sortKey="good_id"       label={dict('good_id', 'short')}          hint={dict('good_id', 'hint')}          {...sortProps} />
            <SortTh sortKey="good_name"     label={dict('good_name', 'short')}        hint={dict('good_name', 'hint')}        {...sortProps} />
            <SortTh sortKey="qual_type"     label={dict('qual_type', 'short')}        hint={dict('qual_type', 'hint')}        {...sortProps} />
            <SortTh sortKey="stock_qnt"     label={dict('stock_qnt', 'short')}        hint={dict('stock_qnt', 'hint')}        {...sortProps} className="text-right" />
            {showQuarantine && (
              <SortTh sortKey="quarantine_qnt" label={dict('quarantine_qnt', 'short')} hint={dict('quarantine_qnt', 'hint')} {...sortProps} className="text-right" />
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {sorted.map((item, i) => (
            <tr
              key={i}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => { if (isTextSelected()) return; navigate(`/goods/${encodeURIComponent(item.good_id)}`) }}
            >
              <td className="td font-medium text-primary-600">{item.good_id}</td>
              <td className="td text-gray-700">
                {goodsMap.get(item.good_id) ?? <span className="text-gray-400 italic">—</span>}
              </td>
              <td className="td text-gray-500">{dictEnum('qual_type', item.qual_type)}</td>
              <td className="td text-right font-medium">
                {item.stock_qnt > 0
                  ? <span className="text-green-600">+{item.stock_qnt}</span>
                  : item.stock_qnt < 0
                    ? <span className="text-red-600">{item.stock_qnt}</span>
                    : <span className="text-gray-400">0</span>}
              </td>
              {showQuarantine && (
                <td className="td text-right font-medium">
                  {item.quarantine_qnt > 0
                    ? <span className="text-green-600">+{item.quarantine_qnt}</span>
                    : item.quarantine_qnt < 0
                      ? <span className="text-red-600">{item.quarantine_qnt}</span>
                      : <span className="text-gray-400">0</span>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {goods.length === 0 && <EmptyState title="Товаров нет" />}
    </div>
  )
}

type OutdocOrdersSortKey = 'created_at' | 'state' | 'order_id' | 'clnt_name' | 'delivery_name' | 'payment' | 'clnt_date' | 'file_date'

function OutdocOrdersTab({ orders, outdocType }: { orders: OutdocOrderItem[]; outdocType: string }) {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<OutdocOrdersSortKey>('order_id')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const orderIds = useMemo(() => orders.map((o) => o.order_id), [orders])

  const { data: listData, isLoading } = useQuery({
    queryKey: ['orders-by-ids', orderIds],
    queryFn: () => ordersApi.list({ order_ids: orderIds }),
    enabled: orderIds.length > 0,
  })

  const outdocOrdersMap = useMemo(() => new Map(orders.map((o) => [o.order_id, o])), [orders])

  const showPayment  = PAYMENT_TYPES.has(outdocType)
  const showClntDate = showPayment && orders.some((o) => o.clnt_date)
  const showFileDate = showPayment && orders.some((o) => o.file_date)

  function handleSort(k: OutdocOrdersSortKey) {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(k); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    const items = listData?.items ?? []
    return [...items].sort((a, b) => {
      let va: string | number
      let vb: string | number
      if (sortKey === 'payment' || sortKey === 'clnt_date' || sortKey === 'file_date') {
        va = (outdocOrdersMap.get(a.order_id)?.[sortKey] as string | number | undefined) ?? ''
        vb = (outdocOrdersMap.get(b.order_id)?.[sortKey] as string | number | undefined) ?? ''
      } else {
        va = a[sortKey] ?? ''
        vb = b[sortKey] ?? ''
      }
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'ru')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [listData, sortKey, sortDir, outdocOrdersMap])

  if (isLoading) {
    return <div className="flex justify-center py-8"><Spinner className="w-6 h-6 text-primary-600" /></div>
  }

  const sortProps = { current: sortKey, dir: sortDir, onSort: handleSort }
  const COL_COUNT = 5 + (showPayment ? 1 : 0) + (showClntDate ? 1 : 0) + (showFileDate ? 1 : 0)

  return (
    <div className="card overflow-hidden">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-gray-50">
          <tr>
            <SortTh sortKey="order_id"      label={dict('order_id', 'short')}      hint={dict('order_id', 'hint')}      {...sortProps} />
            <SortTh sortKey="state"         label={dict('state', 'short')}         hint={dict('state', 'hint')}         {...sortProps} />
            <SortTh sortKey="clnt_name"     label={dict('clnt_name', 'short')}     hint={dict('clnt_name', 'hint')}     {...sortProps} />
            <SortTh sortKey="delivery_name" label={dict('delivery_name', 'short')} hint={dict('delivery_name', 'hint')} {...sortProps} />
            <SortTh sortKey="created_at"    label={dict('created_at', 'short')}    hint={dict('created_at', 'hint')}    {...sortProps} />
            {showPayment  && <SortTh sortKey="payment"   label={dict('payment', 'short')}   hint={dict('payment', 'hint')}   {...sortProps} className="text-right" />}
            {showClntDate && <SortTh sortKey="clnt_date" label={dict('clnt_date', 'short')} hint={dict('clnt_date', 'hint')} {...sortProps} />}
            {showFileDate && <SortTh sortKey="file_date" label={dict('file_date', 'short')} hint={dict('file_date', 'hint')} {...sortProps} />}
          </tr>
        </thead>
        {sorted.map((item) => {
          const outdocOrd = outdocOrdersMap.get(item.order_id)
          const extraProps: PropItem[] = outdocType === 'orders_deficit'
            ? [{ dictKey: 'error_descrip',        value: [outdocOrd?.error_code,     outdocOrd?.error_descrip].filter(Boolean).join(' ')        || undefined, valueColor: 'red'    }]
            : outdocType === 'orders_cancel'
            ? [{ dictKey: 'cancel_reason_descrip', value: [outdocOrd?.cancel_reason, outdocOrd?.cancel_reason_descrip].filter(Boolean).join(' ') || undefined, valueColor: 'yellow' }]
            : outdocType === 'orders_full_return'
            ? [{ dictKey: 'ret_reason_descrip',    value: [outdocOrd?.ret_reason,    outdocOrd?.ret_reason_descrip].filter(Boolean).join(' ')    || undefined, valueColor: 'yellow' }]
            : []
          return (
            <tbody
              key={item.order_id}
              className="border-t border-gray-200 group cursor-pointer"
              onClick={() => { if (isTextSelected()) return; navigate(`/orders/${encodeURIComponent(item.order_id)}`) }}
            >
              <tr className="group-hover:bg-gray-50 transition-colors">
                <td className="td font-medium text-primary-600">{item.order_id}</td>
                <td className="td"><OrderStateBadge state={item.state} /></td>
                <td className="td text-gray-500">{item.clnt_name ?? '—'}</td>
                <td className="td text-gray-500">{item.delivery_name ?? '—'}</td>
                <td className="td text-gray-500">{new Date(item.created_at).toLocaleString('ru-RU')}</td>
                {showPayment  && <td className="td text-right">{outdocOrd?.payment ?? '—'}</td>}
                {showClntDate && <td className="td text-gray-500">{outdocOrd?.clnt_date ? new Date(outdocOrd.clnt_date).toLocaleDateString('ru-RU') : '—'}</td>}
                {showFileDate && <td className="td text-gray-500">{outdocOrd?.file_date ? new Date(outdocOrd.file_date).toLocaleDateString('ru-RU') : '—'}</td>}
              </tr>
              <OutdocsRow outdocs={item.outdocs} colSpan={COL_COUNT} />
              {extraProps[0]?.value && (
                <tr>
                  <td colSpan={COL_COUNT} className="px-4 pt-0 pb-1 bg-white group-hover:bg-gray-50 transition-colors">
                    <PropList items={extraProps} className="text-sm text-gray-500" />
                  </td>
                </tr>
              )}
            </tbody>
          )
        })}
      </table>
      {orders.length === 0 && <EmptyState title="Заказов нет" />}
    </div>
  )
}

type ShipmentSortKey = 'plt_id' | 'order_id' | 'barcode' | 'dispatch_number' | 'declared_value' | 'cod' | 'weight' | 'unit_qnt'

function ShipmentsTab({ orders, outdocType }: { orders: OrderOutItem[]; outdocType: string }) {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<ShipmentSortKey>('order_id')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const showPltId    = outdocType === 'orders_shipment'
  const showDispatch = orders.some((o) => o.dispatch_number)
  const showUnitQnt  = orders.some((o) => o.unit_qnt !== undefined && o.unit_qnt !== 1)

  function handleSort(k: ShipmentSortKey) {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(k); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    return [...orders].sort((a, b) => {
      const va = (a[sortKey as keyof OrderOutItem] as string | number | undefined) ?? ''
      const vb = (b[sortKey as keyof OrderOutItem] as string | number | undefined) ?? ''
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'ru')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [orders, sortKey, sortDir])

  const sortProps = { current: sortKey, dir: sortDir, onSort: handleSort }

  return (
    <div className="card overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {showPltId    && <SortTh sortKey="plt_id"          label={dict('plt_id', 'short')}          hint={dict('plt_id', 'hint')}          {...sortProps} />}
            <SortTh sortKey="order_id"        label={dict('order_id', 'short')}        hint={dict('order_id', 'hint')}        {...sortProps} />
            <SortTh sortKey="barcode"         label={dict('barcode', 'short')}         hint={dict('barcode', 'hint')}         {...sortProps} />
            {showDispatch && <SortTh sortKey="dispatch_number" label={dict('dispatch_number', 'short')} hint={dict('dispatch_number', 'hint')} {...sortProps} />}
            <SortTh sortKey="declared_value"  label={dict('declared_value', 'short')}  hint={dict('declared_value', 'hint')}  {...sortProps} className="text-right" />
            <SortTh sortKey="cod"             label={dict('cod', 'short')}             hint={dict('cod', 'hint')}             {...sortProps} className="text-right" />
            <SortTh sortKey="weight"          label={dict('weight', 'short')}          hint={dict('weight', 'hint')}          {...sortProps} className="text-right" />
            {showUnitQnt  && <SortTh sortKey="unit_qnt"        label={dict('unit_qnt', 'short')}        hint={dict('unit_qnt', 'hint')}        {...sortProps} className="text-right" />}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {sorted.map((item, i) => (
            <tr
              key={i}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => { if (isTextSelected()) return; navigate(`/orders/${encodeURIComponent(item.order_id)}`) }}
            >
              {showPltId    && <td className="td text-gray-500">{item.plt_id ?? '—'}</td>}
              <td className="td font-medium text-primary-600">{item.order_id}</td>
              <td className="td font-mono text-xs text-gray-500">{item.barcode ?? '—'}</td>
              {showDispatch && <td className="td font-mono text-xs text-gray-500">{item.dispatch_number ?? '—'}</td>}
              <td className="td text-right">{item.declared_value ?? '—'}</td>
              <td className="td text-right">{item.cod ?? '—'}</td>
              <td className="td text-right">{item.weight ?? '—'}</td>
              {showUnitQnt  && <td className="td text-right">{item.unit_qnt ?? '—'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && <EmptyState title="Отправлений нет" />}
    </div>
  )
}

function PalletsTab({ pallets }: { pallets: GpltOut[] }) {
  const navigate = useNavigate()

  const allGoodIds = useMemo(() => [
    ...new Set(pallets.flatMap((p) => p.boxes.flatMap((b) => b.goods.map((g) => g.good_id)))),
  ], [pallets])

  const { data: goodsData, isLoading } = useQuery({
    queryKey: ['goods-by-ids', allGoodIds],
    queryFn: () => goodsApi.list({ good_ids: allGoodIds }),
    enabled: allGoodIds.length > 0,
  })

  const goodsMap = new Map(goodsData?.items.map((g) => [g.good_id, g.good_name]))

  const showExpiry   = pallets.some((p) => p.boxes.some((b) => b.goods.some((g) => g.expiry_date)))
  const showSn       = pallets.some((p) => p.boxes.some((b) => b.goods.some((g) => g.good_sn)))
  const showFboBar   = pallets.some((p) => p.boxes.some((b) => b.goods.some((g) => g.good_fbo_bar)))

  if (isLoading) {
    return <div className="flex justify-center py-8"><Spinner className="w-6 h-6 text-primary-600" /></div>
  }

  return (
    <div className="space-y-4">
      {pallets.flatMap((pallet) =>
        pallet.boxes.map((box: GpltBox) => {
          const dim = [box.length, box.width, box.height].every((v) => v != null)
            ? `${box.length} × ${box.width} × ${box.height} мм`
            : null
          const sectionProps: PropItem[] = [
            { dictKey: 'plt_id',      value: pallet.plt_id != null ? String(pallet.plt_id) : undefined },
            { dictKey: 'plt_fbo_bar', value: pallet.plt_fbo_bar },
            { dictKey: 'box_id',      value: String(box.box_id) },
            { dictKey: 'box_fbo_bar', value: box.box_fbo_bar },
            { dictKey: 'pack_name',   value: box.pack_name },
            { dictKey: 'pack_weight', value: box.pack_weight != null ? `${box.pack_weight} г` : undefined },
            { dictKey: 'pack_dim',    value: dim },
          ]
          return (
            <div key={`${pallet.plt_id ?? 0}-${box.box_id}`} className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <PropList items={sectionProps} className="text-sm text-gray-500" />
              </div>
              {box.goods.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="th"><Hint text={dict('good_id', 'hint')}>{dict('good_id', 'short')}</Hint></th>
                      <th className="th"><Hint text={dict('good_name', 'hint')}>{dict('good_name', 'short')}</Hint></th>
                      {showExpiry && <th className="th"><Hint text={dict('expiry_date', 'hint')}>{dict('expiry_date', 'short')}</Hint></th>}
                      {showSn     && <th className="th"><Hint text={dict('good_sn', 'hint')}>{dict('good_sn', 'short')}</Hint></th>}
                      {showFboBar && <th className="th"><Hint text={dict('good_fbo_bar', 'hint')}>{dict('good_fbo_bar', 'short')}</Hint></th>}
                      <th className="th text-right"><Hint text={dict('qnt', 'hint')}>{dict('qnt', 'short')}</Hint></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {box.goods.map((g, i) => (
                      <tr
                        key={i}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => { if (isTextSelected()) return; navigate(`/goods/${encodeURIComponent(g.good_id)}`) }}
                      >
                        <td className="td font-medium text-primary-600">{g.good_id}</td>
                        <td className="td text-gray-700">
                          {goodsMap.get(g.good_id) ?? <span className="text-gray-400 italic">—</span>}
                        </td>
                        {showExpiry && <td className="td text-gray-500">{g.expiry_date ? new Date(g.expiry_date).toLocaleDateString('ru-RU') : '—'}</td>}
                        {showSn     && <td className="td text-gray-500 font-mono text-xs">{g.good_sn ?? '—'}</td>}
                        {showFboBar && <td className="td text-gray-500 font-mono text-xs">{g.good_fbo_bar ?? '—'}</td>}
                        <td className="td text-right">{g.qnt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState title="Товаров нет" />
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

function ReturnedOrdersTab({ orders, outdocType }: { orders: ReturnOrderEntry[]; outdocType: string }) {
  const navigate = useNavigate()
  const isClientReturn = outdocType === 'orders_client_return'

  const orderIds = useMemo(
    () => [...new Set(orders.map((o) => o.order_id).filter((id): id is string => !!id))],
    [orders],
  )

  const allGoodIds = useMemo(
    () => [...new Set(orders.flatMap((o) => o.goods.map((g: ReturnGoodItem) => g.good_id)))],
    [orders],
  )

  const { data: ordersData } = useQuery({
    queryKey: ['orders-by-ids', orderIds],
    queryFn: () => ordersApi.list({ order_ids: orderIds }),
    enabled: orderIds.length > 0,
  })

  const { data: goodsData, isLoading: goodsLoading } = useQuery({
    queryKey: ['goods-by-ids', allGoodIds],
    queryFn: () => goodsApi.list({ good_ids: allGoodIds }),
    enabled: allGoodIds.length > 0,
  })

  const ordersMap = useMemo(
    () => new Map(ordersData?.items.map((o) => [o.order_id, o])),
    [ordersData],
  )

  const goodsMap = useMemo(
    () => new Map(goodsData?.items.map((g) => [g.good_id, g.good_name])),
    [goodsData],
  )

  const showExpiry = orders.some((o) => o.goods.some((g) => g.expiry_date))
  const showSn     = orders.some((o) => o.goods.some((g) => g.good_sn))

  if (orders.length === 0) return <div className="card"><EmptyState title="Нет данных о возвратах" /></div>

  if (goodsLoading && allGoodIds.length > 0) {
    return <div className="flex justify-center py-8"><Spinner className="w-6 h-6 text-primary-600" /></div>
  }

  return (
    <div className="space-y-4">
      {orders.map((order, i) => {
        const orderInfo = order.order_id ? ordersMap.get(order.order_id) : undefined

        const orderProps: PropItem[] = order.order_id ? [
          { dictKey: 'order_id',      value: order.order_id, href: `/orders/${encodeURIComponent(order.order_id)}` },
          { dictKey: 'created_at',    value: orderInfo?.created_at ? new Date(orderInfo.created_at).toLocaleString('ru-RU') : undefined },
          { dictKey: 'clnt_name',     value: orderInfo?.clnt_name },
          { dictKey: 'delivery_name', value: orderInfo?.delivery_name },
        ] : []

        const retProps: PropItem[] = isClientReturn ? [
          { dictKey: 'return_barcode', value: order.return_barcode },
          { dictKey: 'parcel_barcode', value: order.parcel_barcode },
        ] : []

        const propItems: PropItem[] = [...orderProps, ...retProps]

        return (
          <div key={i} className="card overflow-hidden">
            {propItems.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-100">
                <PropList items={propItems} className="text-sm text-gray-500" />
              </div>
            )}

            {orderInfo?.outdocs && orderInfo.outdocs.length > 0 && (
              <div className="px-4 py-2 border-b border-gray-100">
                <OutdocsBlock outdocs={orderInfo.outdocs} />
              </div>
            )}

            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="th"><Hint text={dict('good_id__ret', 'hint')}>{dict('good_id__ret', 'short')}</Hint></th>
                  <th className="th"><Hint text={dict('good_name', 'hint')}>{dict('good_name', 'short')}</Hint></th>
                  <th className="th"><Hint text={dict('qual_type', 'hint')}>{dict('qual_type', 'short')}</Hint></th>
                  {showExpiry && <th className="th"><Hint text={dict('expiry_date', 'hint')}>{dict('expiry_date', 'short')}</Hint></th>}
                  {showSn     && <th className="th"><Hint text={dict('good_sn', 'hint')}>{dict('good_sn', 'short')}</Hint></th>}
                  <th className="th text-right"><Hint text={dict('stock_qnt', 'hint', 'ret')}>{dict('stock_qnt', 'short', 'ret')}</Hint></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {order.goods.map((g, j) => (
                  <tr
                    key={j}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => { if (isTextSelected()) return; navigate(`/goods/${encodeURIComponent(g.good_id)}`) }}
                  >
                    <td className="td font-medium text-primary-600">{g.good_id}</td>
                    <td className="td text-gray-500">{goodsMap.get(g.good_id) ?? '—'}</td>
                    <td className="td text-gray-500">{dictEnum('qual_type', g.qual_type)}</td>
                    {showExpiry && <td className="td text-gray-500">{g.expiry_date ? new Date(g.expiry_date).toLocaleDateString('ru-RU') : '—'}</td>}
                    {showSn     && <td className="td text-gray-500">{g.good_sn ?? '—'}</td>}
                    <td className="td text-right font-medium">{g.stock_qnt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

function OutdocPhotosTab({ photos }: { photos: OutdocPhoto[] }) {
  const navigate = useNavigate()

  const goodIds = [...new Set(photos.map((p) => p.good_id).filter(Boolean) as string[])]

  const { data: goodsData } = useQuery({
    queryKey: ['goods-by-ids', goodIds],
    queryFn: () => goodsApi.list({ good_ids: goodIds }),
    enabled: goodIds.length > 0,
  })

  const goodsMap = new Map(goodsData?.items.map((g) => [g.good_id, g.good_name]))

  if (photos.length === 0) return <div className="card p-6"><EmptyState title="Фото нет" /></div>

  return (
    <div className="card p-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((p) => (
          <div key={p.photo_id} className="flex flex-col rounded-lg border border-gray-200 overflow-hidden">
            <a href={p.url} target="_blank" rel="noreferrer" className="block">
              <img
                src={p.url}
                alt={p.descrip ?? 'фото'}
                className="w-full aspect-square object-cover hover:opacity-90 transition-opacity"
              />
            </a>
            {(p.descrip || p.good_id || p.order_id) && (
              <div className="px-2 py-1.5 flex flex-col gap-0.5 text-xs bg-white">
                {p.descrip && (
                  <span className="text-gray-500 truncate" title={p.descrip}>{p.descrip}</span>
                )}
                {p.good_id && (
                  <button
                    className="text-left text-primary-600 hover:underline truncate"
                    onClick={() => navigate(`/goods/${encodeURIComponent(p.good_id!)}`)}
                    title={goodsMap.get(p.good_id) ?? p.good_id}
                  >
                    {p.good_id}{goodsMap.get(p.good_id) ? ` · ${goodsMap.get(p.good_id)}` : ''}
                  </button>
                )}
                {p.order_id && (
                  <button
                    className="text-left text-primary-600 hover:underline truncate"
                    onClick={() => navigate(`/orders/${encodeURIComponent(p.order_id!)}`)}
                  >
                    {p.order_id}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

type SnMovementSortKey = 'good_sn' | 'good_id' | 'good_name' | 'inout' | 'qual_type' | 'order_id'

function SerialNumbersTab({ outdocId }: { outdocId: number }) {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<SnMovementSortKey>('good_sn')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const snSearchKey = `outdoc-sn-search-${outdocId}`
  const [search, setSearch] = useState(() => sessionStorage.getItem(snSearchKey) ?? '')

  const { data: snData, isLoading: snLoading } = useQuery({
    queryKey: ['outdoc-sn', outdocId],
    queryFn: () => outdocsApi.getSerialNumbers(outdocId),
  })

  const items: OutdocSerialNumber[] = snData?.good_sn ?? []

  const goodIds = useMemo(() => [...new Set(items.map((s) => s.good_id))], [items])

  const { data: goodsData, isLoading: namesLoading } = useQuery({
    queryKey: ['goods-by-ids', goodIds],
    queryFn: () => goodsApi.list({ good_ids: goodIds }),
    enabled: goodIds.length > 0,
  })

  const goodsMap = useMemo(
    () => new Map(goodsData?.items.map((g) => [g.good_id, g.good_name])),
    [goodsData],
  )

  function handleSort(k: SnMovementSortKey) {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(k); setSortDir('asc') }
  }

  const inoutLabel = (v: 1 | -1) => (v === 1 ? 'Приход' : 'Расход')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = q
      ? items.filter((item) =>
          [item.good_sn, item.good_id, goodsMap.get(item.good_id), inoutLabel(item.inout), dictEnum('qual_type', item.qual_type), item.order_id].some(
            (v) => v != null && String(v).toLowerCase().includes(q),
          ),
        )
      : items
    return [...base].sort((a, b) => {
      let va: string | number
      let vb: string | number
      if (sortKey === 'good_name') {
        va = goodsMap.get(a.good_id) ?? ''
        vb = goodsMap.get(b.good_id) ?? ''
      } else if (sortKey === 'inout') {
        va = a.inout; vb = b.inout
      } else if (sortKey === 'qual_type') {
        va = dictEnum('qual_type', a.qual_type)
        vb = dictEnum('qual_type', b.qual_type)
      } else {
        va = (a[sortKey as keyof OutdocSerialNumber] as string | undefined) ?? ''
        vb = (b[sortKey as keyof OutdocSerialNumber] as string | undefined) ?? ''
      }
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'ru')
      return sortDir === 'asc' ? cmp : -cmp
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, search, sortKey, sortDir, goodsMap])

  if (snLoading || (namesLoading && goodIds.length > 0)) {
    return <div className="flex justify-center py-8"><Spinner className="w-6 h-6 text-primary-600" /></div>
  }

  const sortProps = { current: sortKey, dir: sortDir, onSort: handleSort }

  return (
    <>
      <div className="mb-3">
        <input
          className="input w-56"
          placeholder="Поиск по списку..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); sessionStorage.setItem(snSearchKey, e.target.value) }}
        />
      </div>
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState title="Серийных номеров нет" />
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <SortTh sortKey="good_sn"   label={dict('good_sn', 'short')}   hint={dict('good_sn', 'hint')}   {...sortProps} />
                <SortTh sortKey="good_id"   label={dict('good_id', 'short')}   hint={dict('good_id', 'hint')}   {...sortProps} />
                <SortTh sortKey="good_name" label={dict('good_name', 'short')} hint={dict('good_name', 'hint')} {...sortProps} />
                <SortTh sortKey="inout"     label={dict('inout', 'short')}     hint={dict('inout', 'hint')}     {...sortProps} />
                <SortTh sortKey="qual_type" label={dict('qual_type', 'short')} hint={dict('qual_type', 'hint')} {...sortProps} />
                <SortTh sortKey="order_id"  label={dict('order_id', 'short')}  hint={dict('order_id', 'hint')}  {...sortProps} />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.map((sn, i) => (
                <tr
                  key={i}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => { if (isTextSelected()) return; navigate(`/goods/${encodeURIComponent(sn.good_id)}`) }}
                >
                  <td className="td font-mono text-sm">{sn.good_sn}</td>
                  <td className="td font-medium text-primary-600">{sn.good_id}</td>
                  <td className="td text-gray-700">
                    {goodsMap.get(sn.good_id) ?? <span className="text-gray-400 italic">—</span>}
                  </td>
                  <td className="td">
                    <span className={`badge ${sn.inout === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {inoutLabel(sn.inout)}
                    </span>
                  </td>
                  <td className="td text-gray-500">{dictEnum('qual_type', sn.qual_type)}</td>
                  <td className="td">
                    {sn.order_id
                      ? <Link to={`/orders/${encodeURIComponent(sn.order_id)}`} onClick={(e) => e.stopPropagation()} className="text-primary-600 font-medium hover:underline">{sn.order_id}</Link>
                      : <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

type GoodsMovementSortKey = 'good_id' | 'good_name' | 'good_state' | 'qual_type' | 'qnt'

function GoodsMovementTab({ outdocId }: { outdocId: number }) {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<GoodsMovementSortKey>('good_id')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const goodsSearchKey = `outdoc-goods-search-${outdocId}`
  const [search, setSearch] = useState(() => sessionStorage.getItem(goodsSearchKey) ?? '')

  const { data: outdocGoodsData, isLoading: outdocLoading } = useQuery({
    queryKey: ['outdoc-goods', outdocId],
    queryFn: () => outdocsApi.getGoods(outdocId),
  })

  const goods: OutdocGood[] = outdocGoodsData?.goods ?? []

  const goodIds = useMemo(() => [...new Set(goods.map((g) => g.good_id))], [goods])

  const { data: goodsData, isLoading: namesLoading } = useQuery({
    queryKey: ['goods-by-ids', goodIds],
    queryFn: () => goodsApi.list({ good_ids: goodIds }),
    enabled: goodIds.length > 0,
  })

  const goodsMap = useMemo(
    () => new Map(goodsData?.items.map((g) => [g.good_id, g.good_name])),
    [goodsData],
  )

  function handleSort(k: GoodsMovementSortKey) {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(k); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = q
      ? goods.filter((item) =>
          [item.good_id, goodsMap.get(item.good_id), dictEnum('good_state', item.good_state), dictEnum('qual_type', item.qual_type)].some(
            (v) => v != null && String(v).toLowerCase().includes(q),
          ),
        )
      : goods
    return [...base].sort((a, b) => {
      const va: string | number = sortKey === 'good_name' ? (goodsMap.get(a.good_id) ?? '') : a[sortKey as keyof OutdocGood] ?? ''
      const vb: string | number = sortKey === 'good_name' ? (goodsMap.get(b.good_id) ?? '') : b[sortKey as keyof OutdocGood] ?? ''
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'ru')
      return sortDir === 'asc' ? cmp : -cmp
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goods, search, sortKey, sortDir, goodsMap])

  if (outdocLoading || (namesLoading && goodIds.length > 0)) {
    return <div className="flex justify-center py-8"><Spinner className="w-6 h-6 text-primary-600" /></div>
  }

  const sortProps = { current: sortKey, dir: sortDir, onSort: handleSort }

  return (
    <>
      <div className="mb-3">
        <input
          className="input w-56"
          placeholder="Поиск по списку..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); sessionStorage.setItem(goodsSearchKey, e.target.value) }}
        />
      </div>
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState title="Нет данных о товарах" />
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <SortTh sortKey="good_id"    label={dict('good_id', 'short')}    hint={dict('good_id', 'hint')}    {...sortProps} />
                <SortTh sortKey="good_name"  label={dict('good_name', 'short')}  hint={dict('good_name', 'hint')}  {...sortProps} />
                <SortTh sortKey="good_state" label={dict('good_state', 'short')} hint={dict('good_state', 'hint')} {...sortProps} />
                <SortTh sortKey="qual_type"  label={dict('qual_type', 'short')}  hint={dict('qual_type', 'hint')}  {...sortProps} />
                <SortTh sortKey="qnt"        label={dict('qnt', 'short')}        hint={dict('qnt', 'hint')}        {...sortProps} className="text-right" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.map((g, i) => (
                <tr
                  key={i}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => { if (isTextSelected()) return; navigate(`/goods/${encodeURIComponent(g.good_id)}`) }}
                >
                  <td className="td font-medium text-primary-600">{g.good_id}</td>
                  <td className="td text-gray-700">
                    {goodsMap.get(g.good_id) ?? <span className="text-gray-400 italic">—</span>}
                  </td>
                  <td className="td text-gray-500">{dictEnum('good_state', g.good_state)}</td>
                  <td className="td text-gray-500">{dictEnum('qual_type', g.qual_type)}</td>
                  <td className="td text-right font-medium">{g.qnt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

function getDefaultTab(outdocType: string): Tab {
  if (outdocType === 'goods_supply')             return 'supply_goods'
  if (SHIPMENT_TYPES.has(outdocType))            return 'shipment_pallets'
  if (outdocType === 'goods_correction')         return 'correction_goods'
  if (ORDERS_TYPES.has(outdocType))              return 'shipments'
  if (OUTDOC_ORDERS_TYPES.has(outdocType))       return 'outdoc_orders'
  if (RETURN_TYPES.has(outdocType))              return 'return_orders'
  if (GOODS_MOVEMENT_TYPES.has(outdocType))      return 'goods'
  return 'attrs'
}

// ─── Основной компонент ──────────────────────────────────────────────────────

export default function OutdocDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const outdocId = Number(id)

  const tabKey = `outdoc-tab-${outdocId}`

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['outdoc-detail', outdocId],
    queryFn: () => outdocsApi.get(outdocId),
  })

  const outdocType = detail?.outdoc_type

  const [tabOverride, setTabOverride] = useState<Tab | null>(
    () => sessionStorage.getItem(tabKey) as Tab | null,
  )
  const tab: Tab = tabOverride ?? (outdocType ? getDefaultTab(outdocType) : 'attrs')

  const writerMode = usePageHelpWriterMode()
  const pageHelp = getPageHelp(PAGE_HELP_KEY)
  const [pageHelpOpen, setPageHelpOpen] = useState(false)
  const tabHelp = getTabHelp(PAGE_HELP_KEY, tab)
  const [tabHelpOpen, setTabHelpOpen] = useState(false)

  useEffect(() => {
    if (writerMode) setPageHelpOpen(true)
  }, [writerMode])

  useEffect(() => {
    if (writerMode) setTabHelpOpen(true)
  }, [tab, writerMode])

  function handleSetTab(t: Tab) {
    sessionStorage.setItem(tabKey, t)
    setTabOverride(t)
  }


  const { data: attrsData } = useQuery({
    queryKey: ['outdoc-attrs', outdocId],
    queryFn: () => outdocsApi.getAttributes(outdocId),
    enabled: tab === 'attrs',
  })

  const { data: filesData } = useQuery({
    queryKey: ['outdoc-files', outdocId],
    queryFn: () => outdocsApi.getFiles(outdocId),
    enabled: tab === 'files',
  })

  const { data: photosData } = useQuery({
    queryKey: ['outdoc-photos', outdocId],
    queryFn: () => outdocsApi.getPhotos(outdocId),
    enabled: tab === 'photos',
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => outdocsApi.uploadFile(outdocId, file),
    onSuccess: () => {
      toast.success('Файл загружен')
      qc.invalidateQueries({ queryKey: ['outdoc-files', outdocId] })
    },
  })

  const deleteFileMutation = useMutation({
    mutationFn: (fileName: string) => outdocsApi.deleteFile(outdocId, [fileName]),
    onSuccess: () => {
      toast.success('Файл удалён')
      qc.invalidateQueries({ queryKey: ['outdoc-files', outdocId] })
    },
  })

  const common = detail?.common

  // Данные доступны сразу из основного запроса
  const d = detail as Record<string, unknown> | undefined
  const supplyGoods          = (d?.goods        as GoodsSupplyGoodItem[]  | undefined) ?? []
  const supplyExpiry         = (d?.goods_expiry as GoodsExpiryItem[]      | undefined) ?? []
  const pallets              = (d?.pallets      as GpltOut[]              | undefined) ?? []
  const correctionGoods      = (d?.goods        as CorrectionGoodItem[]   | undefined) ?? []
  const correctionTypeDescip = d?.correction_type_descrip as string | undefined
  const shipmentOrders       = (d?.orders       as OrderOutItem[]         | undefined) ?? []
  const deliveryId           = d?.delivery_id   as number | undefined
  const deliveryName         = d?.delivery_name as string | undefined
  const topPltId             = d?.plt_id        as number | undefined

  const outdocOrders: OutdocOrderItem[] = OUTDOC_ORDERS_TYPES.has(outdocType ?? '')
    ? outdocType === 'orders_production_start'
      ? ((d?.order_ids as string[] | undefined) ?? []).map((id) => ({ order_id: id }))
      : (d?.orders as OutdocOrderItem[] | undefined) ?? []
    : []

  const returnOrders: ReturnOrderEntry[] = RETURN_TYPES.has(outdocType ?? '')
    ? (d?.orders as ReturnOrderEntry[] | undefined) ?? []
    : []
  const payNum                 = d?.pay_num                   as string | undefined
  const payDate                = d?.pay_date                  as string | undefined
  const ordersShipmentOutdocId = d?.orders_shipment_outdoc_id as number | undefined

  const supplyTotal   = supplyGoods.reduce((s, g) => s + g.useful_qnt + g.defective_qnt, 0)
  const expiryTotal   = supplyExpiry.reduce((s, g) => s + g.qnt, 0)
  const palletsCount  = pallets.length
  const boxesCount    = pallets.reduce((s, p) => s + p.boxes.length, 0)
  const palletsTotal  = pallets.flatMap((p) => p.boxes.flatMap((b) => b.goods)).reduce((s, g) => s + g.qnt, 0)

  const corrPlus  = correctionGoods.filter((g) => g.stock_qnt > 0).reduce((s, g) => s + g.stock_qnt, 0)
  const corrMinus = correctionGoods.filter((g) => g.stock_qnt < 0).reduce((s, g) => s + g.stock_qnt, 0)
  const corrLabel = corrPlus > 0 && corrMinus < 0
    ? `Скорректированные товары (+${corrPlus}/${corrMinus})`
    : corrPlus > 0
      ? `Скорректированные товары (+${corrPlus})`
      : `Скорректированные товары (${corrMinus})`

  const ot = outdocType ?? ''
  const coreTabs: Array<{ id: Tab; label: string }> = [
    ...(GOODS_MOVEMENT_TYPES.has(ot) ? [
      { id: 'goods' as Tab, label: 'Движение товаров' },
      { id: 'sn'    as Tab, label: 'Движение серийных номеров' },
    ] : []),
    { id: 'attrs' as Tab, label: 'Атрибуты' },
    ...(FILES_TYPES.has(ot)   ? [{ id: 'files'  as Tab, label: 'Файлы' }]  : []),
    ...(PHOTOS_TYPES.has(ot)  ? [{ id: 'photos' as Tab, label: 'Фото' }]   : []),
    { id: 'json' as Tab, label: 'JSON' },
  ]

  const tabs: Array<{ id: Tab; label: string }> = [
    ...(outdocType === 'goods_supply' ? [
      { id: 'supply_goods'  as Tab, label: `Принятые товары (${supplyTotal})` },
      ...(supplyExpiry.length > 0 ? [
        { id: 'supply_expiry' as Tab, label: `Принято со сроком годности (${expiryTotal})` },
      ] : []),
    ] : []),
    ...(SHIPMENT_TYPES.has(outdocType ?? '') ? [
      { id: 'shipment_pallets' as Tab, label: `Паллеты/короба/товары для отгрузки (${palletsCount}/${boxesCount}/${palletsTotal})` },
    ] : []),
    ...(outdocType === 'goods_correction' ? [
      { id: 'correction_goods' as Tab, label: corrLabel },
    ] : []),
    ...(ORDERS_TYPES.has(outdocType ?? '') ? [
      { id: 'shipments' as Tab, label: `Отправления (${shipmentOrders.length})` },
    ] : []),
    ...(OUTDOC_ORDERS_TYPES.has(outdocType ?? '') ? [
      { id: 'outdoc_orders' as Tab, label: `Заказы (${outdocOrders.length})` },
    ] : []),
    ...(RETURN_TYPES.has(outdocType ?? '') ? [
      { id: 'return_orders' as Tab, label: `Возвращённые заказы (${returnOrders.length})` },
    ] : []),
    ...coreTabs,
  ]

  if (detailLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8 text-primary-600" />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title={
          <>
            {(writerMode || pageHelp) && (
              <HelpIconButton onClick={() => setPageHelpOpen((v) => !v)} size="lg" title="Пояснение к карточке документа" />
            )}
            {outdocType
              ? dictEnum('outdoc_type', outdocType)
              : common?.outdoc_type_descrip ?? `Документ #${outdocId}`}
          </>
        }
        subtitle={
          <>
            <PropList items={[
              { dictKey: 'outdoc_id',              value: String(outdocId) },
              { dictKey: 'outdoc_date',             value: common?.outdoc_date ? new Date(common.outdoc_date).toLocaleDateString('ru-RU') : undefined },
              { dictKey: 'created_at',              value: common?.created_at ? new Date(common.created_at).toLocaleString('ru-RU') : undefined },
              { dictKey: 'outdoc_txt',              value: common?.outdoc_txt },
              { dictKey: 'correction_type_descrip', value: correctionTypeDescip, newLine: true },
              { dictKey: 'delivery_cname',          value: deliveryId != null ? `${deliveryId} ${deliveryName ?? ''}`.trim() : undefined, newLine: true },
              { dictKey: 'plt_id',                  value: topPltId != null ? String(topPltId) : undefined },
              { dictKey: 'pay_num',                      value: payNum, newLine: true },
              { dictKey: 'pay_date',                     value: payDate ? new Date(payDate).toLocaleDateString('ru-RU') : undefined },
              { dictKey: 'orders_shipment_outdoc_id',    value: ordersShipmentOutdocId != null ? String(ordersShipmentOutdocId) : undefined, newLine: true, href: ordersShipmentOutdocId != null ? `/outdocs/${ordersShipmentOutdocId}` : undefined },
            ]} />
            {common?.indoc_id && (
              <p className="text-sm text-gray-500 mt-1">
                <span className="mr-2">Входящий документ:</span>
                <span className="inline-flex flex-wrap items-center gap-x-2">
                  {common.indoc_created_at && (
                    <span>{new Date(common.indoc_created_at).toLocaleString('ru-RU')}</span>
                  )}
                  <a
                    href={`/indocs/${encodeURIComponent(common.indoc_id)}`}
                    onClick={(e) => { e.preventDefault(); navigate(`/indocs/${encodeURIComponent(common.indoc_id!)}`) }}
                    className="text-primary-600 font-medium hover:underline"
                  >
                    {common.indoc_id}
                  </a>
                  {common.indoc_type && <span>{dictEnum('indoc_type', common.indoc_type)}</span>}
                  {common.indoc_txt && <span>{common.indoc_txt}</span>}
                </span>
              </p>
            )}
          </>
        }
      />

      {(writerMode || pageHelp) && (
        <InlineHelpPanel
          content={pageHelp?.content ?? ''}
          marker={`page:${PAGE_HELP_KEY}`}
          markerTemplate={`## Карточка исходящего документа {#page:${PAGE_HELP_KEY}}`}
          isOpen={pageHelpOpen}
          onClose={() => setPageHelpOpen(false)}
          isAuthoringMode={writerMode}
          className="-mt-4 mb-4"
        />
      )}

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {tabs.map((t) => {
          const isActive = tab === t.id
          const helpForTab = getTabHelp(PAGE_HELP_KEY, t.id)
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSetTab(t.id)}
              className={`inline-flex items-center gap-0.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {isActive && (writerMode || helpForTab) && (
                <HelpIconButton
                  asSpan
                  onClick={() => setTabHelpOpen((v) => !v)}
                  title={`Пояснение: ${t.label}`}
                />
              )}
              {t.label}
            </button>
          )
        })}
      </div>

      {(writerMode || tabHelp) && (
        <InlineHelpPanel
          content={tabHelp?.content ?? ''}
          marker={`tab:${PAGE_HELP_KEY}:${tab}`}
          markerTemplate={`### ${TAB_HELP_TITLES[tab]} {#tab:${PAGE_HELP_KEY}:${tab}}`}
          isOpen={tabHelpOpen}
          onClose={() => setTabHelpOpen(false)}
          isAuthoringMode={writerMode}
          className="mb-4"
        />
      )}

      {tab === 'supply_goods'      && <SupplyGoodsTab goods={supplyGoods} />}
      {tab === 'supply_expiry'     && <ExpiryTab items={supplyExpiry} />}
      {tab === 'shipment_pallets'  && <PalletsTab pallets={pallets} />}
      {tab === 'correction_goods'  && <CorrectionGoodsTab goods={correctionGoods} />}
      {tab === 'shipments'         && <ShipmentsTab orders={shipmentOrders} outdocType={outdocType ?? ''} />}
      {tab === 'outdoc_orders'    && <OutdocOrdersTab orders={outdocOrders} outdocType={outdocType ?? ''} />}
      {tab === 'return_orders'    && <ReturnedOrdersTab orders={returnOrders} outdocType={outdocType ?? ''} />}

      {tab === 'goods' && <GoodsMovementTab outdocId={outdocId} />}

      {tab === 'sn' && <SerialNumbersTab outdocId={outdocId} />}

      {tab === 'attrs' && (
        <div className="card overflow-hidden">
          {(attrsData?.items as IndocAttribute[] | undefined)?.length ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="th"><Hint text={dict('attribute_id', 'hint')}>{dict('attribute_id', 'short')}</Hint></th>
                  <th className="th"><Hint text={dict('attribute_name', 'hint')}>{dict('attribute_name', 'short')}</Hint></th>
                  <th className="th"><Hint text={dict('attribute_type', 'hint')}>{dict('attribute_type', 'short')}</Hint></th>
                  <th className="th"><Hint text={dict('value', 'hint')}>{dict('value', 'short')}</Hint></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(attrsData.items as IndocAttribute[]).map((a) => (
                  <tr key={a.attribute_id}>
                    <td className="td text-xs text-gray-400 font-mono">{a.attribute_id}</td>
                    <td className="td text-gray-500">{a.attribute_name}</td>
                    <td className="td text-xs text-gray-400">{dictEnum('attribute_type', a.attribute_type)}</td>
                    <td className="td font-medium">{a.value === null ? '—' : String(a.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="Атрибутов нет" />
          )}
        </div>
      )}

      {tab === 'files' && (
        <div className="card p-6">
          <div className="mb-4">
            <label className="btn-secondary cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Загрузить PDF
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadMutation.mutate(file)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
          {filesData?.items && filesData.items.length > 0 ? (
            <div className="space-y-2">
              {filesData.items.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <a href={f.url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline text-sm">
                    {f.file_name}
                  </a>
                  <button
                    className="text-red-500 hover:text-red-700 text-sm"
                    onClick={() => deleteFileMutation.mutate(f.file_name)}
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Файлов нет" description="Загрузите PDF-документы" />
          )}
        </div>
      )}

      {tab === 'photos' && <OutdocPhotosTab photos={photosData?.items ?? []} />}

      {tab === 'json' && (
        <div className="card p-6">
          {detail ? <JsonViewer data={detail} /> : <EmptyState title="Нет данных" />}
        </div>
      )}
    </>
  )
}

import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { outdocsApi } from '@/api/outdocs'
import { goodsApi } from '@/api/goods'
import { ordersApi } from '@/api/orders'
import OrderStateBadge from '@/components/ui/OrderStateBadge'
import PageHeader from '@/components/ui/PageHeader'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { dict, dictEnum } from '@/constants/dict'
import Hint from '@/components/ui/Hint'
import PropList from '@/components/ui/PropList'
import type { GoodsSupplyGoodItem, GoodsExpiryItem, GpltOut, GpltBox, CorrectionGoodItem, OrderOutItem, OutdocOrderItem } from '@/types/outdoc'
import type { PropItem } from '@/components/ui/PropList'

// ─── Вкладки ────────────────────────────────────────────────────────────────

type CoreTab = 'goods' | 'sn' | 'files' | 'photos'
type TypeTab = 'supply_goods' | 'supply_expiry' | 'shipment_pallets' | 'correction_goods' | 'shipments' | 'outdoc_orders'
type Tab = CoreTab | TypeTab

const SHIPMENT_TYPES      = new Set(['goods_shipment', 'goods_shipment_ready'])
const ORDERS_TYPES        = new Set(['orders_pallet', 'orders_shipment'])
const OUTDOC_ORDERS_TYPES = new Set(['orders_receiving', 'orders_deficit', 'orders_production_start', 'orders_cancel', 'orders_full_return', 'orders_payment', 'orders_payment_transfer', 'orders_shipment_refusal'])
const PAYMENT_TYPES       = new Set(['orders_payment', 'orders_payment_transfer'])

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
                onClick={() => navigate(`/goods/${encodeURIComponent(item.good_id)}`)}
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
              onClick={() => navigate(`/goods/${encodeURIComponent(item.good_id)}`)}
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
              onClick={() => navigate(`/goods/${encodeURIComponent(item.good_id)}`)}
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
            <SortTh sortKey="created_at"    label={dict('created_at', 'short')}    hint={dict('created_at', 'hint')}    {...sortProps} />
            <SortTh sortKey="state"         label={dict('state', 'short')}         hint={dict('state', 'hint')}         {...sortProps} />
            <SortTh sortKey="order_id"      label={dict('order_id', 'short')}      hint={dict('order_id', 'hint')}      {...sortProps} />
            <SortTh sortKey="clnt_name"     label={dict('clnt_name', 'short')}     hint={dict('clnt_name', 'hint')}     {...sortProps} />
            <SortTh sortKey="delivery_name" label={dict('delivery_name', 'short')} hint={dict('delivery_name', 'hint')} {...sortProps} />
            {showPayment  && <SortTh sortKey="payment"   label={dict('payment', 'short')}   hint={dict('payment', 'hint')}   {...sortProps} className="text-right" />}
            {showClntDate && <SortTh sortKey="clnt_date" label={dict('clnt_date', 'short')} hint={dict('clnt_date', 'hint')} {...sortProps} />}
            {showFileDate && <SortTh sortKey="file_date" label={dict('file_date', 'short')} hint={dict('file_date', 'hint')} {...sortProps} />}
          </tr>
        </thead>
        {sorted.map((item) => {
          const outdocOrd = outdocOrdersMap.get(item.order_id)
          const extraInfo = outdocType === 'orders_deficit'
            ? [outdocOrd?.error_code, outdocOrd?.error_descrip].filter(Boolean).join(' ')
            : outdocType === 'orders_cancel'
            ? [outdocOrd?.cancel_reason, outdocOrd?.cancel_reason_descrip].filter(Boolean).join(' ')
            : outdocType === 'orders_full_return'
            ? [outdocOrd?.ret_reason, outdocOrd?.ret_reason_descrip].filter(Boolean).join(' ')
            : ''
          return (
            <tbody
              key={item.order_id}
              className="border-t border-gray-200 group cursor-pointer"
              onClick={() => navigate(`/orders/${encodeURIComponent(item.order_id)}`)}
            >
              <tr className="group-hover:bg-gray-50 transition-colors">
                <td className="td text-gray-500">{new Date(item.created_at).toLocaleString('ru-RU')}</td>
                <td className="td"><OrderStateBadge state={item.state} /></td>
                <td className="td font-medium text-primary-600">{item.order_id}</td>
                <td className="td text-gray-500">{item.clnt_name ?? '—'}</td>
                <td className="td text-gray-500">{item.delivery_name ?? '—'}</td>
                {showPayment  && <td className="td text-right">{outdocOrd?.payment ?? '—'}</td>}
                {showClntDate && <td className="td text-gray-500">{outdocOrd?.clnt_date ? new Date(outdocOrd.clnt_date).toLocaleDateString('ru-RU') : '—'}</td>}
                {showFileDate && <td className="td text-gray-500">{outdocOrd?.file_date ? new Date(outdocOrd.file_date).toLocaleDateString('ru-RU') : '—'}</td>}
              </tr>
              {extraInfo && (
                <tr>
                  <td colSpan={COL_COUNT} className="px-4 pt-0 pb-1 bg-white group-hover:bg-gray-50 transition-colors">
                    <span className="text-sm text-amber-700">{extraInfo}</span>
                  </td>
                </tr>
              )}
              {item.outdocs && item.outdocs.length > 0 && (
                <tr>
                  <td colSpan={COL_COUNT} className="px-4 pt-0 pb-1 bg-white group-hover:bg-gray-50 transition-colors">
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                      {item.outdocs.map((od) => (
                        <span key={od.outdoc_id} className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span>{new Date(od.created_at).toLocaleString('ru-RU')}</span>
                          <a
                            href={`/outdocs/${od.outdoc_id}`}
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); navigate(`/outdocs/${od.outdoc_id}`) }}
                            className="text-primary-600 font-medium hover:underline"
                          >
                            {od.outdoc_id}
                          </a>
                          <span>{od.outdoc_type_descrip}</span>
                        </span>
                      ))}
                    </div>
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
              onClick={() => navigate(`/orders/${encodeURIComponent(item.order_id)}`)}
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
                        onClick={() => navigate(`/goods/${encodeURIComponent(g.good_id)}`)}
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

  const initialTab: Tab = (sessionStorage.getItem(tabKey) as Tab | null)
    ?? (outdocType === 'goods_supply'              ? 'supply_goods'
      : SHIPMENT_TYPES.has(outdocType ?? '')       ? 'shipment_pallets'
      : outdocType === 'goods_correction'          ? 'correction_goods'
      : ORDERS_TYPES.has(outdocType ?? '')         ? 'shipments'
      : OUTDOC_ORDERS_TYPES.has(outdocType ?? '')  ? 'outdoc_orders'
      : 'goods')
  const [tab, setTab] = useState<Tab>(initialTab)

  function handleSetTab(t: Tab) {
    sessionStorage.setItem(tabKey, t)
    setTab(t)
  }

  const { data: goodsData } = useQuery({
    queryKey: ['outdoc-goods', outdocId],
    queryFn: () => outdocsApi.getGoods(outdocId),
    enabled: tab === 'goods',
  })

  const { data: snData } = useQuery({
    queryKey: ['outdoc-sn', outdocId],
    queryFn: () => outdocsApi.getSerialNumbers(outdocId),
    enabled: tab === 'sn',
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

  const coreTabs: Array<{ id: Tab; label: string }> = [
    { id: 'goods',  label: 'Движение товаров' },
    { id: 'sn',     label: 'Движение серийных номеров' },
    { id: 'files',  label: 'Файлы' },
    { id: 'photos', label: 'Фото' },
  ]

  const tabs: Array<{ id: Tab; label: string }> = [
    ...(outdocType === 'goods_supply' ? [
      { id: 'supply_goods'  as Tab, label: `Принятые товары (${supplyTotal})` },
      ...(supplyExpiry.length > 0 ? [
        { id: 'supply_expiry' as Tab, label: `Принято со сроком годности (${expiryTotal})` },
      ] : []),
    ] : []),
    ...(SHIPMENT_TYPES.has(outdocType ?? '') ? [
      { id: 'shipment_pallets' as Tab, label: `Короба для отгрузки (${palletsCount}/${boxesCount}/${palletsTotal})` },
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
          outdocType
            ? dictEnum('outdoc_type', outdocType)
            : common?.outdoc_type_descrip ?? `Документ #${outdocId}`
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
              { dictKey: 'orders_shipment_outdoc_id',    value: ordersShipmentOutdocId != null ? String(ordersShipmentOutdocId) : undefined, newLine: true },
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
        actions={
          <button className="btn-secondary" onClick={() => navigate('/outdocs')}>
            ← Назад
          </button>
        }
      />

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => handleSetTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'supply_goods'      && <SupplyGoodsTab goods={supplyGoods} />}
      {tab === 'supply_expiry'     && <ExpiryTab items={supplyExpiry} />}
      {tab === 'shipment_pallets'  && <PalletsTab pallets={pallets} />}
      {tab === 'correction_goods'  && <CorrectionGoodsTab goods={correctionGoods} />}
      {tab === 'shipments'         && <ShipmentsTab orders={shipmentOrders} outdocType={outdocType ?? ''} />}
      {tab === 'outdoc_orders'    && <OutdocOrdersTab orders={outdocOrders} outdocType={outdocType ?? ''} />}

      {tab === 'goods' && (
        <div className="card overflow-hidden">
          {goodsData?.goods && goodsData.goods.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="th"><Hint text={dict('good_id', 'hint')}>{dict('good_id', 'short')}</Hint></th>
                  <th className="th">Состояние</th>
                  <th className="th"><Hint text={dict('qual_type', 'hint')}>{dict('qual_type', 'short')}</Hint></th>
                  <th className="th text-right"><Hint text={dict('qnt', 'hint')}>{dict('qnt', 'short')}</Hint></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {goodsData.goods.map((g, i) => (
                  <tr key={i}>
                    <td className="td font-mono text-sm">{g.good_id}</td>
                    <td className="td text-gray-500">{g.good_state}</td>
                    <td className="td text-gray-500">{dictEnum('qual_type', g.qual_type)}</td>
                    <td className="td text-right font-medium">{g.qnt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="Нет данных о товарах" />
          )}
        </div>
      )}

      {tab === 'sn' && (
        <div className="card overflow-hidden">
          {snData?.good_sn && snData.good_sn.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="th"><Hint text={dict('good_sn', 'hint')}>{dict('good_sn', 'short')}</Hint></th>
                  <th className="th"><Hint text={dict('good_id', 'hint')}>{dict('good_id', 'short')}</Hint></th>
                  <th className="th"><Hint text={dict('qual_type', 'hint')}>{dict('qual_type', 'short')}</Hint></th>
                  <th className="th"><Hint text={dict('inout', 'hint')}>{dict('inout', 'short')}</Hint></th>
                  <th className="th"><Hint text={dict('order_id', 'hint')}>{dict('order_id', 'short')}</Hint></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {snData.good_sn.map((sn, i) => (
                  <tr key={i}>
                    <td className="td font-mono text-sm">{sn.good_sn}</td>
                    <td className="td text-gray-500 font-mono text-sm">{sn.good_id}</td>
                    <td className="td text-gray-500">{dictEnum('qual_type', sn.qual_type)}</td>
                    <td className="td">
                      <span className={`badge ${sn.inout === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {sn.inout === 1 ? 'Приход' : 'Расход'}
                      </span>
                    </td>
                    <td className="td text-gray-500">{sn.order_id ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="Серийных номеров нет" />
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
            <EmptyState title="Файлов нет" />
          )}
        </div>
      )}

      {tab === 'photos' && (
        <div className="card p-6">
          {photosData?.items && photosData.items.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {photosData.items.map((p) => (
                <a key={p.photo_id} href={p.url} target="_blank" rel="noreferrer">
                  <img
                    src={p.url}
                    alt={p.descrip ?? 'фото'}
                    className="w-full aspect-square object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                  />
                </a>
              ))}
            </div>
          ) : (
            <EmptyState title="Фото нет" />
          )}
        </div>
      )}
    </>
  )
}

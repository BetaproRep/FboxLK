import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { isTextSelected } from '@/utils/selection'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ordersApi } from '@/api/orders'
import type { OrderDetail, OrderDetailPltGood } from '@/types/order'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import PropList from '@/components/ui/PropList'
import type { PropItem } from '@/components/ui/PropList'
import OrderStateBadge from '@/components/ui/OrderStateBadge'
import { useConfirmDialog } from '@/components/ui/ConfirmDialog'
import { dict, dictEnum } from '@/constants/dict'
import Hint from '@/components/ui/Hint'

type Tab = 'goods' | 'outdocs' | 'events' | 'shipment' | 'photos' | 'json'

function highlightJson(json: string): string {
  return json.replace(
    /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      if (/^"/.test(match)) {
        return /:$/.test(match)
          ? `<span class="text-gray-900 font-medium">${match}</span>`
          : `<span class="text-green-700">${match}</span>`
      }
      if (match === 'true' || match === 'false') return `<span class="text-purple-600">${match}</span>`
      if (match === 'null') return `<span class="text-gray-400">${match}</span>`
      return `<span class="text-blue-600">${match}</span>`
    }
  )
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const orderId = decodeURIComponent(id!)

  const { confirm, confirmNode } = useConfirmDialog()

  const tabKey = `order-tab-${orderId}`
  const [tab, setTab] = useState<Tab>(() => (sessionStorage.getItem(tabKey) as Tab) ?? 'goods')

  function handleSetTab(t: Tab) {
    sessionStorage.setItem(tabKey, t)
    setTab(t)
  }

  const { data: jsonData, isLoading: jsonLoading } = useQuery({
    queryKey: ['order-json', orderId],
    queryFn: () => ordersApi.getJson(orderId),
    enabled: tab === 'json',
    retry: false,
  })

  const { data: orderResp, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.get(orderId),
  })

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancel([orderId]),
    onSuccess: () => {
      toast.success('Заказ отменён')
      qc.invalidateQueries({ queryKey: ['order', orderId] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner className="w-8 h-8 text-primary-600" /></div>
  }

  const order = orderResp?.order as OrderDetail | undefined
  if (!order) return null

  const deliveryCname = [order.delivery_id, order.delivery_name].filter(Boolean).join(' ')

  const propItems: PropItem[] = [
    { dictKey: 'created_at',     value: order.created_at ? new Date(order.created_at).toLocaleString() : null },
    { dictKey: 'indoc_id',       value: order.indoc_id },
    { dictKey: 'indoc_txt',      value: order.indoc_txt },
    { dictKey: 'origin',         value: order.origin, newLine: true },
    { dictKey: 'delivery_cname', value: deliveryCname || null },
    { dictKey: 'clnt_name',      value: order.clnt_name },
    { dictKey: 'clnt_addr',      value: order.clnt_addr },
    { dictKey: 'plt_barcode',    value: order.plt_info?.barcode, newLine: true },
    { dictKey: 'dispatch_number',value: order.plt_info?.dispatch_number },
    { dictKey: 'declared_value', value: order.plt_info?.declared_value != null ? `${order.plt_info.declared_value} ₽` : null },
    { dictKey: 'cod',            value: order.plt_info?.cod != null ? `${order.plt_info.cod} ₽` : null },
    { dictKey: 'wait_reason',    value: order.wait_reason, newLine: true, valueColor: 'red' },
  ]

  const tabs: { key: Tab; label: string }[] = [
    { key: 'goods',   label: `Состав заказа (${order.goods?.reduce((s, g) => s + g.qnt, 0) ?? 0})` },
    { key: 'outdocs', label: `Исходящие документы (${order.outdocs?.length ?? 0})` },
    { key: 'events',   label: `События на складе (${order.events?.length ?? 0})` },
    { key: 'shipment', label: `Отправление (${order.plt_info?.units?.length ?? 0})` },
    { key: 'photos',   label: `Фото (${order.photos?.length ?? 0})` },
    { key: 'json',     label: 'JSON' },
  ]

  return (
    <>
      <PageHeader
        title={<>{`Заказ ${order.order_id ?? orderId}`}{order.state && <OrderStateBadge state={order.state} />}</>}
        subtitle={<PropList items={propItems} className="text-sm text-gray-500" />}
        actions={
          <div className="flex gap-2">
            <button
              className="btn-danger"
              onClick={async () => { if (await confirm('Отменить заказ?', { confirmLabel: 'Отменить' })) cancelMutation.mutate() }}
              disabled={cancelMutation.isPending || order.canceled}
            >
              Отменить
            </button>
          </div>
        }
      />

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleSetTab(key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'goods' && (
        <div className="card overflow-hidden">
          {order.goods && order.goods.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="th"><Hint text={dict('good_id', 'hint')}>{dict('good_id', 'short')}</Hint></th>
                  <th className="th"><Hint text={dict('good_type', 'hint')}>{dict('good_type', 'short')}</Hint></th>
                  <th className="th"><Hint text={dict('good_name', 'hint')}>{dict('good_name', 'short')}</Hint></th>
                  <th className="th text-right"><Hint text={dict('qnt', 'hint')}>{dict('qnt', 'short')}</Hint></th>
                  <th className="th text-right"><Hint text={dict('declared_value', 'hint')}>{dict('declared_value', 'short')}</Hint></th>
                  <th className="th text-right"><Hint text={dict('cod', 'hint')}>{dict('cod', 'short')}</Hint></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.goods.map((g) => (
                  <tr
                    key={g.good_id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => { if (isTextSelected()) return; navigate(`/goods/${encodeURIComponent(g.good_id)}`) }}
                  >
                    <td className="td font-medium text-primary-600">{g.good_id}</td>
                    <td className="td text-sm text-gray-500">{dictEnum('good_type', g.good_type)}</td>
                    <td className="td text-gray-700">{g.good_name}</td>
                    <td className="td text-right">{g.qnt}</td>
                    <td className="td text-right text-gray-600">{g.declared_value} ₽</td>
                    <td className="td text-right text-gray-600">{g.cod} ₽</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="Товары не найдены" />
          )}
        </div>
      )}

      {tab === 'outdocs' && (
        <div className="card overflow-hidden">
          {order.outdocs && order.outdocs.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="th"><Hint text={dict('created_at', 'hint')}>{dict('created_at', 'short')}</Hint></th>
                  <th className="th"><Hint text={dict('outdoc_date', 'hint')}>{dict('outdoc_date', 'short')}</Hint></th>
                  <th className="th"><Hint text={dict('outdoc_id', 'hint')}>{dict('outdoc_id', 'short')}</Hint></th>
                  <th className="th"><Hint text={dict('outdoc_type_descrip', 'hint')}>{dict('outdoc_type_descrip', 'short')}</Hint></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.outdocs.map((od) => (
                  <tr
                    key={od.outdoc_id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => { if (isTextSelected()) return; navigate(`/outdocs/${od.outdoc_id}`) }}
                  >
                    <td className="td text-gray-500">{new Date(od.created_at).toLocaleString()}</td>
                    <td className="td text-gray-500">{new Date(od.outdoc_date).toLocaleDateString()}</td>
                    <td className="td font-medium text-primary-600">{od.outdoc_id}</td>
                    <td className="td text-gray-500">{od.outdoc_type_descrip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="Исходящих документов нет" />
          )}
        </div>
      )}
      {tab === 'shipment' && (() => {
        const units = order.plt_info?.units
        const pltGoods = order.plt_info?.goods ?? []

        if (!units?.length) {
          return <div className="card overflow-hidden"><EmptyState title="Отправление ещё не сформировано" /></div>
        }

        const showSn      = pltGoods.some(g => g.good_sn)
        const showExpiry  = pltGoods.some(g => g.expiry_date)

        function groupGoods(goods: OrderDetailPltGood[]) {
          const map = new Map<string, { good_id: string; good_type: string; good_name: string; good_sn?: string; expiry_date?: string; qnt: number; declared_value: number; cod: number }>()
          for (const g of goods) {
            const key = [g.good_id, g.good_type, g.good_name, g.good_sn ?? '', g.expiry_date ?? ''].join('\x00')
            const row = map.get(key)
            if (row) {
              row.qnt++
              row.declared_value += g.declared_value
              row.cod += g.cod
            } else {
              map.set(key, { good_id: g.good_id, good_type: g.good_type, good_name: g.good_name, good_sn: g.good_sn, expiry_date: g.expiry_date, qnt: 1, declared_value: g.declared_value, cod: g.cod })
            }
          }
          return [...map.values()]
        }

        return (
          <div className="space-y-4">
            {units.map(unit => {
              const unitGoods = groupGoods(pltGoods.filter(g => g.unit_num === unit.unit_num))
              const unitDims = [unit.length, unit.width, unit.height].every(v => v != null)
                ? `${unit.length} × ${unit.width} × ${unit.height} мм`
                : null
              const unitProps: PropItem[] = [
                { dictKey: 'unit_num',   value: String(unit.unit_num) },
                { dictKey: 'plt_barcode', value: unit.barcode },
                { dictKey: 'pack_name',  value: unit.pack_name },
                { dictKey: 'pack_weight',value: unit.pack_weight != null ? `${unit.pack_weight} г` : null },
                { dictKey: 'weight__parunit',     value: unit.weight != null ? `${unit.weight} г` : null },
                { dictKey: 'unit_dims',  value: unitDims },
              ]
              return (
                <div key={unit.unit_num} className="card overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <PropList items={unitProps} className="text-sm text-gray-500" />
                  </div>
                  {unitGoods.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="th"><Hint text={dict('good_id', 'hint')}>{dict('good_id', 'short')}</Hint></th>
                          <th className="th"><Hint text={dict('good_type', 'hint')}>{dict('good_type', 'short')}</Hint></th>
                          <th className="th"><Hint text={dict('good_name', 'hint')}>{dict('good_name', 'short')}</Hint></th>
                          {showSn     && <th className="th"><Hint text={dict('good_sn', 'hint')}>{dict('good_sn', 'short')}</Hint></th>}
                          {showExpiry && <th className="th"><Hint text={dict('expiry_date', 'hint')}>{dict('expiry_date', 'short')}</Hint></th>}
                          <th className="th text-right"><Hint text={dict('qnt', 'hint')}>{dict('qnt', 'short')}</Hint></th>
                          <th className="th text-right"><Hint text={dict('declared_value', 'hint')}>{dict('declared_value', 'short')}</Hint></th>
                          <th className="th text-right"><Hint text={dict('cod', 'hint')}>{dict('cod', 'short')}</Hint></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {unitGoods.map((g, i) => (
                          <tr key={i} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => { if (isTextSelected()) return; navigate(`/goods/${encodeURIComponent(g.good_id)}`) }}>
                            <td className="td font-medium text-primary-600">{g.good_id}</td>
                            <td className="td text-sm text-gray-500">{dictEnum('good_type', g.good_type)}</td>
                            <td className="td text-gray-700">{g.good_name}</td>
                            {showSn     && <td className="td text-sm text-gray-500">{g.good_sn ?? '—'}</td>}
                            {showExpiry && <td className="td text-sm text-gray-500">{g.expiry_date ?? '—'}</td>}
                            <td className="td text-right">{g.qnt}</td>
                            <td className="td text-right text-gray-600">{g.declared_value} ₽</td>
                            <td className="td text-right text-gray-600">{g.cod} ₽</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <EmptyState title="Товары не найдены" />
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}

      {tab === 'events' && (
        <div className="card overflow-hidden">
          {order.events && order.events.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="th"><Hint text={dict('event_date', 'hint')}>{dict('event_date', 'short')}</Hint></th>
                  <th className="th"><Hint text={dict('event_descrip', 'hint')}>{dict('event_descrip', 'short')}</Hint></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.events.map((e) => (
                  <tr key={e.event_id}>
                    <td className="td text-gray-500 whitespace-nowrap">{new Date(e.event_date).toLocaleString()}</td>
                    <td className="td text-gray-700">{e.descrip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="Событий нет" />
          )}
        </div>
      )}
      {tab === 'photos' && (
        <div className="card p-6">
          {order.photos && order.photos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {order.photos.map((p) => (
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
      {tab === 'json' && (
        <div className="card overflow-hidden">
          {jsonLoading ? (
            <div className="flex justify-center py-16"><Spinner className="w-8 h-8 text-primary-600" /></div>
          ) : jsonData && !jsonData.success ? (
            <div className="px-6 py-4 text-sm text-red-600">{jsonData.error_message ?? 'Ошибка загрузки'}</div>
          ) : jsonData?.order ? (
            <pre
              className="p-4 text-xs font-mono overflow-auto leading-relaxed"
              dangerouslySetInnerHTML={{ __html: highlightJson(JSON.stringify(jsonData.order, null, 2)) }}
            />
          ) : (
            <EmptyState title="Нет данных" />
          )}
        </div>
      )}
      {confirmNode}
    </>
  )
}

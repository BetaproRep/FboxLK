import { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { indocsApi } from '@/api/indocs'
import { goodsApi } from '@/api/goods'
import { ordersApi } from '@/api/orders'
import PageHeader from '@/components/ui/PageHeader'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import JsonViewer from '@/components/ui/JsonViewer'
import type { IndocListItem, WebIndocListItem, IndocJson, IndocAttribute, IndocPhoto } from '@/types/indoc'
import type { OrderListItem } from '@/types/order'
import OrderStateBadge from '@/components/ui/OrderStateBadge'
import { dict, dictEnum } from '@/constants/dict'
import Hint from '@/components/ui/Hint'
import PropList from '@/components/ui/PropList'
import IndocStateBadge from '@/components/ui/IndocStateBadge'
import { useConfirmDialog } from '@/components/ui/ConfirmDialog'

// ─── Вкладки ────────────────────────────────────────────────────────────────

type CoreTab = 'attrs' | 'outdocs' | 'json' | 'files' | 'photos'
type TypeTab = 'goods' | 'orders' | 'boxes'
type Tab = CoreTab | TypeTab

function typeTab(indocType: WebIndocListItem['indoc_type']): { id: TypeTab; label: string } | null {
  switch (indocType) {
    case 'goods_supply_task':    return { id: 'goods',  label: 'Ожидаемые товары' }
    case 'goods_shipment_task':  return { id: 'goods',  label: 'Товары к отгрузке' }
    case 'orders_shipment_task': return { id: 'orders', label: 'Заказы' }
    case 'goods_from_long_storage_task': return { id: 'boxes', label: 'Коробки' }
    default: return null
  }
}

// ─── Компоненты вкладок ──────────────────────────────────────────────────────

function GoodsTab({ indoc }: { indoc: IndocJson }) {
  const navigate = useNavigate()

  const isApplicable =
    indoc.indoc_type === 'goods_supply_task' || indoc.indoc_type === 'goods_shipment_task'

  const goodIds = isApplicable ? indoc.items.map((i) => i.good_id) : []

  const { data: goodsData } = useQuery({
    queryKey: ['goods-by-ids', goodIds],
    queryFn: () => goodsApi.list({ good_ids: goodIds }),
    enabled: goodIds.length > 0,
  })

  const goodsMap = new Map(goodsData?.items.map((g) => [g.good_id, g.good_name]))

  const showSn =
    (indoc.indoc_type === 'goods_supply_task' || indoc.indoc_type === 'goods_shipment_task') &&
    indoc.items.some((i) => i.sn_mandant)

  const showPrice =
    indoc.indoc_type === 'goods_shipment_task' &&
    indoc.items.some((i) => (i as { price?: number }).price != null)

  if (!isApplicable) return null

  return (
    <div className="card overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="th"><Hint text={dict('good_id', 'hint')}>{dict('good_id', 'short')}</Hint></th>
            <th className="th"><Hint text={dict('good_name', 'hint')}>{dict('good_name', 'short')}</Hint></th>
            <th className="th text-right">
              {indoc.indoc_type === 'goods_supply_task'
                ? <Hint text={dict('plan_qnt__in', 'hint')}>{dict('plan_qnt__in', 'short')}</Hint>
                : <Hint text={dict('plan_qnt__out', 'hint')}>{dict('plan_qnt__out', 'short')}</Hint>
              }
            </th>
            {showPrice && (
              <th className="th text-right"><Hint text={dict('price', 'hint')}>{dict('price', 'short')}</Hint></th>
            )}
            {showSn && (
              <th className="th"><Hint text={dict('sn_mandant', 'hint')}>{dict('sn_mandant', 'short')}</Hint></th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {indoc.items.map((item, i) => (
            <tr
              key={i}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => navigate(`/goods/${encodeURIComponent(item.good_id)}`)}
            >
              <td className="td font-medium text-primary-600">{item.good_id}</td>
              <td className="td text-gray-700">
                {goodsMap.get(item.good_id) ?? (
                  <span className="text-gray-400 italic">—</span>
                )}
              </td>
              <td className="td text-right">{item.plan_qnt}</td>
              {showPrice && (
                <td className="td text-right text-gray-500">
                  {(item as { price?: number }).price != null
                    ? `${(item as { price?: number }).price} ₽`
                    : '—'}
                </td>
              )}
              {showSn && (
                <td className="td text-gray-500">
                  {item.sn_mandant ? 'Требуется' : '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {indoc.items.length === 0 && <EmptyState title="Товаров нет" />}
    </div>
  )
}

function OrdersTab({ indoc }: { indoc: IndocJson }) {
  const navigate = useNavigate()

  const orderIds = indoc.indoc_type === 'orders_shipment_task'
    ? indoc.orders.map((o) => o.order_id)
    : []

  const { data, isLoading } = useQuery({
    queryKey: ['orders-by-ids', orderIds],
    queryFn: () => ordersApi.list({ order_ids: orderIds }),
    enabled: orderIds.length > 0,
  })

  if (indoc.indoc_type !== 'orders_shipment_task') return null

  const items: OrderListItem[] = data?.items ?? []

  if (isLoading) {
    return <div className="flex justify-center py-8"><Spinner className="w-6 h-6 text-primary-600" /></div>
  }

  return (
    <div className="card overflow-hidden">
      <table className="min-w-full border-collapse">
        <thead className="bg-gray-50">
          <tr>
            <th className="th"><Hint text={dict('created_at', 'hint')}>{dict('created_at', 'short')}</Hint></th>
            <th className="th"><Hint text={dict('state', 'hint')}>{dict('state', 'short')}</Hint></th>
            <th className="th"><Hint text={dict('order_id', 'hint')}>{dict('order_id', 'short')}</Hint></th>
            <th className="th"><Hint text={dict('clnt_name', 'hint')}>{dict('clnt_name', 'short')}</Hint></th>
            <th className="th"><Hint text={dict('delivery_name', 'hint')}>{dict('delivery_name', 'short')}</Hint></th>
          </tr>
        </thead>
        {items.map((item) => (
          <tbody
            key={item.order_id}
            className="border-t border-gray-200 group cursor-pointer"
            onClick={() => navigate(`/orders/${encodeURIComponent(item.order_id)}`)}
          >
            <tr className="group-hover:bg-gray-50 transition-colors">
              <td className="td text-gray-500">{new Date(item.created_at).toLocaleString()}</td>
              <td className="td"><OrderStateBadge state={item.state} /></td>
              <td className="td font-medium text-primary-600">{item.order_id}</td>
              <td className="td text-gray-500">{item.clnt_name ?? '—'}</td>
              <td className="td text-gray-500">{item.delivery_name ?? '—'}</td>
            </tr>
            {item.outdocs?.length ? (
              <tr>
                <td colSpan={5} className="px-4 pt-0 pb-1 bg-white group-hover:bg-gray-50 transition-colors">
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    {item.outdocs.map((od) => (
                      <span key={od.outdoc_id} className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span>{new Date(od.created_at).toLocaleString()}</span>
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
            ) : null}
          </tbody>
        ))}
      </table>
      {items.length === 0 && <EmptyState title="Заказов нет" />}
    </div>
  )
}

function PhotosTab({ photos }: { photos: IndocPhoto[] }) {
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

function AttrsTab({ attrs }: { attrs: IndocAttribute[] }) {
  if (attrs.length === 0) return <div className="card p-6"><EmptyState title="Атрибутов нет" /></div>
  return (
    <div className="card overflow-hidden">
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
          {attrs.map((a) => (
            <tr key={a.attribute_id}>
              <td className="td text-xs text-gray-400 font-mono">{a.attribute_id}</td>
              <td className="td text-gray-500">{a.attribute_name}</td>
              <td className="td text-xs text-gray-400">{dictEnum('attribute_type', a.attribute_type)}</td>
              <td className="td font-medium">{a.value === null ? '—' : String(a.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OutdocsTab({ outdocs }: { outdocs: NonNullable<WebIndocListItem['outdocs']> }) {
  const navigate = useNavigate()
  return (
    <div className="card overflow-hidden">
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
          {outdocs.map((od) => (
            <tr
              key={od.outdoc_id}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => navigate(`/outdocs/${od.outdoc_id}`)}
            >
              <td className="td text-gray-500">{new Date(od.created_at).toLocaleString()}</td>
              <td className="td text-gray-500">{new Date(od.outdoc_date).toLocaleDateString()}</td>
              <td className="td font-medium text-primary-600">{od.outdoc_id}</td>
              <td className="td text-gray-500">{od.outdoc_type_descrip}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BoxesTab({ indoc }: { indoc: IndocJson }) {
  if (indoc.indoc_type !== 'goods_from_long_storage_task') return null

  return (
    <div className="card p-6">
      {indoc.box_ids.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {indoc.box_ids.map((id) => (
            <span key={id} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-mono">
              {id}
            </span>
          ))}
        </div>
      ) : (
        <EmptyState title="Список коробов пуст" />
      )}
    </div>
  )
}

// ─── Основной компонент ──────────────────────────────────────────────────────

export default function IndocDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const indocId = decodeURIComponent(id!)

  // Метаданные из состояния роутера — fallback пока грузится webList
  const listItem = location.state?.item as IndocListItem | undefined

  const { confirm, confirmNode } = useConfirmDialog()

  const tabKey = `indoc-tab-${indocId}`
  const initialTab: Tab = (sessionStorage.getItem(tabKey) as Tab | null)
    ?? (listItem?.indoc_type ? (typeTab(listItem.indoc_type)?.id ?? 'json') : 'json')
  const [tab, setTab] = useState<Tab>(initialTab)

  function handleSetTab(t: Tab) {
    sessionStorage.setItem(tabKey, t)
    setTab(t)
  }

  const { data: webListData } = useQuery({
    queryKey: ['indoc-web', indocId],
    queryFn: () => indocsApi.webList({ indoc_ids: [indocId] }),
  })

  const webItem = webListData?.items[0]

  const { data: jsonData, isLoading: jsonLoading } = useQuery({
    queryKey: ['indoc-json', indocId],
    queryFn: () => indocsApi.getJson(indocId),
  })

  const { data: attrsData } = useQuery({
    queryKey: ['indoc-attrs', indocId],
    queryFn: () => indocsApi.getAttributes(indocId),
    enabled: tab === 'attrs',
  })

  const { data: filesData } = useQuery({
    queryKey: ['indoc-files', indocId],
    queryFn: () => indocsApi.getFiles(indocId),
    enabled: tab === 'files',
  })

  const { data: photosData } = useQuery({
    queryKey: ['indoc-photos', indocId],
    queryFn: () => indocsApi.getPhotos(indocId),
    enabled: tab === 'photos',
  })

  const deleteMutation = useMutation({
    mutationFn: () => indocsApi.delete(indocId),
    onSuccess: () => {
      toast.success('Документ удалён')
      qc.invalidateQueries({ queryKey: ['indocs'] })
      navigate('/indocs')
    },
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => indocsApi.uploadFile(indocId, file),
    onSuccess: () => {
      toast.success('Файл загружен')
      qc.invalidateQueries({ queryKey: ['indoc-files', indocId] })
    },
  })

  const deleteFileMutation = useMutation({
    mutationFn: (fileName: string) => indocsApi.deleteFile(indocId, [fileName]),
    onSuccess: () => {
      toast.success('Файл удалён')
      qc.invalidateQueries({ queryKey: ['indoc-files', indocId] })
    },
  })

  const indoc = jsonData?.indoc

  // Заголовок — из webList; fallback на router state пока запрос не завершён
  const indocType = webItem?.indoc_type      ?? listItem?.indoc_type
  const indocTxt  = webItem?.indoc_txt       ?? listItem?.indoc_txt
  const createdAt = webItem?.created_at      ?? listItem?.created_at
  const indocState   = webItem?.indoc_state
  const stateDescrip = webItem?.indoc_state_descrip

  const goodsSum =
    indoc && (indoc.indoc_type === 'goods_supply_task' || indoc.indoc_type === 'goods_shipment_task')
      ? indoc.items.reduce((s, i) => s + i.plan_qnt, 0)
      : null

  const specificTab = indocType ? typeTab(indocType) : null
  const outdocs = webItem?.outdocs
  const tabs: Array<{ id: Tab; label: string }> = [
    ...(specificTab ? [{
      id: specificTab.id,
      label: specificTab.id === 'goods' && goodsSum != null
        ? `${specificTab.label} (${goodsSum})`
        : specificTab.label,
    }] : []),
    { id: 'attrs' as Tab, label: 'Атрибуты' },
    ...(indocType === 'goods_supply_task' || indocType === 'goods_shipment_task'
      ? [{ id: 'files' as Tab, label: 'Файлы' }]
      : []),
    ...(outdocs?.length ? [{ id: 'outdocs' as Tab, label: `Исходящие документы (${outdocs.length})` }] : []),
    ...(indocType === 'goods_supply_task' || indocType === 'goods_shipment_task'
      ? [{ id: 'photos' as Tab, label: 'Фото' }]
      : []),
    { id: 'json' as Tab, label: 'JSON' },
  ]

  return (
    <>
      <PageHeader
        title={
          <>
            {indocType ? dictEnum('indoc_type', indocType) : indocId}
            {indocState != null && stateDescrip && (
              <IndocStateBadge state={indocState} descrip={stateDescrip} />
            )}
          </>
        }
        subtitle={
          <PropList items={[
            { dictKey: 'indoc_id',    value: indocId },
            { dictKey: 'created_at',  value: createdAt ? new Date(createdAt).toLocaleString('ru-RU') : undefined },
            { dictKey: 'indoc_txt',   value: indocTxt },
          ]} />
        }
        actions={
          <button
            className="btn-danger"
            onClick={async () => { if (await confirm('Удалить документ?', { confirmLabel: 'Удалить' })) deleteMutation.mutate() }}
            disabled={deleteMutation.isPending}
          >
            Удалить
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

      {tab === 'goods'   && indoc    && <GoodsTab   indoc={indoc} />}
      {tab === 'orders'  && indoc    && <OrdersTab  indoc={indoc} />}
      {tab === 'boxes'   && indoc    && <BoxesTab   indoc={indoc} />}
      {tab === 'attrs'   && <AttrsTab attrs={attrsData?.items ?? []} />}
      {tab === 'outdocs' && outdocs  && <OutdocsTab outdocs={outdocs} />}

      {tab === 'json' && (
        <div className="card p-6">
          {jsonLoading ? (
            <div className="flex justify-center py-8"><Spinner className="w-6 h-6 text-primary-600" /></div>
          ) : indoc ? (
            <JsonViewer data={indoc} />
          ) : (
            <EmptyState title="Нет данных" />
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

      {tab === 'photos' && <PhotosTab photos={photosData?.items ?? []} />}
      {confirmNode}
    </>
  )
}

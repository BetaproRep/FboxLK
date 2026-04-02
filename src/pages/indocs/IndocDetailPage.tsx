import { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { indocsApi } from '@/api/indocs'
import { goodsApi } from '@/api/goods'
import PageHeader from '@/components/ui/PageHeader'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import JsonViewer from '@/components/ui/JsonViewer'
import type { IndocListItem, IndocJson } from '@/types/indoc'
import { FIELDS } from '@/constants/fields'

// ─── Вкладки ────────────────────────────────────────────────────────────────

type CoreTab = 'json' | 'files' | 'photos'
type TypeTab = 'goods' | 'orders' | 'boxes'
type Tab = CoreTab | TypeTab

function typeTab(indocType: IndocJson['indoc_type']): { id: TypeTab; label: string } | null {
  switch (indocType) {
    case 'goods_supply_task':    return { id: 'goods',  label: 'Товары' }
    case 'goods_shipment_task':  return { id: 'goods',  label: 'Товары' }
    case 'orders_shipment_task': return { id: 'orders', label: 'Заказы' }
    case 'goods_from_long_storage_task': return { id: 'boxes', label: 'Коробки' }
    default: return null
  }
}

const INDOC_TYPE_LABELS: Record<IndocJson['indoc_type'], string> = {
  goods_supply_task:             'Поставка товаров',
  goods_shipment_task:           'Отгрузка товаров',
  orders_shipment_task:          'Отгрузка заказов',
  goods_from_long_storage_task:  'Возврат из длительного хранения',
}

// ─── Компоненты вкладок ──────────────────────────────────────────────────────

function GoodsTab({ indoc }: { indoc: IndocJson }) {
  const isApplicable =
    indoc.indoc_type === 'goods_supply_task' || indoc.indoc_type === 'goods_shipment_task'

  const goodIds = isApplicable ? indoc.items.map((i) => i.good_id) : []

  const { data: goodsData } = useQuery({
    queryKey: ['goods-by-ids', goodIds],
    queryFn: () => goodsApi.list({ good_ids: goodIds }),
    enabled: goodIds.length > 0,
  })

  const goodsMap = new Map(goodsData?.items.map((g) => [g.good_id, g.good_name]))

  if (!isApplicable) return null

  return (
    <div className="card overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="th">{FIELDS.good_id.label}</th>
            <th className="th">{FIELDS.good_name.short}</th>
            <th className="th text-right">{FIELDS.plan_qnt.short}</th>
            {indoc.indoc_type === 'goods_shipment_task' && (
              <th className="th text-right">{FIELDS.price.label}</th>
            )}
            {indoc.indoc_type === 'goods_supply_task' && (
              <th className="th">{FIELDS.sn_mandant.short}</th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {indoc.items.map((item, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="td font-medium text-primary-600">{item.good_id}</td>
              <td className="td text-gray-700">
                {goodsMap.get(item.good_id) ?? (
                  <span className="text-gray-400 italic">—</span>
                )}
              </td>
              <td className="td text-right">{item.plan_qnt}</td>
              {indoc.indoc_type === 'goods_shipment_task' && (
                <td className="td text-right text-gray-500">
                  {(item as { price?: number }).price != null
                    ? `${(item as { price?: number }).price} ₽`
                    : '—'}
                </td>
              )}
              {indoc.indoc_type === 'goods_supply_task' && (
                <td className="td text-gray-500">
                  {item.sn_mandant ? 'Обязателен' : '—'}
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
  if (indoc.indoc_type !== 'orders_shipment_task') return null

  return (
    <div className="card overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="th">{FIELDS.order_id.label}</th>
            <th className="th">{FIELDS.origin.label}</th>
            <th className="th">Получатель</th>
            <th className="th">Адрес</th>
            <th className="th text-right">{FIELDS.good_name.short}</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {indoc.orders.map((order, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="td font-medium text-primary-600">{order.order_id}</td>
              <td className="td text-gray-500">{order.origin ?? '—'}</td>
              <td className="td text-gray-700">
                <div>{order.client?.name ?? '—'}</div>
                {order.client?.phone && (
                  <div className="text-xs text-gray-400">{order.client.phone}</div>
                )}
              </td>
              <td className="td text-gray-500 max-w-xs">
                {order.address
                  ? [order.address.city, order.address.street, order.address.house].filter(Boolean).join(', ')
                  : '—'}
              </td>
              <td className="td text-right">{order.goods?.length ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {indoc.orders.length === 0 && <EmptyState title="Заказов нет" />}
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
  const indocId = id!

  // Метаданные из состояния роутера (переданы при клике в списке)
  const listItem = location.state?.item as IndocListItem | undefined

  const initialTab: Tab = listItem?.indoc_type ? (typeTab(listItem.indoc_type)?.id ?? 'json') : 'json'
  const [tab, setTab] = useState<Tab>(initialTab)

  const { data: jsonData, isLoading: jsonLoading } = useQuery({
    queryKey: ['indoc-json', indocId],
    queryFn: () => indocsApi.getJson(indocId),
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
  const specificTab = indoc ? typeTab(indoc.indoc_type) : null

  // Если загрузился тип и текущая вкладка — 'json', оставляем; иначе всё ок
  const tabs: Array<{ id: Tab; label: string }> = [
    ...(specificTab ? [specificTab] : []),
    { id: 'json',   label: 'JSON' },
    { id: 'files',  label: 'Файлы' },
    { id: 'photos', label: 'Фото' },
  ]

  // Заголовок: предпочитаем данные из JSON, fallback — из state роутера
  const indocType = indoc?.indoc_type ?? listItem?.indoc_type
  const indocTxt  = indoc?.indoc_txt  ?? listItem?.indoc_txt
  const createdAt = listItem?.created_at

  const subtitle = [
    indocType ? INDOC_TYPE_LABELS[indocType] : undefined,
    createdAt ? new Date(createdAt).toLocaleString('ru-RU') : undefined,
    indocTxt,
  ].filter(Boolean).join(' · ')

  return (
    <>
      <PageHeader
        title={`Документ ${indocId}`}
        subtitle={subtitle || undefined}
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => navigate('/indocs')}>
              ← Назад
            </button>
            <button
              className="btn-danger"
              onClick={() => { if (confirm('Удалить документ?')) deleteMutation.mutate() }}
              disabled={deleteMutation.isPending}
            >
              Удалить
            </button>
          </div>
        }
      />

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
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

      {tab === 'goods'  && indoc && <GoodsTab  indoc={indoc} />}
      {tab === 'orders' && indoc && <OrdersTab indoc={indoc} />}
      {tab === 'boxes'  && indoc && <BoxesTab  indoc={indoc} />}

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

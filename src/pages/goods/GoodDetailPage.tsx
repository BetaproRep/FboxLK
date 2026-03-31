import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { goodsApi } from '@/api/goods'
import type { GoodDetail } from '@/types/good'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'

type Tab = 'info' | 'movements' | 'eans' | 'photos' | 'sn'

export default function GoodDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const goodId = id!
  const [tab, setTab] = useState<Tab>('info')

  const { data: goodResp, isLoading } = useQuery({
    queryKey: ['good', goodId],
    queryFn: () => goodsApi.get(goodId),
  })

  const { data: movementsData } = useQuery({
    queryKey: ['good-movements', goodId],
    queryFn: () => goodsApi.getMovements({ good_id: goodId }),
    enabled: tab === 'movements',
  })

  const { data: snData } = useQuery({
    queryKey: ['good-sn', goodId],
    queryFn: () => goodsApi.getSerialNumbers([goodId]),
    enabled: tab === 'sn',
  })

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner className="w-8 h-8 text-primary-600" /></div>
  }

  const good = goodResp?.good as GoodDetail | undefined
  if (!good) return null

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Атрибуты' },
    { key: 'movements', label: 'Движение' },
    { key: 'eans', label: 'EAN' },
    { key: 'photos', label: 'Фото' },
    { key: 'sn', label: 'Серийные номера' },
  ]

  return (
    <>
      <PageHeader
        title={good.good_name}
        subtitle={`ID: ${good.good_id} · Тип: ${good.good_type}`}
        actions={
          <button className="btn-secondary" onClick={() => navigate('/goods')}>
            ← Назад
          </button>
        }
      />

      <div className="card p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
          {([
            ['Группа', good.gtr_name],
            ['Вес (г)', good.weight],
            ['Длина (мм)', good.length],
            ['Ширина (мм)', good.width],
            ['Высота (мм)', good.height],
          ] as [string, unknown][]).map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              <p className="mt-1 font-medium">{value != null ? String(value) : '—'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-200 overflow-x-auto">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
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

      {tab === 'info' && (
        <div className="card overflow-hidden">
          {good.attributes && good.attributes.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="th">Атрибут</th>
                  <th className="th">Тип</th>
                  <th className="th">Значение</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {good.attributes.map((a) => (
                  <tr key={a.attribute_id}>
                    <td className="td text-gray-500">{a.attribute_name}</td>
                    <td className="td text-xs text-gray-400">{a.attribute_type}</td>
                    <td className="td font-medium">
                      {a.value === null ? '—' : String(a.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="Атрибуты не заданы" />
          )}
        </div>
      )}

      {tab === 'movements' && (
        <div className="card overflow-hidden">
          {movementsData?.items && movementsData.items.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="th">Дата</th>
                  <th className="th">Создан</th>
                  <th className="th">Тип документа</th>
                  <th className="th">Тип качества</th>
                  <th className="th text-right">Кол-во</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movementsData.items.map((m, i) => (
                  <tr key={i}>
                    <td className="td text-gray-500">{new Date(m.outdoc_date).toLocaleDateString()}</td>
                    <td className="td text-gray-500">{new Date(m.created_at).toLocaleString()}</td>
                    <td className="td text-sm">{m.outdoc_type_descrip}</td>
                    <td className="td text-sm text-gray-500">{m.qual_type}</td>
                    <td className="td text-right font-medium">{m.qnt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="Нет данных о движении" />
          )}
        </div>
      )}

      {tab === 'eans' && (
        <div className="card p-6">
          {good.eans && good.eans.length > 0 ? (
            <div className="space-y-2">
              {good.eans.map((ean, i) => (
                <div key={i} className="font-mono text-sm bg-gray-50 rounded px-3 py-2">{ean}</div>
              ))}
            </div>
          ) : (
            <EmptyState title="EAN не привязаны" />
          )}
        </div>
      )}

      {tab === 'photos' && (
        <div className="card p-6">
          {good.photos && good.photos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {good.photos.map((p, i) => (
                <a key={i} href={p.url} target="_blank" rel="noreferrer">
                  <img
                    src={p.url}
                    alt="фото"
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

      {tab === 'sn' && (
        <div className="card overflow-hidden">
          {(() => {
            const items = (snData as { items?: string[] } | undefined)?.items
            return items && items.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr><th className="th">Серийный номер</th></tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((sn, i) => (
                    <tr key={i}>
                      <td className="td font-mono text-sm">{sn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title="Серийных номеров нет" />
            )
          })()}
        </div>
      )}
    </>
  )
}

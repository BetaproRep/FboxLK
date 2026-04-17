import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { goodsApi } from '@/api/goods'
import type { GoodDetail, GoodStock } from '@/types/good'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import { dict, dictEnum, enumOptions, type UiKey } from '@/constants/dict'
import Hint from '@/components/ui/Hint'
import SortIcon from '@/components/ui/SortIcon'

type Tab = 'info' | 'movements' | 'eans' | 'photos' | 'sn'

export default function GoodDetailPage() {
  const { id } = useParams<{ id: string }>()
  const goodId = decodeURIComponent(id!)
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('info')

  const { data: goodResp, isLoading } = useQuery({
    queryKey: ['good', goodId],
    queryFn: () => goodsApi.get(goodId),
  })

  const [mvGoodState, setMvGoodState] = useState('stock')
  const [mvFromDate, setMvFromDate] = useState('')
  const [mvToDate, setMvToDate] = useState('')
  const [mvSearch, setMvSearch] = useState('')
  const [mvSortKey, setMvSortKey] = useState<'outdoc_date' | 'qual_type' | 'qnt' | 'outdoc_id' | 'outdoc_type_descrip' | 'outdoc_txt'>('outdoc_date')
  const [mvSortDir, setMvSortDir] = useState<'asc' | 'desc'>('desc')

  function handleMvSort(key: typeof mvSortKey) {
    if (key === mvSortKey) setMvSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setMvSortKey(key); setMvSortDir('asc') }
  }

  function exportMvToExcel() {
    const rows = mvItems.map(m => ({
      [dict('outdoc_date', 'short')]:         new Date(m.outdoc_date).toLocaleDateString(),
      [dict('qual_type', 'short')]:           dictEnum('qual_type', m.qual_type),
      [dict('qnt', 'short')]:                 m.qnt,
      [dict('outdoc_id', 'short')]:           m.outdoc_id,
      [dict('outdoc_type_descrip', 'short')]: m.outdoc_type_descrip,
      [dict('outdoc_txt', 'short')]:          m.outdoc_txt ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Движение')
    XLSX.writeFile(wb, `movements_${goodId}_${mvGoodState}.xlsx`)
  }

  const { data: movementsData } = useQuery({
    queryKey: ['good-movements', goodId, mvGoodState, mvFromDate, mvToDate],
    queryFn: () => goodsApi.getMovements({
      good_id: goodId,
      good_state: mvGoodState || undefined,
      from_date: mvFromDate || undefined,
      to_date: mvToDate || undefined,
    }),
    enabled: tab === 'movements',
  })

  const { data: snData } = useQuery({
    queryKey: ['good-sn', goodId],
    queryFn: () => goodsApi.getSerialNumbers([goodId]),
    enabled: tab === 'sn',
  })

  const { data: stockData } = useQuery({
    queryKey: ['good-stock', goodId],
    queryFn: () => goodsApi.getStock([goodId]),
  })

  const mvItems = useMemo(() => {
    const q = mvSearch.trim().toLowerCase()
    const items = movementsData?.items ?? []
    const filtered = q
      ? items.filter(m =>
          [String(m.outdoc_id), m.outdoc_type_descrip, m.outdoc_txt ?? '', dictEnum('qual_type', m.qual_type)]
            .some(v => v.toLowerCase().includes(q))
        )
      : items
    return [...filtered].sort((a, b) => {
      const av = String(a[mvSortKey] ?? '')
      const bv = String(b[mvSortKey] ?? '')
      const cmp = av.localeCompare(bv, undefined, { numeric: true })
      return mvSortDir === 'asc' ? cmp : -cmp
    })
  }, [movementsData, mvSearch, mvSortKey, mvSortDir])

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner className="w-8 h-8 text-primary-600" /></div>
  }

  const good = goodResp?.good as GoodDetail | undefined
  if (!good) return null

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: `Атрибуты (${good.attributes?.length ?? 0})` },
    { key: 'movements', label: 'Движение' },
    { key: 'eans', label: `EAN (${good.eans?.length ?? 0})` },
    { key: 'photos', label: `Фото (${good.photos?.length ?? 0})` },
    { key: 'sn', label: 'Серийные номера' },
  ]

  const dims = [good.length, good.width, good.height].every(v => v != null)
    ? `${good.length} × ${good.width} × ${good.height} мм`
    : null

  const subtitleParts: { label: string; value: string }[] = [
    { label: 'Артикул', value: good.good_id },
    { label: 'Тип', value: dictEnum('good_type', good.good_type) },
    ...(dims ? [{ label: 'Габариты', value: dims }] : []),
    ...(good.weight != null ? [{ label: 'Вес', value: `${good.weight} гр.` }] : []),
    ...(good.gtr_name ? [{ label: 'Типоразмер', value: good.gtr_name }] : []),
  ]

  const stockItems = stockData?.items ?? []

  const STOCK_COLS: UiKey[] = [
    'stock', 'orders_inwork', 'orders_wait', 'shipment_picking', 'shipment_ready', 'quarantine', 'long_storage',
  ]

  const allFieldsZero = (row: GoodStock) =>
    row.stock === 0 &&
    row.orders_inwork === 0 &&
    row.orders_wait === 0 &&
    row.shipment_picking === 0 &&
    row.shipment_ready === 0 &&
    row.quarantine === 0 &&
    row.long_storage === 0

  const visibleRows = stockItems.filter(r => !allFieldsZero(r))

  const visibleCols = STOCK_COLS.filter(col =>
    visibleRows.some(r => (r[col as keyof GoodStock] as number) !== 0)
  )

  const freeStock = (row: GoodStock) =>
    row.stock - row.orders_inwork - row.orders_wait - row.shipment_picking - row.shipment_ready

  const isEmpty = visibleRows.length === 0

  return (
    <>
      <PageHeader
        title="Карточка товара"
        subtitle={
          <div>
            <p className="text-base font-semibold text-gray-800 mt-0.5">{good.good_name}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {subtitleParts.map((p, i) => (
                <span key={p.label}>
                  {i > 0 && <span className="mx-2 text-gray-300">·</span>}
                  {p.label}: <span className="font-semibold text-gray-700">{p.value}</span>
                </span>
              ))}
            </p>
          </div>
        }
      />

      {/* Остатки и резервы */}
      <div className="card overflow-hidden mb-6">
        {isEmpty ? (
          <p className="px-4 py-2 text-sm font-semibold text-gray-700">Остатки и резервы: <span className="font-normal text-gray-400">По товару нет остатков и резервов</span></p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-auto divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="th text-left font-semibold text-gray-700">Остатки и резервы</th>
                  <th className="th text-right font-bold text-primary-700">Свободный</th>
                  {visibleCols.map(col => (
                    <th key={col} className="th text-right text-gray-500">
                      <Hint text={dict(col, 'hint', 'goodsStock')}>{dict(col, 'short', 'goodsStock')}</Hint>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visibleRows.map(row => {
                  const free = freeStock(row)
                  return (
                    <tr key={row.qual_type}>
                      <td className="td font-medium">{dictEnum('qual_type', row.qual_type)}</td>
                      <td className={`td text-right font-bold ${free > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {free}
                      </td>
                      {visibleCols.map(col => {
                        const val = row[col as keyof GoodStock] as number
                        return (
                          <td key={col} className="td text-right text-gray-600">
                            {val === 0 ? <span className="text-gray-300">—</span> : val}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
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
                  <th className="th"><Hint text={dict('attribute_name', 'hint')}>{dict('attribute_name', 'short')}</Hint></th>
                  <th className="th"><Hint text={dict('attribute_type', 'hint')}>{dict('attribute_type', 'short')}</Hint></th>
                  <th className="th"><Hint text={dict('value', 'hint')}>{dict('value', 'short')}</Hint></th>
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
        <>
        <div className="card p-4 mb-3 flex items-center gap-6">
          <div className="flex items-center gap-4">
            {enumOptions('good_state').map(o => (
              <label key={o.value} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                <input
                  type="radio"
                  name="mv_good_state"
                  value={o.value}
                  checked={mvGoodState === o.value}
                  onChange={() => setMvGoodState(o.value)}
                  className="accent-primary-600"
                />
                {o.label}
              </label>
            ))}
          </div>
          <div className="w-px h-5 bg-gray-200" />
          <DateRangeFilter
            dateFrom={mvFromDate}
            dateTo={mvToDate}
            onDateFromChange={setMvFromDate}
            onDateToChange={setMvToDate}
          />
          {(mvFromDate || mvToDate) && (
            <button className="btn-secondary text-sm" onClick={() => { setMvFromDate(''); setMvToDate('') }}>
              Сбросить
            </button>
          )}
          <div className="w-px h-5 bg-gray-200" />
          <input
            type="text"
            className="input w-48 text-sm"
            placeholder="Поиск..."
            value={mvSearch}
            onChange={e => setMvSearch(e.target.value)}
          />
          <button className="btn-secondary text-sm ml-auto" onClick={exportMvToExcel} disabled={mvItems.length === 0}>
            Экспорт Excel
          </button>
        </div>
        <div className="card overflow-hidden">
          {mvItems.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {([
                    ['outdoc_date',        'outdoc_date'],
                    ['qual_type',          'qual_type'],
                    ['qnt',                'qnt'],
                    ['outdoc_id',          'outdoc_id'],
                    ['outdoc_type_descrip','outdoc_type_descrip'],
                    ['outdoc_txt',         'outdoc_txt'],
                  ] as [typeof mvSortKey, UiKey][]).map(([sortK, dictK]) => (
                    <th key={sortK} className="th cursor-pointer select-none hover:bg-gray-100" onClick={() => handleMvSort(sortK)}>
                      <Hint text={dict(dictK, 'hint')}><span>{dict(dictK, 'short')}</span></Hint>
                      <SortIcon active={mvSortKey === sortK} dir={mvSortDir} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mvItems.map((m, i) => (
                  <tr key={i} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate(`/outdocs/${m.outdoc_id}`)}>
                    <td className="td text-gray-500">{new Date(m.outdoc_date).toLocaleDateString()}</td>
                    <td className="td text-sm text-gray-500">{dictEnum('qual_type', m.qual_type)}</td>
                    <td className="td font-medium">{m.qnt}</td>
                    <td className="td font-medium text-primary-600">{m.outdoc_id}</td>
                    <td className="td text-sm text-gray-500">{m.outdoc_type_descrip}</td>
                    <td className="td text-sm text-gray-500 max-w-xs truncate">{m.outdoc_txt ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="Нет данных о движении" />
          )}
        </div>
        </>
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

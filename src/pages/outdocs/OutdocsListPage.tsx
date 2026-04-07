import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { outdocsApi } from '@/api/outdocs'
import type { OutdocListItem } from '@/types/outdoc'
import PageHeader from '@/components/ui/PageHeader'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import { FIELDS } from '@/constants/fields'

type SortKey = 'outdoc_id' | 'outdoc_type_descrip' | 'outdoc_date' | 'created_at' | 'outdoc_txt'
type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`ml-1 inline-block text-xs ${active ? 'text-primary-600' : 'text-gray-300'}`}>
      {active && dir === 'desc' ? '▼' : '▲'}
    </span>
  )
}

function defaultDateFrom() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}

const OUTDOC_TYPES: [string, string][] = [
  // Товары
  ['goods_supply', 'Товары оприходованы'],
  ['goods_supply_start', 'Начата приемка товаров (опц.)'],
  ['goods_shipment', 'Товары отгружены'],
  ['goods_shipment_start', 'Начат подбор товаров (опц.)'],
  ['goods_shipment_ready', 'Товар подобран для отгрузки (опц.)'],
  ['goods_correction', 'Инвентаризация-коррекция'],
  ['goods_to_long_storage', 'Товары перемещены на длительное хранение'],
  ['goods_from_long_storage', 'Возврат товаров с длительного хранения'],
  // Заказы
  ['orders_receiving', 'Получены заказы (опц.)'],
  ['orders_deficit', 'Заказы не обеспечены товарами (опц.)'],
  ['orders_production_start', 'Заказы переданы в производство (опц.)'],
  ['orders_pallet', 'Заказы спаллетированы (опц.)'],
  ['orders_shipment', 'Заказы отгружены в службу доставки'],
  ['orders_shipment_refusal', 'Отказ СД в приеме заказов'],
  ['orders_cancel', 'Заказы аннулированы'],
  ['orders_full_return', 'Полный возврат заказов'],
  ['orders_part_return', 'Частичный возврат заказов'],
  ['orders_client_return', 'Клиентский возврат заказов'],
  ['orders_payment', 'Оплата заказов'],
  ['orders_payment_transfer', 'Перечисление наложенного платежа'],
  // Консолидация
  ['exorders_supply', 'Приняты отправления для консолидации'],
]

export default function OutdocsListPage() {
  const navigate = useNavigate()
  const [dateFrom, setDateFrom] = useState(defaultDateFrom())
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))
  const [pageToken, setPageToken] = useState<string | undefined>()
  const [allItems, setAllItems] = useState<OutdocListItem[]>([])
  const [outdocType, setOutdocType] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? allItems.filter((item) =>
          [item.outdoc_id, item.outdoc_type_descrip, item.outdoc_date, item.created_at, item.outdoc_txt]
            .some((v) => v != null && String(v).toLowerCase().includes(q))
        )
      : allItems
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [allItems, search, sortKey, sortDir])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['outdocs', dateFrom, dateTo, outdocType, pageToken],
    queryFn: () =>
      outdocsApi.list({
        from_date: dateFrom,
        to_date: dateTo,
        outdoc_type: outdocType || undefined,
        page_size: 50,
        page_token: pageToken,
      }),
  })

  useEffect(() => {
    if (!data) return
    const items = data.items ?? []
    setAllItems((prev) => (pageToken ? [...prev, ...items] : items))
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleFilterChange() {
    setPageToken(undefined)
    setAllItems([])
  }

  return (
    <>
      <PageHeader title="Исходящие документы" />

      <div className="card p-4 mb-6 flex flex-wrap items-center gap-4">
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={(v) => { setDateFrom(v); handleFilterChange() }}
          onDateToChange={(v) => { setDateTo(v); handleFilterChange() }}
        />
        <select
          className="input w-64"
          value={outdocType}
          onChange={(e) => { setOutdocType(e.target.value); handleFilterChange() }}
        >
          <option value="">Все типы</option>
          {OUTDOC_TYPES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <input
          className="input w-56"
          placeholder="Поиск по списку..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        {isLoading && !allItems.length ? (
          <div className="flex justify-center py-16">
            <Spinner className="w-8 h-8 text-primary-600" />
          </div>
        ) : allItems.length === 0 ? (
          <EmptyState title="Документы не найдены" description="Измените период фильтрации" />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {(
                  [
                    ['outdoc_id', FIELDS.outdoc_id.short],
                    ['outdoc_type_descrip', FIELDS.outdoc_type_descrip.short],
                    ['outdoc_date', FIELDS.outdoc_date.short],
                    ['created_at', FIELDS.created_at.short],
                    ['outdoc_txt', FIELDS.outdoc_txt.short],
                  ] as [SortKey, string][]
                ).map(([key, label]) => (
                  <th
                    key={key}
                    className="th cursor-pointer select-none hover:bg-gray-100"
                    onClick={() => handleSort(key)}
                  >
                    {label}
                    <SortIcon active={sortKey === key} dir={sortDir} />
                  </th>
                ))}
                <th className="th">{FIELDS.locked.short}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedItems.map((item) => (
                <tr
                  key={item.outdoc_id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/outdocs/${item.outdoc_id}`)}
                >
                  <td className="td font-medium text-primary-600">{item.outdoc_id}</td>
                  <td className="td text-gray-500">{item.outdoc_type_descrip}</td>
                  <td className="td text-gray-500">{new Date(item.outdoc_date).toLocaleDateString()}</td>
                  <td className="td text-gray-500">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="td text-gray-500 max-w-xs truncate">{item.outdoc_txt ?? '—'}</td>
                  <td className="td">
                    {item.locked
                      ? <span className="badge bg-orange-100 text-orange-700">Заблокирован</span>
                      : <span className="badge bg-gray-100 text-gray-500">Нет</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data?.page_next_token && (
          <div className="p-4 border-t border-gray-200 text-center">
            <button
              className="btn-secondary"
              disabled={isFetching}
              onClick={() => setPageToken(data.page_next_token)}
            >
              {isFetching ? <Spinner className="w-4 h-4" /> : 'Загрузить ещё'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

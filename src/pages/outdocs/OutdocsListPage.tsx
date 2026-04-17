import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { outdocsApi } from '@/api/outdocs'
import type { OutdocListItem } from '@/types/outdoc'
import PageHeader from '@/components/ui/PageHeader'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import { dict } from '@/constants/dict'
import Hint from '@/components/ui/Hint'
import SortIcon from '@/components/ui/SortIcon'

type SortKey = 'outdoc_id' | 'outdoc_type_descrip' | 'outdoc_date' | 'created_at' | 'outdoc_txt'
type SortDir = 'asc' | 'desc'

function IndocRow({ indoc, colSpan, navigate }: { indoc: OutdocListItem['indoc']; colSpan: number; navigate: (path: string) => void }) {
  if (!indoc) return null
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 pt-0 pb-1 bg-white group-hover:bg-gray-50 transition-colors">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>{new Date(indoc.created_at).toLocaleString()}</span>
            <a
              href={`/indocs/${indoc.indoc_id}`}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); navigate(`/indocs/${indoc.indoc_id}`) }}
              className="text-primary-600 font-medium hover:underline"
            >
              {indoc.indoc_id}
            </a>
            <span>{indoc.indoc_type_descrip}</span>
            {indoc.indoc_txt && <span>{indoc.indoc_txt}</span>}
          </span>
        </div>
      </td>
    </tr>
  )
}

function defaultDateFrom() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}

const OUTDOC_TYPES: [string, string][] = [
  ['goods_supply_start', 'Начата приемка товаров по заданию на оприходование'],
  ['goods_supply', 'Товары оприходованы'],
  ['goods_shipment_start', 'Начат подбор товаров по заданию на отгрузку'],
  ['goods_shipment_ready', 'Подобран товар для отгрузки'],
  ['goods_shipment', 'Товары отгружены'],
  ['goods_correction', 'Инвентаризация-коррекция'],
  ['goods_to_long_storage', 'Товары пееремещены на склад длительного хранения'],
  ['goods_from_long_storage', 'Возврат товаров со склада длительного хранения'],
  ['orders_receiving', 'Получены заказы'],
  ['orders_production_start', 'Заказы переданы в производство'],
  ['orders_pallet', 'Заказы спаллетированы'],
  ['orders_shipment', 'Заказы отгружены в службу доставки'],
  ['orders_deficit', 'Заказы не обеспечены товарами'],
  ['orders_cancel', 'Заказы аннулированы'],
  ['orders_full_return', 'Полный возврат заказов'],
  ['orders_part_return', 'Частичный возврат заказов'],
  ['orders_client_return', 'Клиентский возврат заказов'],
  ['orders_payment', 'Оплата заказов'],
  ['orders_payment_transfer', 'Перечисление наложенного платежа'],
  ['orders_shipment_refusal', 'Отказ службы доставки в приеме заказов'],
  ['exorders_supply', 'Приняты отправления для консолидации'],
]

export default function OutdocsListPage() {
  const navigate = useNavigate()
  const [dateFrom, setDateFrom] = useState(() => sessionStorage.getItem('outdocs_date_from') ?? defaultDateFrom())
  const [dateTo, setDateTo] = useState(() => sessionStorage.getItem('outdocs_date_to') ?? new Date().toISOString().slice(0, 10))
  const [pageToken, setPageToken] = useState<string | undefined>()
  const [allItems, setAllItems] = useState<OutdocListItem[]>([])
  const [outdocType, setOutdocType] = useState(() => sessionStorage.getItem('outdocs_outdoc_type') ?? '')
  const [search, setSearch] = useState(() => sessionStorage.getItem('outdocs_search') ?? '')
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
          [item.outdoc_id, item.outdoc_type_descrip, item.outdoc_date, item.created_at, item.outdoc_txt, item.indoc?.indoc_id, item.indoc?.indoc_txt]
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

  const lockMutation = useMutation({
    mutationFn: (params: { outdoc_id: number; lock: boolean }) =>
      outdocsApi.lock({ outdocs: [params] }),
    onSuccess: (_data, variables) => {
      setAllItems((prev) =>
        prev.map((item) =>
          item.outdoc_id === variables.outdoc_id && item.locked !== variables.lock
            ? { ...item, locked: variables.lock }
            : item,
        ),
      )
    },
  })

  function exportToExcel() {
    const rows = sortedItems.map((item) => ({
      [dict('created_at', 'short')]: new Date(item.created_at).toLocaleString(),
      [dict('outdoc_id', 'short')]: item.outdoc_id,
      [dict('outdoc_type_descrip', 'short')]: item.outdoc_type_descrip,
      [dict('outdoc_date', 'short')]: new Date(item.outdoc_date).toLocaleDateString(),
      [dict('outdoc_txt', 'short')]: item.outdoc_txt ?? '',
      [dict('locked', 'short')]: item.locked ? 'Да' : 'Нет',
      'Входящий документ': item.indoc?.indoc_id ?? '',
      'Примечание входящего': item.indoc?.indoc_txt ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Исходящие документы')
    XLSX.writeFile(wb, `outdocs_${dateFrom}_${dateTo}.xlsx`)
  }

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
          onDateFromChange={(v) => { setDateFrom(v); sessionStorage.setItem('outdocs_date_from', v); handleFilterChange() }}
          onDateToChange={(v) => { setDateTo(v); sessionStorage.setItem('outdocs_date_to', v); handleFilterChange() }}
        />
        <select
          className="input w-64"
          value={outdocType}
          onChange={(e) => { setOutdocType(e.target.value); sessionStorage.setItem('outdocs_outdoc_type', e.target.value); handleFilterChange() }}
        >
          <option value="">Все типы документов</option>
          {OUTDOC_TYPES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <input
          className="input w-56"
          placeholder="Поиск по списку..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); sessionStorage.setItem('outdocs_search', e.target.value) }}
        />
        <button
          className="btn-secondary"
          onClick={exportToExcel}
          disabled={sortedItems.length === 0}
        >
          Экспорт в Excel
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading && !allItems.length ? (
          <div className="flex justify-center py-16">
            <Spinner className="w-8 h-8 text-primary-600" />
          </div>
        ) : allItems.length === 0 ? (
          <EmptyState title="Документы не найдены" description="Измените период фильтрации" />
        ) : (
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                {(
                  [
                    'created_at', 'outdoc_id', 'outdoc_type_descrip', 'outdoc_date', 'outdoc_txt',
                  ] as SortKey[]
                ).map((key) => (
                  <th
                    key={key}
                    className="th cursor-pointer select-none hover:bg-gray-100"
                    onClick={() => handleSort(key)}
                  >
                    <Hint text={dict(key, 'hint')}>
                      <span>{dict(key, 'short')}</span>
                    </Hint>
                    <SortIcon active={sortKey === key} dir={sortDir} />
                  </th>
                ))}
                <th className="th"><Hint text={dict('locked', 'hint')}>{dict('locked', 'short')}</Hint></th>
              </tr>
            </thead>
            {sortedItems.map((item) => (
              <tbody
                key={item.outdoc_id}
                className="border-t border-gray-200 group cursor-pointer"
                onClick={() => navigate(`/outdocs/${item.outdoc_id}`)}
              >
                <tr className="group-hover:bg-gray-50 transition-colors">
                  <td className="td text-gray-500">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="td font-medium text-primary-600">{item.outdoc_id}</td>
                  <td className="td text-gray-500">{item.outdoc_type_descrip}</td>
                  <td className="td text-gray-500">{new Date(item.outdoc_date).toLocaleDateString()}</td>
                  <td className="td text-gray-500 max-w-xs truncate">{item.outdoc_txt ?? '—'}</td>
                  <td className="td text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={item.locked}
                      onChange={(e) => lockMutation.mutate({ outdoc_id: item.outdoc_id, lock: e.target.checked })}
                      className="w-4 h-4 cursor-pointer accent-primary-600"
                    />
                  </td>
                </tr>
                <IndocRow indoc={item.indoc} colSpan={6} navigate={navigate} />
              </tbody>
            ))}
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

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { indocsApi } from '@/api/indocs'
import type { IndocListItem } from '@/types/indoc'
import PageHeader from '@/components/ui/PageHeader'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import CreateIndocModal from './CreateIndocModal'

type SortKey = 'indoc_id' | 'indoc_type_descrip' | 'created_at' | 'indoc_txt'
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

export default function IndocsListPage() {
  const navigate = useNavigate()
  const [dateFrom, setDateFrom] = useState(defaultDateFrom())
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))
  const [pageToken, setPageToken] = useState<string | undefined>()
  const [allItems, setAllItems] = useState<IndocListItem[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [indocType, setIndocType] = useState('')
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
          [item.indoc_id, item.indoc_type_descrip, item.created_at, item.indoc_txt]
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
    queryKey: ['indocs', dateFrom, dateTo, indocType, pageToken],
    queryFn: () =>
      indocsApi.list({
        from_date: dateFrom,
        to_date: dateTo,
        indoc_type: indocType || undefined,
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

  function exportToExcel() {
    const rows = sortedItems.map((item) => ({
      'Номер': item.indoc_id,
      'Тип': item.indoc_type_descrip,
      'Дата создания': new Date(item.created_at).toLocaleString(),
      'Примечание': item.indoc_txt ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Входящие документы')
    XLSX.writeFile(wb, `indocs_${dateFrom}_${dateTo}.xlsx`)
  }

  return (
    <>
      <PageHeader
        title="Входящие документы"
        actions={
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            + Создать документ
          </button>
        }
      />

      <div className="card p-4 mb-6 flex flex-wrap items-center gap-4">
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={(v) => { setDateFrom(v); handleFilterChange() }}
          onDateToChange={(v) => { setDateTo(v); handleFilterChange() }}
        />
        <select
          className="input w-64"
          value={indocType}
          onChange={(e) => { setIndocType(e.target.value); handleFilterChange() }}
        >
          <option value="">Все типы</option>
          <option value="goods_supply_task">Оприходование товаров</option>
          <option value="goods_shipment_task">Отгрузка товаров</option>
          <option value="orders_shipment_task">Отгрузка заказов</option>
          <option value="goods_from_long_storage_task">Возврат с длительного хранения</option>
        </select>
        <input
          className="input w-56"
          placeholder="Поиск по списку..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-secondary" onClick={exportToExcel} disabled={sortedItems.length === 0}>
          Экспорт в Excel
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading && !allItems.length ? (
          <div className="flex justify-center py-16">
            <Spinner className="w-8 h-8 text-primary-600" />
          </div>
        ) : allItems.length === 0 ? (
          <EmptyState title="Документы не найдены" description="Измените период или создайте новый документ" />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {(
                  [
                    ['indoc_id', 'Номер'],
                    ['indoc_type_descrip', 'Тип'],
                    ['created_at', 'Дата создания'],
                    ['indoc_txt', 'Примечание'],
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedItems.map((item) => (
                <tr
                  key={item.indoc_id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/indocs/${item.indoc_id}`, { state: { item } })}
                >
                  <td className="td font-medium text-primary-600">{item.indoc_id}</td>
                  <td className="td text-gray-500">{item.indoc_type_descrip}</td>
                  <td className="td text-gray-500">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="td text-gray-500 max-w-xs truncate">{item.indoc_txt ?? '—'}</td>
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

      <CreateIndocModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </>
  )
}

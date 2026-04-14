import { useState, useEffect, useMemo, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ordersApi } from '@/api/orders'
import type { OrderListItem } from '@/types/order'
import PageHeader from '@/components/ui/PageHeader'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import { dict } from '@/constants/dict'
import Hint from '@/components/ui/Hint'
import SortIcon from '@/components/ui/SortIcon'

const STATE_LABELS: Record<string, string> = {
  wait: 'Ожидание',
  canceled: 'Отменён',
  inwork: 'В работе',
  shipped: 'Отгружен',
}

const STATE_COLORS: Record<string, string> = {
  wait: 'bg-yellow-100 text-yellow-700',
  canceled: 'bg-gray-100 text-gray-500',
  inwork: 'bg-blue-100 text-blue-700',
  shipped: 'bg-green-100 text-green-700',
}

type SortKey = 'order_id' | 'created_at' | 'state' | 'clnt_name' | 'delivery_name'
type SortDir = 'asc' | 'desc'

type ClipboardRow = { rowNum: number; order_id: string; note: string }
type MergedRow = ClipboardRow & { item: OrderListItem | null }

function defaultDateFrom() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}

function parseClipboard(text: string): ClipboardRow[] {
  const rows: ClipboardRow[] = []
  const lines = text.split(/\r?\n/)
  let rowNum = 0
  for (const line of lines) {
    const cols = line.split('\t')
    const id = cols[0]?.trim().slice(0, 255)
    if (!id) continue
    rowNum++
    rows.push({ rowNum, order_id: id, note: cols[1]?.trim() ?? '' })
  }
  return rows
}

function OutdocsRow({ outdocs, colSpan, navigate }: {
  outdocs: OrderListItem['outdocs']
  colSpan: number
  navigate: (path: string) => void
}) {
  if (!outdocs?.length) return null
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 pt-0 pb-1 bg-white group-hover:bg-gray-50 transition-colors">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          {outdocs.map((od) => (
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
  )
}

export default function OrdersListPage() {
  const navigate = useNavigate()

  const [dateFrom, setDateFrom] = useState(() => sessionStorage.getItem('orders_date_from') ?? defaultDateFrom())
  const [dateTo, setDateTo] = useState(() => sessionStorage.getItem('orders_date_to') ?? new Date().toISOString().slice(0, 10))
  const [pageToken, setPageToken] = useState<string | undefined>()
  const [allItems, setAllItems] = useState<OrderListItem[]>([])
  const [search, setSearch] = useState(() => sessionStorage.getItem('orders_search') ?? '')
  const [notCompletedOnly, setNotCompletedOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const [clipboardRows, setClipboardRows] = useState<ClipboardRow[] | null>(() => {
    try {
      const saved = sessionStorage.getItem('orders_clipboard_rows')
      return saved ? (JSON.parse(saved) as ClipboardRow[]) : null
    } catch {
      return null
    }
  })
  const [clipboardError, setClipboardError] = useState<string | null>(null)
  const clipboardErrorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!clipboardError) return
    function handleClickOutside(e: MouseEvent) {
      if (clipboardErrorRef.current && !clipboardErrorRef.current.contains(e.target as Node)) {
        setClipboardError(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [clipboardError])

  function updateClipboardRows(rows: ClipboardRow[] | null) {
    setClipboardRows(rows)
    if (rows) {
      sessionStorage.setItem('orders_clipboard_rows', JSON.stringify(rows))
    } else {
      sessionStorage.removeItem('orders_clipboard_rows')
    }
  }

  async function loadFromClipboard() {
    const text = await navigator.clipboard.readText()
    const rows = parseClipboard(text)
    if (rows.length === 0) {
      setClipboardError('Скопируйте номер заказа или список номеров из Excel в буфер обмена. Затем нажмите эту кнопку')
      return
    }
    setClipboardError(null)
    setNotCompletedOnly(false)
    updateClipboardRows(rows)
    setAllItems([])
    setPageToken(undefined)
  }

  function clearClipboardMode() {
    updateClipboardRows(null)
    setAllItems([])
    setPageToken(undefined)
  }

  function enterNotCompletedOnly() {
    setNotCompletedOnly(true)
    updateClipboardRows(null)
    setAllItems([])
    setPageToken(undefined)
  }

  function clearNotCompletedOnly() {
    setNotCompletedOnly(false)
    setAllItems([])
    setPageToken(undefined)
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const clipboardIds = clipboardRows?.map((r) => r.order_id)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: clipboardRows
      ? ['orders', 'clipboard', clipboardIds]
      : notCompletedOnly
      ? ['orders', 'not_completed', pageToken]
      : ['orders', dateFrom, dateTo, pageToken],
    queryFn: clipboardRows
      ? () => ordersApi.list({ order_ids: clipboardIds })
      : notCompletedOnly
      ? () => ordersApi.list({ not_completed_only: true, page_size: 50, page_token: pageToken })
      : () => ordersApi.list({ from_date: dateFrom, to_date: dateTo, page_size: 50, page_token: pageToken }),
  })

  useEffect(() => {
    if (!data) return
    const items = data.items ?? []
    if (clipboardRows) {
      setAllItems(items)
    } else {
      setAllItems((prev) => (pageToken ? [...prev, ...items] : items))
    }
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  const mergedRows = useMemo((): MergedRow[] | null => {
    if (!clipboardRows) return null
    const foundMap = new Map(allItems.map((item) => [item.order_id, item]))
    const q = search.trim().toLowerCase()
    const rows = clipboardRows.map((row) => ({
      ...row,
      item: foundMap.get(row.order_id) ?? null,
    }))
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.order_id.toLowerCase().includes(q) ||
        r.note.toLowerCase().includes(q) ||
        (r.item &&
          [r.item.delivery_name, r.item.clnt_name, r.item.state, r.item.indoc_id].some(
            (v) => v != null && String(v).toLowerCase().includes(q),
          )),
    )
  }, [clipboardRows, allItems, search])

  const sortedItems = useMemo(() => {
    if (clipboardRows) return []
    const q = search.trim().toLowerCase()
    const filtered = q
      ? allItems.filter((item) =>
          [item.order_id, item.delivery_name, item.clnt_name, item.state, item.indoc_id].some(
            (v) => v != null && String(v).toLowerCase().includes(q),
          ),
        )
      : allItems
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [clipboardRows, allItems, search, sortKey, sortDir])

  const isEmpty = clipboardRows ? mergedRows?.length === 0 : allItems.length === 0

  function exportToExcel() {
    const rows = clipboardRows && mergedRows
      ? mergedRows.map((r) => ({
          '#': r.rowNum,
          [dict('order_id', 'short')]: r.order_id,
          '2-я колонка буфера': r.note,
          [dict('created_at', 'short')]: r.item ? new Date(r.item.created_at).toLocaleString() : '',
          'Статус': r.item ? (STATE_LABELS[r.item.state] ?? r.item.state) : 'Не найден',
          [dict('clnt_name', 'short')]: r.item?.clnt_name ?? '',
          [dict('delivery_name', 'short')]: r.item?.delivery_name ?? '',
        }))
      : sortedItems.map((item) => ({
          [dict('created_at', 'short')]: new Date(item.created_at).toLocaleString(),
          'Статус': STATE_LABELS[item.state] ?? item.state,
          [dict('order_id', 'short')]: item.order_id,
          [dict('clnt_name', 'short')]: item.clnt_name ?? '',
          [dict('delivery_name', 'short')]: item.delivery_name ?? '',
        }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Заказы')
    const suffix = clipboardRows ? 'list' : `${dateFrom}_${dateTo}`
    XLSX.writeFile(wb, `orders_${suffix}.xlsx`)
  }

  const SORT_COLS: { key: SortKey; dictKey: Parameters<typeof dict>[0] }[] = [
    { key: 'created_at', dictKey: 'created_at' },
    { key: 'state',      dictKey: 'state' },
    { key: 'order_id',   dictKey: 'order_id' },
    { key: 'clnt_name',  dictKey: 'clnt_name' },
    { key: 'delivery_name', dictKey: 'delivery_name' },
  ]

  return (
    <>
      <PageHeader title="Заказы" />

      <div className="card p-4 mb-6 flex flex-wrap items-center gap-4">
        {/* Clipboard: badge или кнопка */}
        {clipboardRows ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-100 text-primary-700 text-sm font-medium">
            Список: {clipboardRows.length} заказов
            <button
              className="ml-1 text-primary-500 hover:text-primary-800 leading-none"
              onClick={clearClipboardMode}
              title="Очистить список"
            >
              ×
            </button>
          </span>
        ) : (
          <div className="relative inline-block" ref={clipboardErrorRef}>
            <button className="btn-secondary" onClick={loadFromClipboard}>
              По списку заказов из буфера
            </button>
            {clipboardError && (
              <div className="absolute left-0 top-full mt-2 z-50 w-72">
                <div className="absolute -top-1.5 left-4 w-3 h-3 bg-gray-800 rotate-45" />
                <div className="relative bg-gray-800 rounded-md px-3 py-2.5 text-sm text-white flex items-start gap-2 shadow-lg">
                  <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold leading-none">✕</span>
                  <span>{clipboardError}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Незавершённые: badge или кнопка */}
        {notCompletedOnly ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">
            Незавершённые заказы
            <button
              className="ml-1 text-orange-500 hover:text-orange-800 leading-none"
              onClick={clearNotCompletedOnly}
              title="Сбросить"
            >
              ×
            </button>
          </span>
        ) : (
          <button className="btn-secondary" onClick={enterNotCompletedOnly}>
            Незавершённые заказы
          </button>
        )}

        {/* Даты: только в обычном режиме */}
        {!clipboardRows && !notCompletedOnly && (
          <DateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={(v) => { setDateFrom(v); sessionStorage.setItem('orders_date_from', v); setPageToken(undefined) }}
            onDateToChange={(v) => { setDateTo(v); sessionStorage.setItem('orders_date_to', v); setPageToken(undefined) }}
          />
        )}

        <input
          className="input w-56"
          placeholder="Поиск по списку..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); sessionStorage.setItem('orders_search', e.target.value) }}
        />

        <button
          className="btn-secondary"
          onClick={exportToExcel}
          disabled={(mergedRows ?? sortedItems).length === 0}
        >
          Экспорт в Excel
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading && !allItems.length ? (
          <div className="flex justify-center py-16">
            <Spinner className="w-8 h-8 text-primary-600" />
          </div>
        ) : isEmpty ? (
          <EmptyState title="Заказы не найдены" description="Измените период или условия фильтрации" />
        ) : clipboardRows && mergedRows ? (
          // Clipboard mode table
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="th w-12">#</th>
                <th className="th"><Hint text={dict('order_id', 'hint')}>{dict('order_id', 'short')}</Hint></th>
                <th className="th">Клиент</th>
                <th className="th">2-я колонка буфера</th>
                <th className="th"><Hint text={dict('created_at', 'hint')}>{dict('created_at', 'short')}</Hint></th>
                <th className="th"><Hint text={dict('state', 'hint')}>{dict('state', 'short')}</Hint></th>
                <th className="th"><Hint text={dict('delivery_name', 'hint')}>{dict('delivery_name', 'short')}</Hint></th>
              </tr>
            </thead>
            {mergedRows.map((row) =>
              row.item ? (
                <tbody
                  key={row.rowNum}
                  className="border-t border-gray-200 group cursor-pointer"
                  onClick={() => navigate(`/orders/${row.item!.order_id}`)}
                >
                  <tr className="group-hover:bg-gray-50 transition-colors">
                    <td className="td text-gray-400 text-xs">{row.rowNum}</td>
                    <td className="td font-medium text-primary-600">{row.item.order_id}</td>
                    <td className="td text-gray-500">{row.item.clnt_name ?? '—'}</td>
                    <td className="td text-gray-500 max-w-xs truncate">{row.note || '—'}</td>
                    <td className="td text-gray-500">{new Date(row.item.created_at).toLocaleString()}</td>
                    <td className="td">
                      <span className={`badge ${STATE_COLORS[row.item.state] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATE_LABELS[row.item.state] ?? row.item.state}
                      </span>
                    </td>
                    <td className="td text-gray-500">{row.item.delivery_name ?? '—'}</td>
                  </tr>
                  <OutdocsRow outdocs={row.item.outdocs} colSpan={7} navigate={navigate} />
                </tbody>
              ) : (
                <tbody key={row.rowNum} className="border-t border-gray-200 bg-red-50">
                  <tr>
                    <td className="td text-gray-400 text-xs">{row.rowNum}</td>
                    <td className="td font-medium text-gray-500">{row.order_id}</td>
                    <td className="td" />
                    <td className="td text-gray-500 max-w-xs truncate">{row.note || '—'}</td>
                    <td className="td text-gray-400">—</td>
                    <td className="td">
                      <span className="badge bg-red-100 text-red-600">Не найден</span>
                    </td>
                    <td className="td" colSpan={1} />
                  </tr>
                </tbody>
              ),
            )}
          </table>
        ) : (
          // Normal / notCompleted mode table
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                {SORT_COLS.map(({ key, dictKey }) => (
                  <th
                    key={key}
                    className="th cursor-pointer select-none hover:bg-gray-100"
                    onClick={() => handleSort(key)}
                  >
                    <Hint text={dict(dictKey, 'hint')}><span>{dict(dictKey, 'short')}</span></Hint>
                    <SortIcon active={sortKey === key} dir={sortDir} />
                  </th>
                ))}
              </tr>
            </thead>
            {sortedItems.map((item) => (
              <tbody
                key={item.order_id}
                className="border-t border-gray-200 group cursor-pointer"
                onClick={() => navigate(`/orders/${item.order_id}`)}
              >
                <tr className="group-hover:bg-gray-50 transition-colors">
                  <td className="td text-gray-500">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="td">
                    <span className={`badge ${STATE_COLORS[item.state] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATE_LABELS[item.state] ?? item.state}
                    </span>
                  </td>
                  <td className="td font-medium text-primary-600">{item.order_id}</td>
                  <td className="td text-gray-500">{item.clnt_name ?? '—'}</td>
                  <td className="td text-gray-500">{item.delivery_name ?? '—'}</td>
                </tr>
                <OutdocsRow outdocs={item.outdocs} colSpan={5} navigate={navigate} />
              </tbody>
            ))}
          </table>
        )}

        {!clipboardRows && data?.page_next_token && (
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

import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { indocsApi } from '@/api/indocs'
import type { WebIndocListItem } from '@/types/indoc'
import PageHeader from '@/components/ui/PageHeader'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import CreateGoodsSupplyTask from './CreateGoodsSupplyTask'
import CreateGoodsShipmentTask from './CreateGoodsShipmentTask'
import CreateOrdersShipmentTask from './CreateOrdersShipmentTask'
import { dict } from '@/constants/dict'
import Hint from '@/components/ui/Hint'

type SortKey = 'indoc_id' | 'indoc_type_descrip' | 'created_at' | 'indoc_txt'
type SortDir = 'asc' | 'desc'

type ClipboardRow = { rowNum: number; indoc_id: string; note: string }
type MergedRow = ClipboardRow & { item: WebIndocListItem | null }

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

function parseClipboard(text: string): ClipboardRow[] {
  const rows: ClipboardRow[] = []
  const lines = text.split(/\r?\n/)
  let rowNum = 0
  for (const line of lines) {
    const cols = line.split('\t')
    const id = cols[0]?.trim().slice(0, 255)
    if (!id) continue
    rowNum++
    rows.push({ rowNum, indoc_id: id, note: cols[1]?.trim() ?? '' })
  }
  return rows
}

function OutdocsRow({ outdocs, colSpan, navigate }: { outdocs: WebIndocListItem['outdocs']; colSpan: number; navigate: (path: string) => void }) {
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

export default function IndocsListPage() {
  const navigate = useNavigate()
  const [dateFrom, setDateFrom] = useState(() => sessionStorage.getItem('indocs_date_from') ?? defaultDateFrom())
  const [dateTo, setDateTo] = useState(() => sessionStorage.getItem('indocs_date_to') ?? new Date().toISOString().slice(0, 10))
  const [pageToken, setPageToken] = useState<string | undefined>()
  const [allItems, setAllItems] = useState<WebIndocListItem[]>([])
  const [showCreateSupply, setShowCreateSupply] = useState(false)
  const [showCreateGoodsShipment, setShowCreateGoodsShipment] = useState(false)
  const [showCreateOrdersShipment, setShowCreateOrdersShipment] = useState(false)
  const [indocType, setIndocType] = useState(() => sessionStorage.getItem('indocs_indoc_type') ?? '')
  const [search, setSearch] = useState(() => sessionStorage.getItem('indocs_search') ?? '')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
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

  const [clipboardRows, setClipboardRows] = useState<ClipboardRow[] | null>(() => {
    try {
      const saved = sessionStorage.getItem('indocs_clipboard_rows')
      return saved ? (JSON.parse(saved) as ClipboardRow[]) : null
    } catch {
      return null
    }
  })

  function updateClipboardRows(rows: ClipboardRow[] | null) {
    setClipboardRows(rows)
    if (rows) {
      sessionStorage.setItem('indocs_clipboard_rows', JSON.stringify(rows))
    } else {
      sessionStorage.removeItem('indocs_clipboard_rows')
    }
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  async function loadFromClipboard() {
    const text = await navigator.clipboard.readText()
    const rows = parseClipboard(text)
    if (rows.length === 0) {
      setClipboardError('Скопируйте номер документа или список номеров из excel в буфер обмена. Затем нажмите эту кнопку')
      return
    }
    setClipboardError(null)
    updateClipboardRows(rows)
    setAllItems([])
    setPageToken(undefined)
  }

  function clearClipboardMode() {
    updateClipboardRows(null)
    setAllItems([])
    setPageToken(undefined)
  }

  const clipboardIds = clipboardRows?.map((r) => r.indoc_id)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: clipboardRows
      ? ['indocs', 'clipboard', clipboardIds]
      : ['indocs', dateFrom, dateTo, indocType, pageToken],
    queryFn: clipboardRows
      ? () => indocsApi.webList({ indoc_ids: clipboardIds })
      : () =>
          indocsApi.webList({
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
    if (clipboardRows) {
      setAllItems(items)
    } else {
      setAllItems((prev) => (pageToken ? [...prev, ...items] : items))
    }
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clipboard mode: merged rows (all clipboard IDs, found or not)
  const mergedRows = useMemo((): MergedRow[] | null => {
    if (!clipboardRows) return null
    const foundMap = new Map(allItems.map((item) => [item.indoc_id, item]))
    const q = search.trim().toLowerCase()
    const rows = clipboardRows.map((row) => ({
      ...row,
      item: foundMap.get(row.indoc_id) ?? null,
    }))
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.indoc_id.toLowerCase().includes(q) ||
        r.note.toLowerCase().includes(q) ||
        (r.item &&
          [r.item.indoc_type_descrip, r.item.created_at, r.item.indoc_txt].some(
            (v) => v != null && String(v).toLowerCase().includes(q),
          )),
    )
  }, [clipboardRows, allItems, search])

  // Normal mode: sorted + filtered items
  const sortedItems = useMemo(() => {
    if (clipboardRows) return []
    const q = search.trim().toLowerCase()
    const filtered = q
      ? allItems.filter((item) =>
          [item.indoc_id, item.indoc_type_descrip, item.created_at, item.indoc_txt].some(
            (v) => v != null && String(v).toLowerCase().includes(q),
          ),
        )
      : allItems
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [clipboardRows, allItems, search, sortKey, sortDir])

  function handleFilterChange() {
    setPageToken(undefined)
    setAllItems([])
  }

  function exportToExcel() {
    if (mergedRows) {
      const rows = mergedRows.map((r) => ({
        '#': r.rowNum,
        [dict('indoc_id', 'short')]: r.indoc_id,
        'Примечание': r.note,
        [dict('indoc_type_descrip', 'short')]: r.item?.indoc_type_descrip ?? 'Документ не найден',
        [dict('created_at', 'short')]: r.item ? new Date(r.item.created_at).toLocaleString() : '',
        [dict('indoc_txt', 'short')]: r.item?.indoc_txt ?? '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Входящие документы')
      XLSX.writeFile(wb, `indocs_list.xlsx`)
    } else {
      const rows = sortedItems.map((item) => ({
        [dict('indoc_id', 'short')]: item.indoc_id,
        [dict('indoc_type_descrip', 'short')]: item.indoc_type_descrip,
        [dict('created_at', 'short')]: new Date(item.created_at).toLocaleString(),
        [dict('indoc_txt', 'short')]: item.indoc_txt ?? '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Входящие документы')
      XLSX.writeFile(wb, `indocs_${dateFrom}_${dateTo}.xlsx`)
    }
  }

  const isEmpty = clipboardRows ? mergedRows?.length === 0 : allItems.length === 0

  return (
    <>
      <PageHeader
        title="Входящие документы"
        actions={
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => setShowCreateSupply(true)}>
              + Задание на оприходование товаров
            </button>
            <button className="btn-primary" onClick={() => setShowCreateGoodsShipment(true)}>
              + Задание на отгрузку товаров
            </button>
            <button className="btn-primary" onClick={() => setShowCreateOrdersShipment(true)}>
              + Задание на отгрузку заказов
            </button>
          </div>
        }
      />

      <div className="card p-4 mb-6 flex flex-wrap items-center gap-4">
        {clipboardRows ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-100 text-primary-700 text-sm font-medium">
            Список: {clipboardRows.length} документов
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
            <Hint text={dict('btn.clipboard_load', 'hint')}>
              <button className="btn-secondary" onClick={loadFromClipboard}>
                По списку документов из буфера
              </button>
            </Hint>
            {clipboardError && (
              <div className="absolute left-0 top-full mt-2 z-50 w-72">
                <div className="absolute -top-1.5 left-4 w-3 h-3 bg-gray-800 rotate-45" />
                <div className="relative bg-gray-800 rounded-md px-3 py-2.5 text-sm text-white flex items-start gap-2 shadow-lg">
                  <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold leading-none">✕</span>
                  <span dangerouslySetInnerHTML={{ __html: clipboardError }} />
                </div>
              </div>
            )}
          </div>
        )}

        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={(v) => { setDateFrom(v); sessionStorage.setItem('indocs_date_from', v); handleFilterChange() }}
          onDateToChange={(v) => { setDateTo(v); sessionStorage.setItem('indocs_date_to', v); handleFilterChange() }}
          disabled={!!clipboardRows}
        />
        <select
          className="input w-64"
          value={indocType}
          onChange={(e) => { setIndocType(e.target.value); sessionStorage.setItem('indocs_indoc_type', e.target.value); handleFilterChange() }}
          disabled={!!clipboardRows}
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
          onChange={(e) => { setSearch(e.target.value); sessionStorage.setItem('indocs_search', e.target.value) }}
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
          <EmptyState title="Документы не найдены" description="Измените период или создайте новый документ" />
        ) : clipboardRows && mergedRows ? (
          // Clipboard mode table
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="th w-12">#</th>
                <th className="th"><Hint text={dict('created_at', 'hint')}>{dict('created_at', 'short')}</Hint></th>
                <th className="th"><Hint text={dict('indoc_id', 'hint')}>{dict('indoc_id', 'short')}</Hint></th>
                <th className="th">2-я колонка буфера</th>
                <th className="th"><Hint text={dict('indoc_type_descrip', 'hint')}>{dict('indoc_type_descrip', 'short')}</Hint></th>
                <th className="th"><Hint text={dict('indoc_txt', 'hint')}>{dict('indoc_txt', 'short')}</Hint></th>
              </tr>
            </thead>
            {mergedRows.map((row) =>
              row.item ? (
                <tbody
                  key={row.rowNum}
                  className="border-t border-gray-200 group cursor-pointer"
                  onClick={() => navigate(`/indocs/${row.item!.indoc_id}`, { state: { item: row.item } })}
                >
                  <tr className="group-hover:bg-gray-50 transition-colors">
                    <td className="td text-gray-400 text-xs">{row.rowNum}</td>
                    <td className="td text-gray-500">{new Date(row.item.created_at).toLocaleString()}</td>
                    <td className="td font-medium text-primary-600">{row.item.indoc_id}</td>
                    <td className="td text-gray-500 max-w-xs truncate">{row.note || '—'}</td>
                    <td className="td text-gray-500">{row.item.indoc_type_descrip}</td>
                    <td className="td text-gray-500 max-w-xs truncate">{row.item.indoc_txt ?? '—'}</td>
                  </tr>
                  <OutdocsRow outdocs={row.item.outdocs} colSpan={6} navigate={navigate} />
                </tbody>
              ) : (
                <tbody key={row.rowNum} className="border-t border-gray-200 bg-red-50">
                  <tr>
                    <td className="td text-gray-400 text-xs">{row.rowNum}</td>
                    <td className="td font-medium text-gray-500">{row.indoc_id}</td>
                    <td className="td text-gray-500 max-w-xs truncate">{row.note || '—'}</td>
                    <td className="td text-red-400 italic" colSpan={3}>
                      Документ не найден
                    </td>
                  </tr>
                </tbody>
              ),
            )}
          </table>
        ) : (
          // Normal mode table
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                {(
                  ['created_at', 'indoc_id', 'indoc_type_descrip', 'indoc_txt'] as SortKey[]
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
              </tr>
            </thead>
            {sortedItems.map((item) => (
              <tbody
                key={item.indoc_id}
                className="border-t border-gray-200 group cursor-pointer"
                onClick={() => navigate(`/indocs/${item.indoc_id}`, { state: { item } })}
              >
                <tr className="group-hover:bg-gray-50 transition-colors">
                  <td className="td text-gray-500">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="td font-medium text-primary-600">{item.indoc_id}</td>
                  <td className="td text-gray-500">{item.indoc_type_descrip}</td>
                  <td className="td text-gray-500 max-w-xs truncate">{item.indoc_txt ?? '—'}</td>
                </tr>
                <OutdocsRow outdocs={item.outdocs} colSpan={4} navigate={navigate} />
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

      <CreateGoodsSupplyTask isOpen={showCreateSupply} onClose={() => setShowCreateSupply(false)} />
      <CreateGoodsShipmentTask isOpen={showCreateGoodsShipment} onClose={() => setShowCreateGoodsShipment(false)} />
      <CreateOrdersShipmentTask isOpen={showCreateOrdersShipment} onClose={() => setShowCreateOrdersShipment(false)} />
    </>
  )
}

import { useState, useEffect, useMemo, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useNavigate } from 'react-router-dom'
import { isTextSelected } from '@/utils/selection'
import { useQuery } from '@tanstack/react-query'
import { goodsApi } from '@/api/goods'
import type { GoodListItem } from '@/types/good'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import { dict } from '@/constants/dict'
import Hint from '@/components/ui/Hint'
import SortIcon from '@/components/ui/SortIcon'
import UploadGoodsModal from './UploadGoodsModal'

type SortKey = 'good_id' | 'good_name' | 'good_type_name' | 'gtr_name' | 'weight'
type SortDir = 'asc' | 'desc'

type ClipboardRow = { rowNum: number; good_id: string; note: string }
type MergedRow = ClipboardRow & { item: GoodListItem | null }

function formatDims(item: Pick<GoodListItem, 'length' | 'width' | 'height'>): string {
  const hasDims = [item.length, item.width, item.height].every((v) => v != null)
  return hasDims ? `${item.length} × ${item.width} × ${item.height} мм` : '—'
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
    rows.push({ rowNum, good_id: id, note: cols[1]?.trim() ?? '' })
  }
  return rows
}

export default function GoodsListPage() {
  const navigate = useNavigate()

  const [goodNameLike, setGoodNameLike] = useState(
    () => sessionStorage.getItem('goods_good_name_like') ?? '',
  )
  const [goodNameLikeInput, setGoodNameLikeInput] = useState(
    () => sessionStorage.getItem('goods_good_name_like') ?? '',
  )
  const [goodType, setGoodType] = useState(() => sessionStorage.getItem('goods_good_type') ?? '')
  const [search, setSearch] = useState(() => sessionStorage.getItem('goods_search') ?? '')
  const [sortKey, setSortKey] = useState<SortKey>('good_id')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }
  const [pageToken, setPageToken] = useState<string | undefined>()
  const [allItems, setAllItems] = useState<GoodListItem[]>([])

  const [showUpload, setShowUpload] = useState(false)

  const [clipboardRows, setClipboardRows] = useState<ClipboardRow[] | null>(() => {
    try {
      const saved = sessionStorage.getItem('goods_clipboard_rows')
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
      sessionStorage.setItem('goods_clipboard_rows', JSON.stringify(rows))
    } else {
      sessionStorage.removeItem('goods_clipboard_rows')
    }
  }

  async function loadFromClipboard() {
    const text = await navigator.clipboard.readText()
    const rows = parseClipboard(text)
    if (rows.length === 0) {
      setClipboardError('Скопируйте артикул или список артикулов из Excel в буфер обмена. Затем нажмите эту кнопку')
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

  function handleUploadedGoods(goodIds: string[]) {
    const normalizedIds = goodIds
      .map((id) => id.trim())
      .filter(Boolean)
    const uniqueIds = [...new Set(normalizedIds)]
    const rows: ClipboardRow[] = uniqueIds.map((good_id, index) => ({
      rowNum: index + 1,
      good_id,
      note: '',
    }))
    updateClipboardRows(rows.length > 0 ? rows : null)
    setClipboardError(null)
    setAllItems([])
    setPageToken(undefined)
  }

  const clipboardIds = clipboardRows?.map((r) => r.good_id)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: clipboardRows
      ? ['goods', 'clipboard', clipboardIds]
      : ['goods', goodNameLike, goodType, pageToken],
    queryFn: clipboardRows
      ? () => goodsApi.list({ good_ids: clipboardIds })
      : () =>
          goodsApi.list({
            page_size: 50,
            page_token: pageToken,
            good_name_like: goodNameLike || undefined,
            good_type: goodType || undefined,
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

  function applyServerFilter() {
    sessionStorage.setItem('goods_good_name_like', goodNameLikeInput)
    setGoodNameLike(goodNameLikeInput)
    setPageToken(undefined)
  }

  function handleNameLikeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') applyServerFilter()
  }

  const mergedRows = useMemo((): MergedRow[] | null => {
    if (!clipboardRows) return null
    const foundMap = new Map(allItems.map((item) => [item.good_id, item]))
    const q = search.trim().toLowerCase()
    const rows = clipboardRows.map((row) => ({
      ...row,
      item: foundMap.get(row.good_id) ?? null,
    }))
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.good_id.toLowerCase().includes(q) ||
        r.note.toLowerCase().includes(q) ||
        (r.item &&
          [r.item.good_name, r.item.good_type_name, r.item.gtr_name].some(
            (v) => v != null && String(v).toLowerCase().includes(q),
          )),
    )
  }, [clipboardRows, allItems, search])

  const filteredItems = useMemo(() => {
    if (clipboardRows) return []
    const q = search.trim().toLowerCase()
    const filtered = q
      ? allItems.filter((item) =>
          [item.good_id, item.good_name, item.good_type_name, item.gtr_name].some(
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

  const isEmpty = clipboardRows ? mergedRows?.length === 0 : filteredItems.length === 0

  function exportToExcel() {
    const rows = clipboardRows && mergedRows
      ? mergedRows.map((r) => ({
          '#': r.rowNum,
          [dict('good_id', 'short')]: r.good_id,
          '2-я колонка буфера': r.note,
          [dict('good_name', 'short')]: r.item?.good_name ?? 'Товар не найден',
          [dict('good_type', 'short')]: r.item?.good_type_name ?? '',
          [dict('gtr_name', 'short')]: r.item?.gtr_name ?? '',
          [dict('weight', 'short')]: r.item?.weight ?? '',
        }))
      : filteredItems.map((item) => ({
          [dict('good_id', 'short')]: item.good_id,
          [dict('good_name', 'short')]: item.good_name,
          [dict('good_type', 'short')]: item.good_type_name,
          [dict('gtr_name', 'short')]: item.gtr_name ?? '',
          [dict('weight', 'short')]: item.weight ?? '',
        }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Товары')
    XLSX.writeFile(wb, 'goods_list.xlsx')
  }

  return (
    <>
      <PageHeader
        title="Товары"
        actions={
          <button className="btn-primary" onClick={() => setShowUpload(true)}>
            Загрузить номенклатуру
          </button>
        }
      />

      <div className="card p-4 mb-6 flex flex-wrap items-center gap-4">
        {/* Clipboard: badge или кнопка */}
        {clipboardRows ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-100 text-primary-700 text-sm font-medium">
            Список: {clipboardRows.length} товаров
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
              По списку товаров из буфера
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

        {/* Серверный фильтр по названию: скрыт в clipboard-режиме */}
        {!clipboardRows && (
          <div className="flex items-center gap-2">
            <input
              className="input w-64"
              placeholder="Название товара..."
              value={goodNameLikeInput}
              onChange={(e) => setGoodNameLikeInput(e.target.value)}
              onKeyDown={handleNameLikeKeyDown}
            />
            <button className="btn-secondary" onClick={applyServerFilter} disabled={isFetching}>
              Найти
            </button>
            {goodNameLike && (
              <button
                className="btn-secondary text-sm"
                onClick={() => {
                  setGoodNameLikeInput('')
                  sessionStorage.setItem('goods_good_name_like', '')
                  setGoodNameLike('')
                  setPageToken(undefined)
                }}
              >
                Сбросить
              </button>
            )}
          </div>
        )}

        {/* Тип товара: скрыт в clipboard-режиме */}
        {!clipboardRows && (
          <select
            className="input w-48"
            value={goodType}
            onChange={(e) => {
              setGoodType(e.target.value)
              sessionStorage.setItem('goods_good_type', e.target.value)
              setPageToken(undefined)
              setAllItems([])
            }}
          >
            <option value="">Все типы</option>
            <option value="flyer">Листовка</option>
            <option value="good">Товар</option>
            <option value="pack">Упаковка</option>
            <option value="service">Услуга</option>
          </select>
        )}

        <input
          className="input w-56"
          placeholder="Поиск по списку..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            sessionStorage.setItem('goods_search', e.target.value)
          }}
        />

        <button
          className="btn-secondary"
          onClick={exportToExcel}
          disabled={(mergedRows ?? filteredItems).length === 0}
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
          <EmptyState title="Товары не найдены" />
        ) : clipboardRows && mergedRows ? (
          // Clipboard mode table
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="th w-12">#</th>
                <th className="th"><Hint text={dict('good_id', 'hint')}>{dict('good_id', 'short')}</Hint></th>
                <th className="th">2-я колонка буфера</th>
                <th className="th"><Hint text={dict('good_name', 'hint')}>{dict('good_name', 'short')}</Hint></th>
                <th className="th"><Hint text={dict('good_type', 'hint')}>{dict('good_type', 'short')}</Hint></th>
                <th className="th"><Hint text={dict('weight', 'hint')}>{dict('weight', 'short')}</Hint></th>
                <th className="th"><Hint text={dict('dims', 'hint')}>{dict('dims', 'short')}</Hint></th>
                <th className="th"><Hint text={dict('gtr_name', 'hint')}>{dict('gtr_name', 'short')}</Hint></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mergedRows.map((row) =>
                row.item ? (
                  <tr
                    key={row.rowNum}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => { if (isTextSelected()) return; navigate(`/goods/${encodeURIComponent(row.item!.good_id)}`) }}
                  >
                    <td className="td text-gray-400 text-xs">{row.rowNum}</td>
                    <td className="td font-mono text-sm text-primary-600">{row.item.good_id}</td>
                    <td className="td text-gray-500 max-w-xs truncate">{row.note || '—'}</td>
                    <td className="td font-medium">{row.item.good_name}</td>
                    <td className="td text-gray-500">{row.item.good_type_name}</td>
                    <td className="td text-gray-500">{row.item.weight ?? '—'}</td>
                    <td className="td text-gray-500">{formatDims(row.item)}</td>
                    <td className="td text-gray-500">{row.item.gtr_name ?? '—'}</td>
                  </tr>
                ) : (
                  <tr key={row.rowNum} className="bg-red-50">
                    <td className="td text-gray-400 text-xs">{row.rowNum}</td>
                    <td className="td font-mono text-sm text-gray-500">{row.good_id}</td>
                    <td className="td text-gray-500 max-w-xs truncate">{row.note || '—'}</td>
                    <td className="td" colSpan={5}>
                      <span className="badge bg-red-100 text-red-600">Не найден</span>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        ) : (
          // Normal mode table
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {(['good_id', 'good_name', 'good_type_name', 'weight'] as SortKey[]).map((key) => {
                  const dictKey = key === 'good_type_name' ? 'good_type' : key
                  return (
                    <th
                      key={key}
                      className="th cursor-pointer select-none hover:bg-gray-100"
                      onClick={() => handleSort(key)}
                    >
                      <Hint text={dict(dictKey as Parameters<typeof dict>[0], 'hint')}>
                        <span>{dict(dictKey as Parameters<typeof dict>[0], 'short')}</span>
                      </Hint>
                      <SortIcon active={sortKey === key} dir={sortDir} />
                    </th>
                  )
                })}
                <th className="th"><Hint text={dict('dims', 'hint')}>{dict('dims', 'short')}</Hint></th>
                <th className="th cursor-pointer select-none hover:bg-gray-100" onClick={() => handleSort('gtr_name')}>
                  <Hint text={dict('gtr_name', 'hint')}><span>{dict('gtr_name', 'short')}</span></Hint>
                  <SortIcon active={sortKey === 'gtr_name'} dir={sortDir} />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr
                  key={item.good_id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => { if (isTextSelected()) return; navigate(`/goods/${encodeURIComponent(item.good_id)}`) }}
                >
                  <td className="td font-mono text-sm text-primary-600">{item.good_id}</td>
                  <td className="td font-medium">{item.good_name}</td>
                  <td className="td text-gray-500">{item.good_type_name}</td>
                  <td className="td text-gray-500">{item.weight ?? '—'}</td>
                  <td className="td text-gray-500">{formatDims(item)}</td>
                  <td className="td text-gray-500">{item.gtr_name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
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

      <UploadGoodsModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={handleUploadedGoods}
      />
    </>
  )
}

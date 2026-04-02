import { useState, useEffect, useRef, FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { indocsApi } from '@/api/indocs'
import { goodsApi } from '@/api/goods'
import type { GoodDetail } from '@/types/good'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { FIELDS } from '@/constants/fields'

// Маппинг: метка колонки Excel → поле ItemRow (метки берём из FIELDS)
const COLUMN_MAP: Record<string, keyof ItemRow> = {
  [FIELDS.good_id.short]: 'good_id',
  [FIELDS.qnt.short]:     'qnt',
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([Object.keys(COLUMN_MAP)])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Товары')
  XLSX.writeFile(wb, 'шаблон_поставка.xlsx')
}

function GoodIdInput({
  value,
  hasError,
  onChange,
  onNameResolved,
}: {
  value: string
  hasError?: boolean
  onChange: (v: string) => void
  onNameResolved: (name: string | undefined) => void
}) {
  const [committed, setCommitted] = useState('')
  // Ref чтобы не включать колбэк в deps useEffect
  const onNameResolvedRef = useRef(onNameResolved)
  onNameResolvedRef.current = onNameResolved

  const { data, isFetching, isError } = useQuery({
    queryKey: ['good', committed],
    queryFn: () => goodsApi.get(committed),
    enabled: committed.length > 0,
    retry: false,
  })

  const good = data?.good as GoodDetail | undefined

  useEffect(() => {
    if (!isFetching && committed) {
      onNameResolvedRef.current(isError ? '' : good?.good_name)
    }
  }, [isFetching, committed, isError, good?.good_name])

  return (
    <input
      className={`input ${hasError ? 'border-red-500 focus:ring-red-500' : ''}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => setCommitted(value.trim())}
      required
      placeholder="good_id"
    />
  )
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

interface ItemRow {
  good_id: string
  qnt: string
  good_name?: string
}

const emptyItem = (): ItemRow => ({ good_id: '', qnt: '1' })

// Создаём поставку (goods_supply_task) с одним или более товарами
export default function CreateIndocModal({ isOpen, onClose }: Props) {
  const qc = useQueryClient()
  const [indocId, setIndocId] = useState('')
  const [indocTxt, setIndocTxt] = useState('')
  const [items, setItems] = useState<ItemRow[]>([emptyItem()])
  const [showErrors, setShowErrors] = useState(false)

  function updateItem(index: number, field: keyof ItemRow, value: string) {
    setItems((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row
        // При ручном изменении good_id сбрасываем ранее полученное имя
        if (field === 'good_id') return { ...row, good_id: value, good_name: undefined }
        return { ...row, [field]: value }
      })
    )
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function pasteFromClipboard() {
    let text: string
    try {
      text = await navigator.clipboard.readText()
    } catch {
      toast.error('Нет доступа к буферу обмена')
      return
    }

    const rows = text
      .trim()
      .split('\n')
      .map((line) => line.split('\t'))

    if (rows.length < 2) {
      toast.error('Буфер пуст или содержит только заголовок')
      return
    }

    const headers = rows[0].map((h) => h.trim())
    const colIndex: Partial<Record<keyof ItemRow, number>> = {}
    for (const [ruName, field] of Object.entries(COLUMN_MAP)) {
      const idx = headers.indexOf(ruName)
      if (idx !== -1) colIndex[field] = idx
    }

    if (colIndex.good_id === undefined || colIndex.qnt === undefined) {
      toast.error(`Не найдены колонки «${FIELDS.good_id.short}» и «${FIELDS.qnt.short}»`)
      return
    }

    const parsed: ItemRow[] = rows
      .slice(1)
      .map((cells) => ({
        good_id: (cells[colIndex.good_id!] ?? '').trim(),
        qnt: (cells[colIndex.qnt!] ?? '1').trim() || '1',
      }))
      .filter((r) => r.good_id)

    if (parsed.length === 0) {
      toast.error('Не найдено ни одной строки с данными')
      return
    }

    // Батч-запрос имён товаров
    try {
      const ids = [...new Set(parsed.map((r) => r.good_id))]
      const goodsData = await goodsApi.list({ good_ids: ids })
      const namesMap = new Map(goodsData.items.map((g) => [g.good_id, g.good_name]))
      for (const row of parsed) {
        row.good_name = namesMap.get(row.good_id) ?? ''
      }
    } catch {
      // Имена не критичны — продолжаем без них
    }

    const hasExisting = items.some((r) => r.good_id.trim())
    if (hasExisting) {
      const replace = window.confirm(
        `В документе уже есть ${items.filter((r) => r.good_id.trim()).length} позиций.\nЗаменить их данными из буфера?\nОтмена — добавить к существующим.`
      )
      setItems(replace ? parsed : [...items, ...parsed])
    } else {
      setItems(parsed)
    }

    toast.success(`Загружено ${parsed.length} позиций`)
  }

  const mutation = useMutation({
    mutationFn: () =>
      indocsApi.create({
        indoc_type: 'goods_supply_task',
        indoc_id: indocId.trim(),
        indoc_txt: indocTxt || undefined,
        items: items.map((row) => ({ good_id: row.good_id.trim(), qnt: Number(row.qnt) })),
      }),
    onSuccess: () => {
      toast.success('Документ создан')
      qc.invalidateQueries({ queryKey: ['indocs'] })
      onClose()
      setIndocId('')
      setIndocTxt('')
      setItems([emptyItem()])
      setShowErrors(false)
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const filledItems = items.filter((r) => r.good_id.trim())
    if (filledItems.length === 0) {
      toast.error('Добавьте хотя бы один товар')
      return
    }
    const hasInvalidId = filledItems.some((r) => r.good_name === '')
    const hasInvalidQnt = filledItems.some((r) => Number(r.qnt) <= 0)
    if (hasInvalidId || hasInvalidQnt) {
      setShowErrors(true)
      toast.error('Исправьте ошибки в таблице')
      return
    }

    mutation.mutate()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Создать входящий документ (поставка)" size="xl">
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="space-y-4 shrink-0">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {FIELDS.indoc_id.label} <span className="text-red-500">*</span>
            </label>
            <input
              className="input"
              value={indocId}
              onChange={(e) => setIndocId(e.target.value)}
              required
              placeholder="Поставка-2024-001"
            />
            <p className="mt-1 text-xs text-gray-400">Уникальный номер в вашей системе</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{FIELDS.indoc_txt.label}</label>
            <input
              className="input"
              value={indocTxt}
              onChange={(e) => setIndocTxt(e.target.value)}
              placeholder="Необязательно"
            />
          </div>
        </div>

        <div className="border-t mt-4 pt-4 flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <p className="text-sm font-medium text-gray-700">Товары</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={downloadTemplate}
              >
                ↓ Шаблон
              </button>
              <button
                type="button"
                className="text-sm text-primary-600 hover:text-primary-700"
                onClick={pasteFromClipboard}
              >
                ⎘ Вставить из буфера
              </button>
              <button type="button" className="text-sm text-primary-600 hover:text-primary-700" onClick={addItem}>
                + Добавить позицию
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[2fr_3fr_1fr_auto] gap-2 mb-1 pr-7 shrink-0">
            <span className="text-xs text-gray-500">{FIELDS.good_id.short}</span>
            <span className="text-xs text-gray-500">{FIELDS.good_name.short}</span>
            <span className="text-xs text-gray-500">{FIELDS.qnt.short}</span>
            <span />
          </div>

          <div className="overflow-y-auto flex-1 space-y-2 pr-1">
            {items.map((row, i) => (
              <div key={i} className="grid grid-cols-[2fr_3fr_1fr_auto] gap-2 items-start">
                <GoodIdInput
                  value={row.good_id}
                  hasError={showErrors && (row.good_id.trim() === '' || row.good_name === '')}
                  onChange={(v) => updateItem(i, 'good_id', v)}
                  onNameResolved={(name) => setItems((prev) =>
                    prev.map((r, idx) => idx === i ? { ...r, good_name: name } : r)
                  )}
                />
                <div className="flex items-center px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[38px] text-sm">
                  {row.good_name === ''
                    ? <span className="text-red-500">Товар не найден</span>
                    : row.good_name
                      ? <span className="text-gray-600">{row.good_name}</span>
                      : <span className="text-gray-300">—</span>
                  }
                </div>
                <input
                  type="number"
                  min="1"
                  className={`input text-right ${showErrors && Number(row.qnt) <= 0 ? 'border-red-500 focus:ring-red-500' : ''}`}
                  value={row.qnt}
                  onChange={(e) => updateItem(i, 'qnt', e.target.value)}
                  required
                />
                <button
                  type="button"
                  className={`px-1 pt-2 ${items.length > 1 ? 'text-gray-400 hover:text-red-500' : 'invisible'}`}
                  onClick={() => removeItem(i)}
                  title="Удалить"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 mt-2 border-t shrink-0">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner className="w-4 h-4 text-white" />}
            Создать
          </button>
        </div>
      </form>
    </Modal>
  )
}

import { useState, useEffect, useRef, FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { indocsApi } from '@/api/indocs'
import DownloadFilesModal from '@/components/ui/DownloadFilesModal'
import { goodsApi } from '@/api/goods'
import type { GoodDetail } from '@/types/good'
import Modal from '@/components/ui/Modal'
import FormAlert from '@/components/ui/FormAlert'
import Spinner from '@/components/ui/Spinner'
import { dict } from '@/constants/dict'
import Hint from '@/components/ui/Hint'
import { parseTemplate } from '@/utils/templateParser'
import type { ParseError } from '@/utils/templateParser'

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
  plan_qnt: string
  good_name?: string
  extra?: Record<string, unknown>
  errors?: ParseError[]
}

const emptyItem = (): ItemRow => ({ good_id: '', plan_qnt: '1' })

interface Alert {
  type: 'error' | 'success' | 'warning'
  message: string
}

export default function CreateGoodsShipmentTask({ isOpen, onClose }: Props) {
  const qc = useQueryClient()
  const [indocId, setIndocId] = useState('')
  const [indocTxt, setIndocTxt] = useState('')
  const [qualType, setQualType] = useState<'useful' | 'defective'>('useful')
  const [pickingOnly, setPickingOnly] = useState(false)
  const [items, setItems] = useState<ItemRow[]>([emptyItem()])
  const [showErrors, setShowErrors] = useState(false)
  const [alert, setAlert] = useState<Alert | null>(null)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [jsonViewIdx, setJsonViewIdx] = useState<number | null>(null)

  function updateItem(index: number, field: keyof ItemRow, value: string) {
    setItems((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row
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
      setAlert({ type: 'error', message: 'Нет доступа к буферу обмена' })
      return
    }

    const rows = text.trim().split('\n').map((line) => line.split('\t'))
    if (rows.length < 3) {
      setAlert({ type: 'error', message: 'Нужны заголовок, DSL-схема и хотя бы одна строка данных' })
      return
    }

    const { items: parsed, errors, schemaErrors } = parseTemplate<Record<string, unknown>>(rows)

    if (schemaErrors.length > 0) {
      const lines = schemaErrors.map(e =>
        e.col >= 0 ? `Колонка ${e.col + 1}: ${e.message}` : e.message
      )
      setAlert({ type: 'error', message: 'Ошибки в DSL-схеме:\n' + lines.map(l => `• ${l}`).join('\n') })
      return
    }

    if (parsed.length === 0) {
      setAlert({ type: 'error', message: 'Не удалось разобрать ни одной строки' })
      return
    }

    const errorsByIdx = new Map<number, ParseError[]>()
    for (const err of errors) {
      const list = errorsByIdx.get(err.itemIdx) ?? []
      list.push(err)
      errorsByIdx.set(err.itemIdx, list)
    }

    const newItems: ItemRow[] = parsed.map((p, i) => {
      const { good_id, plan_qnt, ...rest } = p
      const extra = Object.keys(rest).length > 0 ? rest : undefined
      return { good_id: String(good_id ?? ''), plan_qnt: String(plan_qnt ?? 1), extra, errors: errorsByIdx.get(i) }
    })

    // Батч-запрос имён товаров
    try {
      const ids = [...new Set(newItems.map((r) => r.good_id))]
      const goodsData = await goodsApi.list({ good_ids: ids })
      const namesMap = new Map(goodsData.items.map((g) => [g.good_id, g.good_name]))
      for (const row of newItems) {
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
      setItems(replace ? newItems : [...items, ...newItems])
    } else {
      setItems(newItems)
    }

    const errCount = errors.length
    if (errCount > 0) {
      setAlert({ type: 'warning', message: `Загружено ${parsed.length} позиций. Найдено ошибок разбора: ${errCount}. Исправьте ошибки в Excel и выполните загрузку повторно.` })
    } else {
      setAlert({ type: 'success', message: `Загружено ${parsed.length} позиций` })
    }
  }

  const mutation = useMutation({
    mutationFn: () =>
      indocsApi.create({
        indoc_type: 'goods_shipment_task',
        indoc_id: indocId.trim(),
        indoc_txt: indocTxt || undefined,
        qual_type: qualType,
        picking_only: pickingOnly || undefined,
        items: items.map((row) => ({ ...row.extra, good_id: row.good_id.trim(), plan_qnt: Number(row.plan_qnt) })),
      }),
    onSuccess: () => {
      toast.success('Документ создан')
      qc.invalidateQueries({ queryKey: ['indocs'] })
      onClose()
      setIndocId('')
      setIndocTxt('')
      setQualType('useful')
      setPickingOnly(false)
      setItems([emptyItem()])
      setShowErrors(false)
      setAlert(null)
    },
    onError: (err: Error) => {
      setAlert({ type: 'error', message: err.message })
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const filledItems = items.filter((r) => r.good_id.trim())
    if (filledItems.length === 0) {
      setAlert({ type: 'error', message: 'Добавьте хотя бы один товар' })
      return
    }
    const hasParseErrors = filledItems.some((r) => r.errors && r.errors.length > 0)
    if (hasParseErrors) {
      setAlert({ type: 'error', message: 'Исправьте ошибки в Excel и выполните загрузку повторно.' })
      return
    }
    const hasInvalidId = filledItems.some((r) => r.good_name === '')
    const hasInvalidQnt = filledItems.some((r) => Number(r.plan_qnt) <= 0)
    if (hasInvalidId || hasInvalidQnt) {
      setShowErrors(true)
      setAlert({ type: 'error', message: 'Исправьте ошибки в таблице' })
      return
    }

    mutation.mutate()
  }

  return (
    <>
    <DownloadFilesModal isOpen={downloadOpen} onClose={() => setDownloadOpen(false)} fileType={3} />
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Задание на отгрузку товаров"
      size="xl"
      headerActions={
        <>
          <button type="submit" form="create-goods-shipment-form" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner className="w-4 h-4 text-white" />}
            Создать документ
          </button>
        </>
      }
    >
      <form id="create-goods-shipment-form" onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        {alert && (
          <div className="mb-4 shrink-0">
            <FormAlert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
          </div>
        )}

        <div className="space-y-4 shrink-0">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {dict('indoc_id')} <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                value={indocId}
                onChange={(e) => setIndocId(e.target.value)}
                required
                placeholder="Отгрузка-2024-001"
              />
              <button
                type="button"
                className="btn-secondary shrink-0"
                onClick={() => {
                  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' }))
                  const yy = String(now.getFullYear()).slice(2)
                  const mm = String(now.getMonth() + 1).padStart(2, '0')
                  const dd = String(now.getDate()).padStart(2, '0')
                  const HH = String(now.getHours()).padStart(2, '0')
                  const MI = String(now.getMinutes()).padStart(2, '0')
                  setIndocId(`GH-${yy}-${mm}-${dd}-${HH}${MI}`)
                }}
              >
                Сгенерировать
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">Уникальный номер в вашей системе</p>
          </div>
          <div className="flex gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Качество товара</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="qual_type"
                    value="useful"
                    checked={qualType === 'useful'}
                    onChange={() => setQualType('useful')}
                  />
                  <span className="text-sm text-gray-700">Нормальный</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="qual_type"
                    value="defective"
                    checked={qualType === 'defective'}
                    onChange={() => setQualType('defective')}
                  />
                  <span className="text-sm text-gray-700">Бракованный</span>
                </label>
              </div>
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pickingOnly}
                  onChange={(e) => setPickingOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600"
                />
                <Hint text="Используется для выполнения операций с товаром на складе типа фотографирования, проверки брака">
                  <span className="text-sm text-gray-700">Только подбор (без отгрузки)</span>
                </Hint>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{dict('indoc_txt')}</label>
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
                onClick={() => setDownloadOpen(true)}
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

          <div className="grid grid-cols-[2fr_3fr_1fr_auto_auto] gap-2 mb-1 pr-1 shrink-0">
            <span className="text-xs text-gray-500">{dict('good_id', 'short')}</span>
            <span className="text-xs text-gray-500">{dict('good_name', 'short')}</span>
            <span className="text-xs text-gray-500">{dict('plan_qnt', 'short')}</span>
            <span />
            <span />
          </div>

          <div className="overflow-y-auto flex-1 space-y-2 pr-1">
            {items.map((row, i) => (
              <div key={i} className={`rounded border ${row.errors && row.errors.length > 0 ? 'border-red-300' : 'border-transparent'}`}>
                <div className="grid grid-cols-[2fr_3fr_1fr_auto_auto] gap-2 items-start p-1">
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
                    className={`input text-right ${showErrors && Number(row.plan_qnt) <= 0 ? 'border-red-500 focus:ring-red-500' : ''}`}
                    value={row.plan_qnt}
                    onChange={(e) => updateItem(i, 'plan_qnt', e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="text-xs font-mono text-gray-400 hover:text-gray-700 px-1 pt-2"
                    onClick={() => setJsonViewIdx(i)}
                    title="Посмотреть JSON"
                  >
                    {'{}'}
                  </button>
                  <button
                    type="button"
                    className={`px-1 pt-2 ${items.length > 1 ? 'text-gray-400 hover:text-red-500' : 'invisible'}`}
                    onClick={() => removeItem(i)}
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
                {row.errors && row.errors.length > 0 && (
                  <div className="px-3 py-2 bg-red-50 border-t border-red-200 text-xs text-red-700 space-y-0.5 rounded-b">
                    {row.errors.map((err, j) => (
                      <div key={j}>
                        <span className="font-medium">{err.label}</span>: {err.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </form>
    </Modal>

    {jsonViewIdx !== null && items[jsonViewIdx] && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={() => setJsonViewIdx(null)} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
            <h3 className="font-semibold text-gray-900">JSON: {items[jsonViewIdx].good_id}</h3>
            <button className="text-gray-400 hover:text-gray-600" onClick={() => setJsonViewIdx(null)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <pre className="px-6 py-4 text-xs text-gray-700 bg-gray-50 overflow-auto flex-1 rounded-b-xl">
            {JSON.stringify({ ...items[jsonViewIdx].extra, good_id: items[jsonViewIdx].good_id, plan_qnt: Number(items[jsonViewIdx].plan_qnt) }, null, 2)}
          </pre>
        </div>
      </div>
    )}
    </>
  )
}

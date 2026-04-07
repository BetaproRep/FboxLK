import { useState, FormEvent } from 'react'
import DownloadFilesModal from '@/components/ui/DownloadFilesModal'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { indocsApi } from '@/api/indocs'
import type { OrderCreateItem } from '@/types/order'
import type { ParseError } from '@/utils/orderTemplateParser'
import Modal from '@/components/ui/Modal'
import FormAlert from '@/components/ui/FormAlert'
import Spinner from '@/components/ui/Spinner'
import { FIELDS } from '@/constants/fields'
import { parseOrderTemplate } from '@/utils/orderTemplateParser'


interface OrderEntry {
  order: OrderCreateItem
  errors: ParseError[]
}

interface Alert {
  type: 'error' | 'success' | 'warning'
  message: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function CreateOrdersShipmentTask({ isOpen, onClose }: Props) {
  const qc = useQueryClient()
  const [indocId, setIndocId] = useState('')
  const [indocTxt, setIndocTxt] = useState('')
  const [entries, setEntries] = useState<OrderEntry[]>([])
  const [jsonViewIdx, setJsonViewIdx] = useState<number | null>(null)
  const [alert, setAlert] = useState<Alert | null>(null)
  const [downloadOpen, setDownloadOpen] = useState(false)

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

    const { orders: parsed, errors } = parseOrderTemplate(rows)

    if (parsed.length === 0) {
      setAlert({ type: 'error', message: 'Не удалось разобрать ни одного заказа' })
      return
    }

    // Группируем ошибки по индексу заказа
    const errorsByIdx = new Map<number, ParseError[]>()
    for (const err of errors) {
      const list = errorsByIdx.get(err.orderIdx) ?? []
      list.push(err)
      errorsByIdx.set(err.orderIdx, list)
    }

    const newEntries: OrderEntry[] = parsed.map((order, i) => ({
      order,
      errors: errorsByIdx.get(i) ?? [],
    }))

    if (entries.length > 0) {
      const replace = window.confirm(
        `Уже загружено ${entries.length} заказов.\nЗаменить?\nОтмена — добавить к существующим.`
      )
      setEntries(replace ? newEntries : [...entries, ...newEntries])
    } else {
      setEntries(newEntries)
    }

    const errCount = errors.length
    if (errCount > 0) {
      setAlert({ type: 'warning', message: `Загружено ${parsed.length} заказов. Найдено ошибок разбора: ${errCount} — проверьте строки, выделенные красным.` })
    } else {
      setAlert({ type: 'success', message: `Загружено ${parsed.length} заказов` })
    }
  }

  function removeEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index))
    if (jsonViewIdx === index) setJsonViewIdx(null)
  }

  const mutation = useMutation({
    mutationFn: () =>
      indocsApi.create({
        indoc_type: 'orders_shipment_task',
        indoc_id: indocId.trim(),
        indoc_txt: indocTxt || undefined,
        orders: entries.map((e) => e.order),
      }),
    onSuccess: () => {
      toast.success('Документ создан')
      qc.invalidateQueries({ queryKey: ['indocs'] })
      handleClose()
    },
    onError: (err: Error) => {
      setAlert({ type: 'error', message: err.message })
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (entries.length === 0) {
      setAlert({ type: 'error', message: 'Вставьте заказы из шаблона' })
      return
    }
    mutation.mutate()
  }

  function handleClose() {
    onClose()
    setIndocId('')
    setIndocTxt('')
    setEntries([])
    setJsonViewIdx(null)
    setAlert(null)
  }

  const currentOrder = jsonViewIdx !== null ? entries[jsonViewIdx]?.order : null

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Задание на отгрузку заказов"
        size="xl"
        headerActions={
          <>
            <button type="submit" form="create-orders-shipment-form" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="w-4 h-4 text-white" />}
              Создать документ
            </button>
          </>
        }
      >
        <form id="create-orders-shipment-form" onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {alert && (
            <div className="mb-4 shrink-0">
              <FormAlert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
            </div>
          )}

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
                placeholder="Отгрузка-2024-001"
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
            <div className="flex items-center justify-between mb-3 shrink-0">
              <p className="text-sm font-medium text-gray-700">
                Заказы{entries.length > 0 && <span className="ml-1 text-gray-400 font-normal">({entries.length})</span>}
              </p>
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
                {entries.length > 0 && (
                  <button
                    type="button"
                    className="text-sm text-red-400 hover:text-red-600"
                    onClick={() => { setEntries([]); setJsonViewIdx(null) }}
                  >
                    Очистить список
                  </button>
                )}
              </div>
            </div>

            {entries.length === 0 ? (
              <div className="flex-1 flex items-center justify-center border border-dashed border-gray-200 rounded-lg">
                <p className="text-sm text-gray-400">Заказов нет — вставьте данные из шаблона</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[2fr_1fr_2fr_auto_auto] gap-x-2 mb-1 px-2 shrink-0">
                  <span className="text-xs text-gray-500">{FIELDS.order_id.label}</span>
                  <span className="text-xs text-gray-500">{FIELDS.delivery_id.label}</span>
                  <span className="text-xs text-gray-500">Клиент</span>
                  <span />
                  <span />
                </div>
                <div className="overflow-y-auto flex-1 pr-1">
                  {entries.map(({ order, errors }, i) => (
                    <div
                      key={i}
                      className={`mb-1 rounded border ${errors.length > 0 ? 'border-red-300' : 'border-gray-200'}`}
                    >
                      <div className="grid grid-cols-[2fr_1fr_2fr_auto_auto] gap-x-2 items-center px-2 py-1.5">
                        <span className="text-sm font-medium text-primary-700 truncate">{order.order_id}</span>
                        <span className="text-sm text-gray-500">{order.delivery_id}</span>
                        <span className="text-sm text-gray-500 truncate">{order.client?.name ?? '—'}</span>
                        <button
                          type="button"
                          className="text-xs font-mono text-gray-400 hover:text-gray-700 px-1"
                          onClick={() => setJsonViewIdx(i)}
                          title="Посмотреть JSON"
                        >
                          {'{}'}
                        </button>
                        <button
                          type="button"
                          className="text-gray-400 hover:text-red-500 px-1"
                          onClick={() => removeEntry(i)}
                          title="Удалить"
                        >
                          ✕
                        </button>
                      </div>
                      {errors.length > 0 && (
                        <div className="px-3 py-2 bg-red-50 border-t border-red-200 text-xs text-red-700 space-y-0.5 rounded-b">
                          {errors.map((err, j) => (
                            <div key={j}>
                              <span className="font-medium">{err.label}</span>: {err.message}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

        </form>
      </Modal>

      <DownloadFilesModal isOpen={downloadOpen} onClose={() => setDownloadOpen(false)} fileType={1} />

      {currentOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setJsonViewIdx(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <h3 className="font-semibold text-gray-900">JSON: {currentOrder.order_id}</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setJsonViewIdx(null)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <pre className="px-6 py-4 text-xs text-gray-700 bg-gray-50 overflow-auto flex-1 rounded-b-xl">
              {JSON.stringify(currentOrder, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </>
  )
}

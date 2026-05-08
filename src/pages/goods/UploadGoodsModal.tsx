import { useState, FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { goodsApi } from '@/api/goods'
import { parseTemplate } from '@/utils/templateParser'
import type { ParseError } from '@/utils/templateParser'
import Modal from '@/components/ui/Modal'
import FormAlert from '@/components/ui/FormAlert'
import Spinner from '@/components/ui/Spinner'
import DownloadFilesModal from '@/components/ui/DownloadFilesModal'
import { useConfirmDialog } from '@/components/ui/ConfirmDialog'

type GoodItem = Record<string, unknown>

interface GoodEntry {
  good: GoodItem
  errors: ParseError[]
}

interface Alert {
  type: 'error' | 'success' | 'warning'
  message: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onUploaded?: (goodIds: string[]) => void
}

export default function UploadGoodsModal({ isOpen, onClose, onUploaded }: Props) {
  const qc = useQueryClient()
  const { confirm, confirmNode } = useConfirmDialog()
  const [entries, setEntries] = useState<GoodEntry[]>([])
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
      setAlert({ type: 'error', message: 'Нужен заголовок, DSL-схема и хотя бы одна строка данных' })
      return
    }

    const { items: parsed, errors, schemaErrors } = parseTemplate<GoodItem>(rows)

    if (schemaErrors.length > 0) {
      const lines = schemaErrors.map((e) =>
        e.col >= 0 ? `Колонка ${e.col + 1}: ${e.message}` : e.message,
      )
      setAlert({
        type: 'error',
        message: 'Ошибки в DSL-схеме:\n' + lines.map((l) => `• ${l}`).join('\n'),
      })
      return
    }

    if (parsed.length === 0) {
      setAlert({ type: 'error', message: 'Не удалось разобрать ни одного товара' })
      return
    }

    const errorsByIdx = new Map<number, ParseError[]>()
    for (const err of errors) {
      const list = errorsByIdx.get(err.itemIdx) ?? []
      list.push(err)
      errorsByIdx.set(err.itemIdx, list)
    }

    const newEntries: GoodEntry[] = parsed.map((good, i) => ({
      good,
      errors: errorsByIdx.get(i) ?? [],
    }))

    if (entries.length > 0) {
      const replace = await confirm(
        `Уже загружено ${entries.length} товаров`,
        { description: 'Заменить их данными из буфера?', confirmLabel: 'Заменить', cancelLabel: 'Добавить к существующим', variant: 'primary' }
      )
      setEntries(replace ? newEntries : [...entries, ...newEntries])
    } else {
      setEntries(newEntries)
    }

    const errCount = errors.length
    if (errCount > 0) {
      setAlert({
        type: 'warning',
        message: `Загружено ${parsed.length} товаров. Найдено ошибок разбора: ${errCount} — проверьте строки, выделенные красным.`,
      })
    } else {
      setAlert({ type: 'success', message: `Загружено ${parsed.length} товаров` })
    }
  }

  function removeEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index))
    if (jsonViewIdx === index) setJsonViewIdx(null)
  }

  const mutation = useMutation({
    mutationFn: (goods: GoodItem[]) => goodsApi.create(goods),
    onSuccess: (_, goods) => {
      const uploadedIds = goods
        .map((good) => String(good.good_id ?? '').trim())
        .filter(Boolean)
      onUploaded?.(uploadedIds)
      toast.success('Номенклатура загружена')
      qc.invalidateQueries({ queryKey: ['goods'] })
      handleClose()
    },
    onError: (err: Error) => {
      setAlert({ type: 'error', message: err.message })
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (entries.length === 0) {
      setAlert({ type: 'error', message: 'Вставьте товары из шаблона' })
      return
    }
    const hasErrors = entries.some((e) => e.errors.length > 0)
    if (hasErrors) {
      setAlert({ type: 'error', message: 'Исправьте ошибки разбора перед загрузкой' })
      return
    }
    mutation.mutate(entries.map((e) => e.good))
  }

  function handleClose() {
    onClose()
    setEntries([])
    setJsonViewIdx(null)
    setAlert(null)
  }

  const currentGood = jsonViewIdx !== null ? entries[jsonViewIdx]?.good : null

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Загрузка номенклатуры"
        size="xl"
        headerActions={
          <button
            type="submit"
            form="upload-goods-form"
            className="btn-primary"
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Spinner className="w-4 h-4 text-white" />}
            Загрузить
          </button>
        }
      >
        <form id="upload-goods-form" onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {alert && (
            <div className="mb-4 shrink-0">
              <FormAlert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
            </div>
          )}

          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <p className="text-sm font-medium text-gray-700">
                Товары{entries.length > 0 && (
                  <span className="ml-1 text-gray-400 font-normal">({entries.length})</span>
                )}
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
                <p className="text-sm text-gray-400">Товаров нет — вставьте данные из шаблона</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_2fr_auto_auto] gap-x-2 mb-1 px-2 shrink-0">
                  <span className="text-xs text-gray-500">Артикул</span>
                  <span className="text-xs text-gray-500">Название товара</span>
                  <span className="invisible text-xs font-mono px-1">{'{}'}</span>
                  <span className="invisible px-1">✕</span>
                </div>
                <div className="overflow-y-auto flex-1 pr-1">
                  {entries.map(({ good, errors }, i) => (
                    <div
                      key={i}
                      className={`mb-1 rounded border ${errors.length > 0 ? 'border-red-300' : 'border-gray-200'}`}
                    >
                      <div className="grid grid-cols-[1fr_2fr_auto_auto] gap-x-2 items-center px-2 py-1.5">
                        <span className="text-sm font-medium text-primary-700 truncate">
                          {String(good.good_id ?? '—')}
                        </span>
                        <span className="text-sm text-gray-500 truncate">
                          {String(good.good_name ?? '—')}
                        </span>
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

      <DownloadFilesModal isOpen={downloadOpen} onClose={() => setDownloadOpen(false)} fileType={4} />

      {confirmNode}

      {currentGood && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setJsonViewIdx(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <h3 className="font-semibold text-gray-900">
                JSON: {String(currentGood.good_id ?? '')}
              </h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setJsonViewIdx(null)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <pre className="px-6 py-4 text-xs text-gray-700 bg-gray-50 overflow-auto flex-1 rounded-b-xl">
              {JSON.stringify(currentGood, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </>
  )
}

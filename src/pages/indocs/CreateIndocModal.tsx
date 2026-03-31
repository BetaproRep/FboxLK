import { useState, FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { indocsApi } from '@/api/indocs'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'

interface Props {
  isOpen: boolean
  onClose: () => void
}

interface ItemRow {
  good_id: string
  qnt: string
}

const emptyItem = (): ItemRow => ({ good_id: '', qnt: '1' })

// Создаём поставку (goods_supply_task) с одним или более товарами
export default function CreateIndocModal({ isOpen, onClose }: Props) {
  const qc = useQueryClient()
  const [indocId, setIndocId] = useState('')
  const [indocTxt, setIndocTxt] = useState('')
  const [items, setItems] = useState<ItemRow[]>([emptyItem()])

  function updateItem(index: number, field: keyof ItemRow, value: string) {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
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
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Создать входящий документ (поставка)">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Номер документа <span className="text-red-500">*</span>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Примечание</label>
          <input
            className="input"
            value={indocTxt}
            onChange={(e) => setIndocTxt(e.target.value)}
            placeholder="Необязательно"
          />
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-700">Товары</p>
            <button type="button" className="text-sm text-primary-600 hover:text-primary-700" onClick={addItem}>
              + Добавить позицию
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-1">
            <span className="col-span-2 text-xs text-gray-500">ID товара</span>
            <span className="text-xs text-gray-500">Кол-во</span>
          </div>

          {items.map((row, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 items-center">
              <div className="col-span-2">
                <input
                  className="input"
                  value={row.good_id}
                  onChange={(e) => updateItem(i, 'good_id', e.target.value)}
                  required
                  placeholder="good_id"
                />
              </div>
              <div className="flex gap-1">
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={row.qnt}
                  onChange={(e) => updateItem(i, 'qnt', e.target.value)}
                  required
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    className="text-gray-400 hover:text-red-500 px-1"
                    onClick={() => removeItem(i)}
                    title="Удалить"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-2">
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

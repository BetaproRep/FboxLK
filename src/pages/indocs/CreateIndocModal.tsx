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

// Создаём поставку (goods_supply_task) с одним или более товарами
export default function CreateIndocModal({ isOpen, onClose }: Props) {
  const qc = useQueryClient()
  const [indocId, setIndocId] = useState('')
  const [indocTxt, setIndocTxt] = useState('')
  const [goodId, setGoodId] = useState('')
  const [qnt, setQnt] = useState('1')

  const mutation = useMutation({
    mutationFn: () =>
      indocsApi.create({
        indoc_type: 'goods_supply_task',
        indoc_id: indocId.trim(),
        indoc_txt: indocTxt || undefined,
        items: [{ good_id: goodId.trim(), qnt: Number(qnt) }],
      }),
    onSuccess: () => {
      toast.success('Документ создан')
      qc.invalidateQueries({ queryKey: ['indocs'] })
      onClose()
      setIndocId('')
      setIndocTxt('')
      setGoodId('')
      setQnt('1')
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
        <div className="border-t pt-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Товар (первая позиция)</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">ID товара <span className="text-red-500">*</span></label>
              <input
                className="input"
                value={goodId}
                onChange={(e) => setGoodId(e.target.value)}
                required
                placeholder="good_id"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Кол-во <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="1"
                className="input"
                value={qnt}
                onChange={(e) => setQnt(e.target.value)}
                required
              />
            </div>
          </div>
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

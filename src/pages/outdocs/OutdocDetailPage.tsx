import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { outdocsApi } from '@/api/outdocs'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'

type Tab = 'goods' | 'sn' | 'files' | 'photos'

export default function OutdocDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const outdocId = Number(id)
  const [tab, setTab] = useState<Tab>('goods')

  const { data: goodsData } = useQuery({
    queryKey: ['outdoc-goods', outdocId],
    queryFn: () => outdocsApi.getGoods(outdocId),
    enabled: tab === 'goods',
  })

  const { data: snData } = useQuery({
    queryKey: ['outdoc-sn', outdocId],
    queryFn: () => outdocsApi.getSerialNumbers(outdocId),
    enabled: tab === 'sn',
  })

  const { data: filesData } = useQuery({
    queryKey: ['outdoc-files', outdocId],
    queryFn: () => outdocsApi.getFiles(outdocId),
    enabled: tab === 'files',
  })

  const { data: photosData } = useQuery({
    queryKey: ['outdoc-photos', outdocId],
    queryFn: () => outdocsApi.getPhotos(outdocId),
    enabled: tab === 'photos',
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => outdocsApi.uploadFile(outdocId, file),
    onSuccess: () => {
      toast.success('Файл загружен')
      qc.invalidateQueries({ queryKey: ['outdoc-files', outdocId] })
    },
  })

  const deleteFileMutation = useMutation({
    mutationFn: (fileName: string) => outdocsApi.deleteFile(outdocId, [fileName]),
    onSuccess: () => {
      toast.success('Файл удалён')
      qc.invalidateQueries({ queryKey: ['outdoc-files', outdocId] })
    },
  })

  return (
    <>
      <PageHeader
        title={`Документ #${outdocId}`}
        actions={
          <button className="btn-secondary" onClick={() => navigate('/outdocs')}>
            ← Назад
          </button>
        }
      />

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {(['goods', 'sn', 'files', 'photos'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {{ goods: 'Товары', sn: 'Серийные номера', files: 'Файлы', photos: 'Фото' }[t]}
          </button>
        ))}
      </div>

      {tab === 'goods' && (
        <div className="card overflow-hidden">
          {goodsData?.goods && goodsData.goods.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="th">ID товара</th>
                  <th className="th">Состояние</th>
                  <th className="th">Тип качества</th>
                  <th className="th text-right">Кол-во</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {goodsData.goods.map((g, i) => (
                  <tr key={i}>
                    <td className="td font-mono text-sm">{g.good_id}</td>
                    <td className="td text-gray-500">{g.good_state}</td>
                    <td className="td text-gray-500">{g.qual_type}</td>
                    <td className="td text-right font-medium">{g.qnt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="Нет данных о товарах" />
          )}
        </div>
      )}

      {tab === 'sn' && (
        <div className="card overflow-hidden">
          {snData?.good_sn && snData.good_sn.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="th">Серийный номер</th>
                  <th className="th">ID товара</th>
                  <th className="th">Тип качества</th>
                  <th className="th">Направление</th>
                  <th className="th">Заказ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {snData.good_sn.map((sn, i) => (
                  <tr key={i}>
                    <td className="td font-mono text-sm">{sn.good_sn}</td>
                    <td className="td text-gray-500 font-mono text-sm">{sn.good_id}</td>
                    <td className="td text-gray-500">{sn.qual_type}</td>
                    <td className="td">
                      <span className={`badge ${sn.inout === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {sn.inout === 1 ? 'Приход' : 'Расход'}
                      </span>
                    </td>
                    <td className="td text-gray-500">{sn.order_id ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="Серийных номеров нет" />
          )}
        </div>
      )}

      {tab === 'files' && (
        <div className="card p-6">
          <div className="mb-4">
            <label className="btn-secondary cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Загрузить PDF
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadMutation.mutate(file)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
          {filesData?.items && filesData.items.length > 0 ? (
            <div className="space-y-2">
              {filesData.items.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <a href={f.url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline text-sm">
                    {f.file_name}
                  </a>
                  <button
                    className="text-red-500 hover:text-red-700 text-sm"
                    onClick={() => deleteFileMutation.mutate(f.file_name)}
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Файлов нет" />
          )}
        </div>
      )}

      {tab === 'photos' && (
        <div className="card p-6">
          {photosData?.items && photosData.items.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {photosData.items.map((p) => (
                <a key={p.photo_id} href={p.url} target="_blank" rel="noreferrer">
                  <img
                    src={p.url}
                    alt={p.descrip ?? 'фото'}
                    className="w-full aspect-square object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                  />
                </a>
              ))}
            </div>
          ) : (
            <EmptyState title="Фото нет" />
          )}
        </div>
      )}
    </>
  )
}

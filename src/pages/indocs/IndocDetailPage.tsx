import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { indocsApi } from '@/api/indocs'
import PageHeader from '@/components/ui/PageHeader'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'

type Tab = 'json' | 'files' | 'photos'

export default function IndocDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const indocId = id!
  const [tab, setTab] = useState<Tab>('json')

  const { data: jsonData, isLoading } = useQuery({
    queryKey: ['indoc-json', indocId],
    queryFn: () => indocsApi.getJson(indocId),
    enabled: tab === 'json',
  })

  const { data: filesData } = useQuery({
    queryKey: ['indoc-files', indocId],
    queryFn: () => indocsApi.getFiles(indocId),
    enabled: tab === 'files',
  })

  const { data: photosData } = useQuery({
    queryKey: ['indoc-photos', indocId],
    queryFn: () => indocsApi.getPhotos(indocId),
    enabled: tab === 'photos',
  })

  const deleteMutation = useMutation({
    mutationFn: () => indocsApi.delete(indocId),
    onSuccess: () => {
      toast.success('Документ удалён')
      qc.invalidateQueries({ queryKey: ['indocs'] })
      navigate('/indocs')
    },
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => indocsApi.uploadFile(indocId, file),
    onSuccess: () => {
      toast.success('Файл загружен')
      qc.invalidateQueries({ queryKey: ['indoc-files', indocId] })
    },
  })

  const deleteFileMutation = useMutation({
    mutationFn: (fileName: string) => indocsApi.deleteFile(indocId, [fileName]),
    onSuccess: () => {
      toast.success('Файл удалён')
      qc.invalidateQueries({ queryKey: ['indoc-files', indocId] })
    },
  })

  return (
    <>
      <PageHeader
        title={`Документ ${indocId}`}
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => navigate('/indocs')}>
              ← Назад
            </button>
            <button
              className="btn-danger"
              onClick={() => { if (confirm('Удалить документ?')) deleteMutation.mutate() }}
              disabled={deleteMutation.isPending}
            >
              Удалить
            </button>
          </div>
        }
      />

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {(['json', 'files', 'photos'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {{ json: 'Json', files: 'Файлы', photos: 'Фото' }[t]}
          </button>
        ))}
      </div>

      {tab === 'json' && (
        <div className="card p-6">
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner className="w-6 h-6 text-primary-600" /></div>
          ) : jsonData?.indoc ? (
            <pre className="text-xs bg-gray-50 rounded-lg p-4 overflow-auto max-h-[600px]">
              {JSON.stringify(jsonData.indoc, null, 2)}
            </pre>
          ) : (
            <EmptyState title="Нет данных" />
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
            <EmptyState title="Файлов нет" description="Загрузите PDF-документы" />
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

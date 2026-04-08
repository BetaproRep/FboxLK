import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchFiles, FileItem } from '@/api/files'
import Modal from './Modal'
import Spinner from './Spinner'

interface Props {
  isOpen: boolean
  onClose: () => void
  fileType: number
}

function DownloadButton({ item }: { item: FileItem }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch(item.url)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = item.file_name
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 group w-full disabled:opacity-50"
    >
      <div className="flex items-center gap-2 min-w-0">
        <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-sm text-gray-700 truncate">{item.file_name}</span>
      </div>
      {loading
        ? <Spinner className="w-4 h-4 text-blue-500 shrink-0" />
        : <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
      }
    </button>
  )
}

export default function DownloadFilesModal({ isOpen, onClose, fileType }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['files', fileType],
    queryFn: () => fetchFiles(fileType),
    enabled: isOpen,
    staleTime: 60_000,
  })

  const customFiles = data?.items.filter(f => f.is_custom) ?? []
  const standardFiles = data?.items.filter(f => !f.is_custom) ?? []
  const hasCustom = customFiles.length > 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={data?.form_name ?? 'Загрузка файлов'} size="sm" zIndex="z-[60]">
      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-500 py-4 text-center">Не удалось загрузить список файлов</p>
      )}

      {data && (
        <div className="flex flex-col gap-1 overflow-y-auto">
          {hasCustom && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 pt-1 pb-0.5">
                Персонально для вас
              </p>
              {customFiles.map(item => (
                <DownloadButton key={item.url} item={item} />
              ))}
              <div className="border-t border-gray-100 my-1" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 pt-1 pb-0.5">
                Стандартные
              </p>
            </>
          )}
          {standardFiles.map(item => (
            <DownloadButton key={item.url} item={item} />
          ))}
        </div>
      )}
    </Modal>
  )
}

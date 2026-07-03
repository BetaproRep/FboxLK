import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import type { DashboardGoogleSheets, DashboardReport } from '@/api/dashboard'
import Spinner from '@/components/ui/Spinner'

function ReportDownloadButton({ report }: { report: DashboardReport }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(report.url)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = report.file_name
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
      className="flex items-start gap-2 w-full text-left text-violet-900/90 hover:text-violet-700 disabled:opacity-60 disabled:cursor-wait"
    >
      {loading ? (
        <Spinner className="w-4 h-4 text-violet-700 shrink-0" />
      ) : (
        <svg
          className="w-4 h-4 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      )}
      <span className="min-w-0 whitespace-normal break-words">{report.file_name}</span>
    </button>
  )
}

function GoogleSheetsModal({
  config,
  isOpen,
  onClose,
}: {
  config: DashboardGoogleSheets
  isOpen: boolean
  onClose: () => void
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={config.modal_title ?? 'Отчёты в Google Таблицах'} size="md">
      <div className="overflow-y-auto max-h-[70vh] space-y-4 text-sm text-gray-700">
        {config.description_paragraphs?.map((p, i) => (
          <p key={i} className="leading-relaxed">
            {p}
          </p>
        ))}

        {config.requirements && config.requirements.length > 0 && (
          <div>
            <div className="font-semibold text-gray-900 mb-1">Требования</div>
            <ul className="list-disc pl-5 space-y-1">
              {config.requirements.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {config.steps && config.steps.length > 0 && (
          <div>
            <div className="font-semibold text-gray-900 mb-1">Как начать</div>
            <ol className="list-decimal pl-5 space-y-1">
              {config.steps.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          </div>
        )}

        <a
          href={config.google_sheet_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          {config.link_label ?? 'Создать копию шаблона'}
        </a>
      </div>
    </Modal>
  )
}

export default function AnalyticsReportsCard({
  googleSheets,
  excelReports,
}: {
  googleSheets: DashboardGoogleSheets | null
  excelReports: DashboardReport[]
}) {
  const [sheetsModalOpen, setSheetsModalOpen] = useState(false)
  const showSheets = Boolean(googleSheets?.google_sheet_url)
  const showExcel = excelReports.length > 0

  if (!showSheets && !showExcel) {
    return null
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm shadow-sm">
      <div className="font-semibold text-violet-900 mb-3">Аналитические отчеты</div>

      {showSheets && googleSheets && (
        <div className="mb-3 pb-3 border-b border-violet-200/80">
          <button
            type="button"
            onClick={() => setSheetsModalOpen(true)}
            className="flex items-start gap-2 w-full text-left text-emerald-900/90 hover:text-emerald-800 font-medium"
          >
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 5H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="min-w-0">
              Google Таблицы
              {googleSheets.summary ? (
                <span className="block text-xs font-normal text-emerald-900/70 mt-0.5">
                  {googleSheets.summary}
                </span>
              ) : null}
            </span>
          </button>
          <GoogleSheetsModal
            config={googleSheets}
            isOpen={sheetsModalOpen}
            onClose={() => setSheetsModalOpen(false)}
          />
        </div>
      )}

      {showExcel && (
        <div>
          <div className="font-medium text-violet-900 mb-2">Отчеты в Excel</div>
          <div className="space-y-1.5">
            {excelReports.map((r) => (
              <ReportDownloadButton key={r.url} report={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

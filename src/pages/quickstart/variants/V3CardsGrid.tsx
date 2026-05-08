import { useEffect, useMemo, useRef, useState, type ChangeEventHandler } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  parseQuickStartSteps,
  quickStartMarkdownDefault,
  quickStartSteps,
  QUICKSTART_OVERRIDE_STORAGE_KEY,
} from '../content'
import ConceptChip from '../components/ConceptChip'

const STORAGE_KEY = 'quickstart_v3_open_step'

const stepIcons: Record<string, React.ReactNode> = {
  goods: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  supply: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7}
        d="M3 10l1.5 9a2 2 0 002 1.66h11a2 2 0 002-1.66L21 10M3 10l9-7 9 7M3 10h18" />
    </svg>
  ),
  'tracking-supply': (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 12l2 2 4-4" />
    </svg>
  ),
  orders: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7}
        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  'tracking-orders': (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7}
        d="M9 19V6l-2 2m4-2v13m0 0l3-3m-3 3l-3-3m11-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

export default function V3CardsGrid() {
  const [searchParams] = useSearchParams()
  const isAuthoringMode = searchParams.get('authoring') === '1'
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [markdown, setMarkdown] = useState<string>(() => {
    const fromStorage = sessionStorage.getItem(QUICKSTART_OVERRIDE_STORAGE_KEY)
    return fromStorage ?? quickStartMarkdownDefault
  })
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [infoMessage, setInfoMessage] = useState<string>('')
  const parsed = useMemo(() => parseQuickStartSteps(markdown), [markdown])
  const steps = parsed.steps.length > 0 ? parsed.steps : quickStartSteps

  const [openId, setOpenId] = useState<string | null>(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (!saved) return null
    return saved
  })

  useEffect(() => {
    if (!openId) {
      sessionStorage.removeItem(STORAGE_KEY)
      return
    }
    sessionStorage.setItem(STORAGE_KEY, openId)
  }, [openId])

  useEffect(() => {
    if (openId && !steps.some((step) => step.id === openId)) {
      setOpenId(null)
    }
  }, [openId, steps])

  const open = steps.find((s) => s.id === openId)
  const defaultErrors = parsed.issues.map((issue) => `Строка ${issue.line}: ${issue.message}`)

  const handleReset = () => {
    sessionStorage.removeItem(QUICKSTART_OVERRIDE_STORAGE_KEY)
    setMarkdown(quickStartMarkdownDefault)
    setValidationErrors([])
    setInfoMessage('Вернули встроенную версию быстрого старта.')
  }

  const handleExport = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quickstart.md'
    a.click()
    URL.revokeObjectURL(url)
    setInfoMessage('Markdown выгружен в файл.')
  }

  const handleImportClick = () => fileInputRef.current?.click()

  const handleImportFile: ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    const nextMarkdown = await file.text()
    const nextParsed = parseQuickStartSteps(nextMarkdown)
    const issues = nextParsed.issues.map((issue) => `Строка ${issue.line}: ${issue.message}`)

    if (issues.length > 0) {
      setValidationErrors(issues)
      setInfoMessage('Импорт отклонён: исправьте ошибки контракта markdown.')
      return
    }

    sessionStorage.setItem(QUICKSTART_OVERRIDE_STORAGE_KEY, nextMarkdown)
    setMarkdown(nextMarkdown)
    setValidationErrors([])
    setInfoMessage('Новая версия markdown успешно применена в текущей сессии.')
  }

  if (open) {
    return (
      <div className="max-w-3xl">
        {isAuthoringMode && <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Экспорт md
            </button>
            <button
              type="button"
              onClick={handleImportClick}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Импорт md
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Сбросить к дефолту
            </button>
            <input ref={fileInputRef} type="file" accept=".md,text/markdown,text/plain" onChange={handleImportFile} className="hidden" />
          </div>
          {infoMessage && <p className="mt-2 text-xs text-gray-600">{infoMessage}</p>}
          {defaultErrors.length > 0 && (
            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-900">Встроенный markdown содержит ошибки контракта:</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-amber-800">
                {defaultErrors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            </div>
          )}
          {validationErrors.length > 0 && (
            <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3">
              <p className="text-xs font-medium text-red-900">Ошибки в импортированном markdown:</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-red-800">
                {validationErrors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            </div>
          )}
        </div>}

        <button
          type="button"
          onClick={() => setOpenId(null)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          К карте шагов
        </button>

        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{open.title}</h2>
          <p className="text-base text-gray-700 leading-7 mb-4">{open.intro}</p>

          <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700 mb-6">
            {open.body.map((line, i) => (
              <li key={i} className="leading-6">{line}</li>
            ))}
          </ul>

          {open.concepts.length > 0 && (
            <div className="mb-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Важные понятия
              </div>
              <div className="flex flex-wrap gap-1.5">
                {open.concepts.map((c) => (
                  <ConceptChip key={`${c.label}:${c.to}`} concept={c} />
                ))}
              </div>
            </div>
          )}

          {open.cta && (
            <Link
              to={open.cta.to}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              {open.cta.label}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      {isAuthoringMode && <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Экспорт md
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Импорт md
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Сбросить к дефолту
          </button>
          <input ref={fileInputRef} type="file" accept=".md,text/markdown,text/plain" onChange={handleImportFile} className="hidden" />
        </div>
        {infoMessage && <p className="mt-2 text-xs text-gray-600">{infoMessage}</p>}
        {defaultErrors.length > 0 && (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-900">Встроенный markdown содержит ошибки контракта:</p>
            <ul className="mt-1 list-disc pl-5 text-xs text-amber-800">
              {defaultErrors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          </div>
        )}
        {validationErrors.length > 0 && (
          <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3">
            <p className="text-xs font-medium text-red-900">Ошибки в импортированном markdown:</p>
            <ul className="mt-1 list-disc pl-5 text-xs text-red-800">
              {validationErrors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          </div>
        )}
      </div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {steps.map((step, idx) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setOpenId(step.id)}
            className="group bg-white rounded-lg border border-gray-200 p-6 text-left hover:border-primary-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                {stepIcons[step.id] ?? <span>{idx + 1}</span>}
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Шаг {idx + 1}
              </span>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2 leading-snug">{step.title}</h3>
            <p className="text-sm text-gray-600 leading-6">{step.intro}</p>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-700">
              Подробнее
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

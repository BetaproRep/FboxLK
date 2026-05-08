import { useEffect, useMemo, useRef, useState, type ChangeEventHandler } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { findSectionIn, HELP_OVERRIDE_STORAGE_KEY, helpMarkdownDefault, helpSections, parseHelpSections } from '../helpManifest'
import MarkdownView from '../components/MarkdownView'

export default function V2Tabs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const isAuthoringMode = searchParams.get('authoring') === '1'
  const location = useLocation()
  const navigate = useNavigate()
  const clearHighlightTimerRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [markdown, setMarkdown] = useState<string>(() => {
    const fromStorage = sessionStorage.getItem(HELP_OVERRIDE_STORAGE_KEY)
    return fromStorage ?? helpMarkdownDefault
  })
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [infoMessage, setInfoMessage] = useState<string>('')

  const parsed = useMemo(() => parseHelpSections(markdown), [markdown])
  const sections = parsed.sections.length > 0 ? parsed.sections : helpSections
  const tabId = searchParams.get('tab') ?? sections[0].id
  const section = findSectionIn(sections, tabId)

  useEffect(() => {
    if (!searchParams.get('tab') && sections.length > 0) {
      const next = new URLSearchParams(searchParams)
      next.set('tab', sections[0].id)
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, sections, setSearchParams])

  // Шаг 1: при hash-якоре сначала выбрать нужную tab, сохранив сам hash.
  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    const target = sections.find((s) => s.content.includes(`{#${id}}`) || s.id === id)
    if (target && target.id !== tabId) {
      const nextSearch = new URLSearchParams(searchParams)
      nextSearch.set('tab', target.id)
      navigate(
        {
          pathname: location.pathname,
          search: `?${nextSearch.toString()}`,
          hash: location.hash,
        },
        { replace: true },
      )
    }
  }, [location.hash, location.pathname, navigate, searchParams, sections, tabId])

  // Шаг 2: когда tab уже выбрана, проскроллить и временно подсветить заголовок.
  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    const target = sections.find((s) => s.content.includes(`{#${id}}`) || s.id === id)
    if (target && target.id !== tabId) {
      // Ждём, пока переключится tab (это делает эффект выше).
      return
    }
    const scrollTimer = window.setTimeout(() => {
      const el = document.getElementById(id)
      if (!el) return

      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // Перезапускаем подсветку даже при повторном клике в тот же anchor.
      el.classList.remove('help-anchor-highlight')
      // Force reflow to allow class re-apply animation.
      void el.getBoundingClientRect()
      el.classList.add('help-anchor-highlight')

      if (clearHighlightTimerRef.current) {
        window.clearTimeout(clearHighlightTimerRef.current)
      }
      clearHighlightTimerRef.current = window.setTimeout(() => {
        el.classList.remove('help-anchor-highlight')
      }, 2200)
    }, 30)

    return () => window.clearTimeout(scrollTimer)
  }, [location.hash, sections, tabId])

  useEffect(() => {
    return () => {
      if (clearHighlightTimerRef.current) {
        window.clearTimeout(clearHighlightTimerRef.current)
      }
    }
  }, [])

  const errorMessages = parsed.issues.map((issue) => `Строка ${issue.line}: ${issue.message}`)

  const handleReset = () => {
    sessionStorage.removeItem(HELP_OVERRIDE_STORAGE_KEY)
    setMarkdown(helpMarkdownDefault)
    setValidationErrors([])
    setInfoMessage('Вернули встроенную версию справки.')
  }

  const handleExport = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'help.md'
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
    const nextParsed = parseHelpSections(nextMarkdown)
    const issues = nextParsed.issues.map((issue) => `Строка ${issue.line}: ${issue.message}`)

    if (issues.length > 0) {
      setValidationErrors(issues)
      setInfoMessage('Импорт отклонён: исправьте ошибки контракта markdown.')
      return
    }

    sessionStorage.setItem(HELP_OVERRIDE_STORAGE_KEY, nextMarkdown)
    setMarkdown(nextMarkdown)
    setValidationErrors([])
    setInfoMessage('Новая версия markdown успешно применена в текущей сессии.')
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
        {errorMessages.length > 0 && (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-900">Встроенный markdown содержит ошибки контракта:</p>
            <ul className="mt-1 list-disc pl-5 text-xs text-amber-800">
              {errorMessages.map((error) => <li key={error}>{error}</li>)}
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

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {sections.map((s) => {
            const isActive = s.id === tabId
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams)
                  next.set('tab', s.id)
                  setSearchParams(next)
                }}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {s.title}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="max-w-3xl bg-white rounded-lg border border-gray-200 p-8">
        <MarkdownView source={section.content} />
      </div>
    </div>
  )
}

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { findSectionIn, helpSections, helpMarkdownDefault, parseHelpSections } from '../helpManifest'
import MarkdownView from '../components/MarkdownView'
import InlineHelpPanel, { HelpIconButton } from '@/components/ui/InlineHelpPanel'
import { getTabHelp } from '@/content/pageHelp'
import { getMarkdownWithOverride, HELP_OVERRIDE_STORAGE_KEY, usePageHelpWriterMode } from '@/content/authoringState'

const MAIN_SCROLL_ID = 'app-scroll-main'
const SCROLL_STORAGE_PREFIX = 'portal-main-scroll:'
const HELP_RETURN_KEY = 'portal-help-return'

function scrollStorageKey(loc: Pick<Location, 'pathname' | 'search' | 'hash'>): string {
  return `${SCROLL_STORAGE_PREFIX}${loc.pathname}${loc.search}${loc.hash}`
}

function readHelpReturn(): { search: string; hash: string } | null {
  try {
    const raw = sessionStorage.getItem(HELP_RETURN_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as { search?: string; hash?: unknown }
    if (typeof o.search !== 'string' || !o.search.includes('tab=')) return null
    return { search: o.search, hash: typeof o.hash === 'string' ? o.hash : '' }
  } catch {
    return null
  }
}

function writeHelpReturn(search: string, hash: string) {
  sessionStorage.setItem(HELP_RETURN_KEY, JSON.stringify({ search, hash }))
}

function getMainScrollEl(): HTMLElement | null {
  return document.getElementById(MAIN_SCROLL_ID)
}

export default function V2Tabs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const writerMode = usePageHelpWriterMode()
  const location = useLocation()
  const navigate = useNavigate()
  const clearHighlightTimerRef = useRef<number | null>(null)
  const markdownSource = getMarkdownWithOverride(helpMarkdownDefault, HELP_OVERRIDE_STORAGE_KEY)
  const parsed = useMemo(() => parseHelpSections(markdownSource), [markdownSource])
  const sections = parsed.sections.length > 0 ? parsed.sections : helpSections
  const tabId = searchParams.get('tab') ?? sections[0].id
  const section = findSectionIn(sections, tabId)
  const tabHelp = getTabHelp('help', tabId)
  const [tabHelpOpen, setTabHelpOpen] = useState(false)

  useEffect(() => {
    setTabHelpOpen(writerMode)
  }, [tabId, writerMode])

  // Восстановить вкладку и якорь после ухода в другой раздел и клика «Справка» (/help без query).
  useEffect(() => {
    if (location.pathname !== '/help') return
    if (searchParams.get('tab')) return

    const saved = readHelpReturn()
    if (saved) {
      const qs = saved.search.startsWith('?') ? saved.search.slice(1) : saved.search
      const sp = new URLSearchParams(qs)
      const tab = sp.get('tab')
      if (tab && sections.some((s) => s.id === tab)) {
        const searchStr = saved.search.startsWith('?') ? saved.search : `?${saved.search}`
        navigate(
          { pathname: location.pathname, search: searchStr, hash: saved.hash || '' },
          { replace: true },
        )
        return
      }
    }
    if (sections.length > 0) {
      const next = new URLSearchParams(searchParams)
      next.set('tab', sections[0].id)
      setSearchParams(next, { replace: true })
    }
  }, [location.pathname, navigate, searchParams, sections, setSearchParams])

  // Запоминаем tab+hash, пока на справке выбрана вкладка (не затираем при промежуточном /help без tab).
  useEffect(() => {
    if (location.pathname !== '/help') return
    if (!searchParams.get('tab')) return
    writeHelpReturn(location.search, location.hash)
  }, [location.pathname, location.search, location.hash, searchParams])

  // Сохраняем прокрутку области main при любом уходе с этого URL (вкладка, hash, уход со справки).
  // Браузерный «Назад» не восстанавливает scroll внутри overflow-main — только window.
  useEffect(() => {
    const main = getMainScrollEl()
    if (!main) return
    const key = scrollStorageKey(location)
    return () => {
      sessionStorage.setItem(key, String(main.scrollTop))
    }
  }, [location.pathname, location.search, location.hash])

  // Восстановление прокрутки main для текущего URL (Назад/Вперёд и возврат из других страниц по меню).
  // При наличии hash позицию задаёт эффект ниже (scrollIntoView).
  useLayoutEffect(() => {
    if (location.pathname !== '/help') return
    if (location.hash) return
    const main = getMainScrollEl()
    if (!main) return
    const raw = sessionStorage.getItem(scrollStorageKey(location))
    if (raw == null) return
    const y = Number(raw)
    if (!Number.isFinite(y)) return
    requestAnimationFrame(() => {
      main.scrollTop = y
    })
  }, [location.pathname, location.search, location.hash])

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

  // Пока URL без tab (ожидается восстановление или первая вкладка), не показываем контент по умолчанию.
  if (location.pathname === '/help' && !searchParams.get('tab')) {
    return <div className="min-h-[200px]" aria-busy="true" />
  }

  return (
    <div>
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {sections.map((s) => {
            const isActive = s.id === tabId
            const helpForTab = getTabHelp('help', s.id)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams)
                  next.set('tab', s.id)
                  setSearchParams(next)
                }}
                className={`inline-flex items-center gap-0.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {isActive && (writerMode || helpForTab) && (
                  <HelpIconButton
                    asSpan
                    onClick={() => setTabHelpOpen((v) => !v)}
                    title={`Пояснение к вкладке ${s.title}`}
                  />
                )}
                {s.title}
              </button>
            )
          })}
        </nav>
      </div>

      {(writerMode || tabHelp) && (
        <InlineHelpPanel
          content={tabHelp?.content ?? ''}
          marker={`tab:help:${tabId}`}
          markerTemplate={`### ${section.title} {#tab:help:${tabId}}`}
          isOpen={tabHelpOpen}
          onClose={() => setTabHelpOpen(false)}
          isAuthoringMode={writerMode}
          className="mb-4"
        />
      )}

      <div className="max-w-3xl bg-white rounded-lg border border-gray-200 p-8">
        <MarkdownView source={section.content} />
      </div>
    </div>
  )
}

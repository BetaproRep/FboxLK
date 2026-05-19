import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  parseQuickStartSteps,
  quickStartMarkdownDefault,
  quickStartScenarios,
} from '../content'
import QuickStartMarkdownView from '../components/QuickStartMarkdownView'
import InlineHelpPanel, { HelpIconButton } from '@/components/ui/InlineHelpPanel'
import { getTabHelp } from '@/content/pageHelp'
import {
  getMarkdownWithOverride,
  QUICKSTART_OVERRIDE_STORAGE_KEY,
  usePageHelpWriterMode,
} from '@/content/authoringState'
import type { QuickStartCard, QuickStartScenario } from '@/content/markdownContracts'

const qsIcon = (path: string) => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d={path} />
  </svg>
)

const quickStartCardIcons: Record<string, React.ReactNode> = {
  goods: qsIcon(
    'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  ),
  supply: qsIcon('M3 10l1.5 9a2 2 0 002 1.66h11a2 2 0 002-1.66L21 10M3 10l9-7 9 7M3 10h18'),
  'tracking-supply': qsIcon(
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 12l2 2 4-4',
  ),
  orders: qsIcon('M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z'),
  'tracking-orders': qsIcon(
    'M9 19V6l-2 2m4-2v13m0 0l3-3m-3 3l-3-3m11-3a9 9 0 11-18 0 9 9 0 0118 0z',
  ),
}

/** Иконка только при явном `icon=` в md и известном ключе реестра */
function resolvedCardIcon(card: QuickStartCard): React.ReactNode | null {
  if (!card.iconKey) return null
  return quickStartCardIcons[card.iconKey] ?? null
}

function CardBadgeRow({ card, className }: { card: QuickStartCard; className: string }) {
  const icon = resolvedCardIcon(card)
  const showStep = card.step !== undefined
  const stepText = showStep ? `Шаг ${card.step}` : null
  if (!icon && !stepText) return null
  return (
    <div
      className={`flex items-start gap-2 ${className} ${
        icon && stepText ? 'justify-between' : stepText ? 'justify-end' : ''
      }`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 group-hover:bg-primary-100 transition-colors">
          {icon}
        </div>
      )}
      {stepText && (
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 shrink-0">{stepText}</span>
      )}
    </div>
  )
}

export default function V3CardsGrid() {
  const writerMode = usePageHelpWriterMode()
  const [searchParams, setSearchParams] = useSearchParams()
  const markdownSource = getMarkdownWithOverride(quickStartMarkdownDefault, QUICKSTART_OVERRIDE_STORAGE_KEY)
  const parsed = useMemo(() => parseQuickStartSteps(markdownSource), [markdownSource])
  const scenarios: QuickStartScenario[] =
    parsed.scenarios.length > 0 ? parsed.scenarios : quickStartScenarios

  const tabFromUrl = searchParams.get('tab')
  const cardFromUrl = searchParams.get('card')

  const scenarioForCard =
    cardFromUrl && scenarios.length > 0
      ? scenarios.find((s) => s.cards.some((c) => c.id === cardFromUrl)) ?? null
      : null

  const activeScenario =
    scenarioForCard ??
    scenarios.find((s) => s.id === tabFromUrl) ??
    scenarios[0] ??
    null

  const [tabHelpOpen, setTabHelpOpen] = useState(false)

  const openLongCard =
    activeScenario?.cards.find((c) => c.id === cardFromUrl && c.cardType === 'long') ?? null

  useEffect(() => {
    if (!activeScenario || scenarios.length === 0) return
    const next = new URLSearchParams(searchParams)
    let changed = false
    if (tabFromUrl !== activeScenario.id) {
      next.set('tab', activeScenario.id)
      changed = true
    }
    if (changed) setSearchParams(next, { replace: true })
  }, [activeScenario, scenarios.length, searchParams, setSearchParams, tabFromUrl])

  useEffect(() => {
    if (!cardFromUrl || !activeScenario) return
    const c = activeScenario.cards.find((x) => x.id === cardFromUrl)
    if (!c || c.cardType !== 'long') {
      const next = new URLSearchParams(searchParams)
      next.delete('card')
      setSearchParams(next, { replace: true })
    }
  }, [activeScenario, cardFromUrl, searchParams, setSearchParams])

  const tabHelp = getTabHelp('quick-start', openLongCard?.id)
  useEffect(() => {
    setTabHelpOpen(writerMode)
  }, [openLongCard?.id, writerMode])

  const setScenarioTab = (id: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', id)
    next.delete('card')
    setSearchParams(next)
  }

  const openCardDetail = (id: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('card', id)
    setSearchParams(next)
  }

  const closeCardDetail = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('card')
    setSearchParams(next)
  }

  if (!activeScenario) {
    return <p className="text-sm text-gray-600">Нет сценариев в quickstart.md.</p>
  }

  if (openLongCard) {
    return (
      <div className="max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={closeCardDetail}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            К карте шагов
          </button>
          {(writerMode || tabHelp) && (
            <HelpIconButton
              onClick={() => setTabHelpOpen((v) => !v)}
              title={`Пояснение: ${openLongCard.title}`}
            />
          )}
        </div>

        {(writerMode || tabHelp) && (
          <InlineHelpPanel
            content={tabHelp?.content ?? ''}
            marker={`tab:quick-start:${openLongCard.id}`}
            markerTemplate={`### Шаг: ${openLongCard.title} {#tab:quick-start:${openLongCard.id}}`}
            isOpen={tabHelpOpen}
            onClose={() => setTabHelpOpen(false)}
            isAuthoringMode={writerMode}
            className="mb-4"
          />
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{openLongCard.title}</h2>
          <QuickStartMarkdownView source={openLongCard.bodyMarkdown} />
        </div>
      </div>
    )
  }

  return (
    <div>
      {scenarios.length > 1 && (
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap gap-2" aria-label="Сценарии">
            {scenarios.map((s) => {
              const active = s.id === activeScenario.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScenarioTab(s.id)}
                  className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'border-primary-600 text-primary-700'
                      : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900'
                  }`}
                >
                  {s.title}
                </button>
              )
            })}
          </nav>
        </div>
      )}

      {activeScenario.preambleMarkdown.trim() !== '' && (
        <div className="mb-6 rounded-lg border border-gray-100 bg-gray-50/80 p-4">
          <QuickStartMarkdownView source={activeScenario.preambleMarkdown} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeScenario.cards.map((card) => {
          if (card.cardType === 'short') {
            return (
              <div
                key={card.id}
                className="group bg-white rounded-lg border border-gray-200 p-6 text-left flex flex-col"
              >
                <CardBadgeRow card={card} className="mb-3" />
                <h3 className="text-base font-semibold text-gray-900 mb-2 leading-snug">{card.title}</h3>
                <div className="text-sm text-gray-700 flex-1 min-h-0">
                  <QuickStartMarkdownView source={card.bodyMarkdown} />
                </div>
              </div>
            )
          }

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => openCardDetail(card.id)}
              className="group bg-white rounded-lg border border-gray-200 p-6 text-left hover:border-primary-300 hover:shadow-sm transition-all flex flex-col"
            >
              <CardBadgeRow card={card} className="mb-4" />
              <h3 className="text-base font-semibold text-gray-900 mb-2 leading-snug">{card.title}</h3>
              <p className="text-sm text-gray-600 leading-6 line-clamp-6">{card.teaserText}</p>
              <div className="mt-auto pt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-700">
                Подробнее
                <svg
                  className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

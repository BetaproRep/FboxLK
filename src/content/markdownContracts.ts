export interface TabbedSection {
  id: string
  title: string
  content: string
}

export interface MarkdownValidationIssue {
  line: number
  message: string
}

export interface TabbedParseResult {
  sections: TabbedSection[]
  issues: MarkdownValidationIssue[]
}

const H1_WITH_ID_RE = /^#\s+(.+?)\s+\{#([a-z0-9][a-z0-9-]*)\}\s*$/
const H1_ANY_RE = /^#\s+(.+?)\s*$/

function trimTrailingEmptyLines(lines: string[]): string[] {
  let end = lines.length
  while (end > 0 && lines[end - 1].trim() === '') {
    end -= 1
  }
  return lines.slice(0, end)
}

export function parseTabbedMarkdown(markdown: string): TabbedParseResult {
  const lines = markdown.split(/\r?\n/)
  const issues: MarkdownValidationIssue[] = []
  const sections: TabbedSection[] = []
  const usedIds = new Set<string>()

  let current: { id: string; title: string; body: string[] } | null = null

  const pushCurrent = () => {
    if (!current) return
    sections.push({
      id: current.id,
      title: current.title,
      content: trimTrailingEmptyLines(current.body).join('\n').trim(),
    })
    current = null
  }

  lines.forEach((line, index) => {
    const lineNo = index + 1
    const withIdMatch = line.match(H1_WITH_ID_RE)
    if (withIdMatch) {
      pushCurrent()
      const title = withIdMatch[1].trim()
      const id = withIdMatch[2].trim()
      if (usedIds.has(id)) {
        issues.push({ line: lineNo, message: `Дублирующийся id секции "${id}".` })
      }
      usedIds.add(id)
      current = { id, title, body: [] }
      return
    }

    if (H1_ANY_RE.test(line)) {
      issues.push({
        line: lineNo,
        message: 'Заголовок H1 должен содержать явный id в формате "{#section-id}".',
      })
      return
    }

    if (current) {
      current.body.push(line)
    }
  })

  pushCurrent()

  if (sections.length === 0) {
    issues.push({ line: 1, message: 'Файл должен содержать хотя бы один заголовок H1 с id.' })
  }

  if (sections.length > 0) {
    sections.forEach((section) => {
      if (!section.content.trim()) {
        const start = lines.findIndex((line) => line.includes(`{#${section.id}}`))
        issues.push({
          line: start >= 0 ? start + 1 : 1,
          message: `Секция "${section.title}" не содержит контента.`,
        })
      }
    })
  }

  return { sections, issues }
}

export interface ConceptRef {
  label: string
  to: string
}

/** @deprecated Используйте QuickStartCard / QuickStartScenario; оставлено для совместимости типов в старых импортах */
export interface QuickStartStep {
  id: string
  title: string
  intro: string
  body: string[]
  concepts: ConceptRef[]
  cta?: { label: string; to: string }
}

export type QuickStartCardType = 'long' | 'short'

export interface QuickStartCard {
  id: string
  title: string
  cardType: QuickStartCardType
  /** Номер шага из атрибута step=N; если атрибута нет — бейдж «Шаг» не показывается */
  step?: number
  /** Ключ реестра иконок из атрибута icon=...; если атрибута нет — иконка не показывается */
  iconKey?: string
  /** Полное тело карточки (markdown под H2) */
  bodyMarkdown: string
  /** Для type=long: текст из начальных строк blockquote (для превью в сетке) */
  teaserText: string
}

export interface QuickStartScenario {
  id: string
  title: string
  /** Markdown до первой карточки H2 (например вводная цитата сценария) */
  preambleMarkdown: string
  cards: QuickStartCard[]
}

export interface QuickStartParseResult {
  scenarios: QuickStartScenario[]
  issues: MarkdownValidationIssue[]
  /** Подзаголовок страницы: первая цитата из преамбулы первого сценария */
  defaultPageSubtitle: string
}

const QUICKSTART_H2_CARD_RE = /^##\s+(.+?)\s+\{([^}]+)\}\s*$/

function parseQuickStartBraceInner(inner: string): { id: string; attrs: Record<string, string> } | null {
  const tokens = inner.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return null
  const idM = tokens[0].match(/^#([a-z0-9][a-z0-9-]*)$/)
  if (!idM) return null
  const attrs: Record<string, string> = {}
  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i]
    const eq = t.indexOf('=')
    if (eq > 0) attrs[t.slice(0, eq)] = t.slice(eq + 1)
  }
  return { id: idM[1], attrs }
}

function extractLeadingBlockquoteText(markdown: string): string {
  const lines = markdown.split(/\r?\n/)
  const parts: string[] = []
  for (const line of lines) {
    if (line.trim() === '') {
      if (parts.length > 0) break
      continue
    }
    const m = line.match(/^>\s*(.*)$/)
    if (m) parts.push(m[1].trim())
    else break
  }
  return parts.join(' ').trim()
}

function absLineForSection(markdown: string, sectionId: string): number {
  const lines = markdown.split(/\r?\n/)
  const index = lines.findIndex((line) => {
    const m = line.match(H1_WITH_ID_RE)
    return m && m[2] === sectionId
  })
  return index >= 0 ? index + 1 : 1
}

/** 1-based номер строки в файле: первая строка тела сценария (сразу под H1) = offset 0 */
function absLineInScenarioBody(markdown: string, scenarioId: string, lineOffsetInSection: number): number {
  const lines = markdown.split(/\r?\n/)
  const h1Idx = lines.findIndex((line) => {
    const m = line.match(H1_WITH_ID_RE)
    return m && m[2] === scenarioId
  })
  if (h1Idx < 0) return 1
  return h1Idx + 1 + lineOffsetInSection + 1
}

function absLineForCard(markdown: string, cardId: string): number {
  const lines = markdown.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(QUICKSTART_H2_CARD_RE)
    if (!m) continue
    const inner = parseQuickStartBraceInner(m[2])
    if (inner?.id === cardId) return i + 1
  }
  return 1
}

function splitScenarioIntoCards(
  scenarioBody: string,
  scenarioId: string,
  markdown: string,
  issues: MarkdownValidationIssue[],
): { preambleMarkdown: string; cards: Omit<QuickStartCard, 'teaserText'>[] } {
  const lines = scenarioBody.split(/\r?\n/)
  const cardHeaderIndices: number[] = []
  lines.forEach((line, i) => {
    if (QUICKSTART_H2_CARD_RE.test(line)) cardHeaderIndices.push(i)
  })

  if (cardHeaderIndices.length === 0) {
    const lineNo = absLineForSection(markdown, scenarioId)
    issues.push({
      line: lineNo,
      message: `Сценарий "${scenarioId}" не содержит карточек: ожидается хотя бы один заголовок "## Название {#card-id type=long|short ...}".`,
    })
    return { preambleMarkdown: scenarioBody.trim(), cards: [] }
  }

  const preambleLines = lines.slice(0, cardHeaderIndices[0])
  const preambleMarkdown = trimTrailingEmptyLines(preambleLines).join('\n').trim()

  const cards: Omit<QuickStartCard, 'teaserText'>[] = []

  cardHeaderIndices.forEach((headerIdx, cardIndex) => {
    const headerLine = lines[headerIdx]
    const hm = headerLine.match(QUICKSTART_H2_CARD_RE)
    if (!hm) return
    const title = hm[1].trim()
    const parsedInner = parseQuickStartBraceInner(hm[2])
    const lineNo = absLineInScenarioBody(markdown, scenarioId, headerIdx)

    if (!parsedInner) {
      issues.push({
        line: lineNo,
        message: `Некорректный заголовок карточки в сценарии "${scenarioId}": первый токен в {...} должен быть #card-id.`,
      })
      return
    }

    const { id, attrs } = parsedInner
    const cardLine = absLineForCard(markdown, id)
    const typeRaw = (attrs.type ?? 'long').toLowerCase()
    if (typeRaw !== 'long' && typeRaw !== 'short') {
      issues.push({
        line: cardLine,
        message: `Карточка "${id}": допустим только type=long или type=short, получено "${attrs.type ?? ''}".`,
      })
      return
    }
    const cardType = typeRaw as QuickStartCardType

    let step: number | undefined
    if (attrs.step !== undefined) {
      const n = parseInt(attrs.step, 10)
      if (Number.isNaN(n)) {
        issues.push({ line: cardLine, message: `Карточка "${id}": step должен быть числом.` })
      } else {
        step = n
      }
    }

    const iconKey = attrs.icon?.trim() || undefined

    const nextHeader = cardHeaderIndices[cardIndex + 1] ?? lines.length
    const bodyLines = lines.slice(headerIdx + 1, nextHeader)
    const bodyMarkdown = trimTrailingEmptyLines(bodyLines).join('\n').trim()

    if (!bodyMarkdown) {
      issues.push({ line: cardLine, message: `Карточка "${id}" не содержит контента под заголовком.` })
    }

    if (cardType === 'long') {
      const firstMeaningful = bodyLines.find((l) => l.trim() !== '')
      if (!firstMeaningful || !/^>\s/.test(firstMeaningful)) {
        issues.push({
          line: cardLine,
          message: `Карточка "${id}" (type=long): сразу после заголовка нужна хотя бы одна строка цитаты "> ...".`,
        })
      }
    }

    cards.push({ id, title, cardType, step, iconKey, bodyMarkdown })
  })

  return { preambleMarkdown, cards }
}

function firstBlockquotePlain(preambleMarkdown: string): string {
  const m = preambleMarkdown.match(/^>\s*(.+)$/m)
  return m ? m[1].trim() : ''
}

export function parseQuickStartMarkdown(markdown: string): QuickStartParseResult {
  const parsed = parseTabbedMarkdown(markdown)
  const issues: MarkdownValidationIssue[] = [...parsed.issues]
  const usedCardIds = new Set<string>()

  const scenarios: QuickStartScenario[] = parsed.sections.map((section) => {
    const { preambleMarkdown, cards: rawCards } = splitScenarioIntoCards(
      section.content,
      section.id,
      markdown,
      issues,
    )

    const cards: QuickStartCard[] = rawCards.map((c) => ({
      ...c,
      teaserText: c.cardType === 'long' ? extractLeadingBlockquoteText(c.bodyMarkdown) : '',
    }))

    cards.forEach((c) => {
      if (usedCardIds.has(c.id)) {
        issues.push({
          line: absLineForCard(markdown, c.id),
          message: `Дублирующийся id карточки "${c.id}" (id карточек должны быть уникальны в файле).`,
        })
      }
      usedCardIds.add(c.id)
    })

    return {
      id: section.id,
      title: section.title,
      preambleMarkdown,
      cards,
    }
  })

  const defaultPageSubtitle =
    scenarios.length > 0 ? firstBlockquotePlain(scenarios[0].preambleMarkdown) : ''

  return { scenarios, issues, defaultPageSubtitle }
}

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

export interface QuickStartStep {
  id: string
  title: string
  intro: string
  body: string[]
  concepts: ConceptRef[]
  cta?: { label: string; to: string }
}

export interface QuickStartParseResult {
  steps: QuickStartStep[]
  issues: MarkdownValidationIssue[]
}

function parseMarkdownLink(line: string): { label: string; href: string } | null {
  const match = line.match(/^\s*-\s+\[(.+)\]\((.+)\)\s*$/)
  if (!match) return null
  return { label: match[1].trim(), href: match[2].trim() }
}

export function parseQuickStartMarkdown(markdown: string): QuickStartParseResult {
  const parsed = parseTabbedMarkdown(markdown)
  const issues = [...parsed.issues]
  const steps: QuickStartStep[] = parsed.sections.map((section) => {
    const lines = section.content.split(/\r?\n/)
    const sectionStartLine = absLineForSection(markdown, section.id)
    let mode: 'none' | 'steps' | 'concepts' | 'cta' = 'none'
    const introLines: string[] = []
    const body: string[] = []
    const concepts: ConceptRef[] = []
    let cta: { label: string; to: string } | undefined

    lines.forEach((line) => {
      if (/^##\s+Шаги\s*$/.test(line)) {
        mode = 'steps'
        return
      }
      if (/^##\s+Понятия\s*$/.test(line)) {
        mode = 'concepts'
        return
      }
      if (/^##\s+CTA\s*$/.test(line)) {
        mode = 'cta'
        return
      }
      if (line.startsWith('## ')) {
        mode = 'none'
        return
      }

      const blockquote = line.match(/^>\s*(.+)\s*$/)
      if (blockquote) {
        introLines.push(blockquote[1])
        return
      }

      if (mode === 'steps') {
        const bullet = line.match(/^\s*-\s+(.+)\s*$/)
        if (bullet) body.push(bullet[1].trim())
        return
      }

      if (mode === 'concepts') {
        const link = parseMarkdownLink(line)
        if (link) concepts.push({ label: link.label, to: link.href })
        return
      }

      if (mode === 'cta') {
        const link = line.match(/^\s*\[(.+)\]\((.+)\)\s*$/)
        if (link) cta = { label: link[1].trim(), to: link[2].trim() }
      }
    })

    if (body.length === 0) {
      issues.push({ line: sectionStartLine, message: `Сценарий "${section.id}" не содержит блока "## Шаги".` })
    }
    if (introLines.length === 0) {
      issues.push({ line: sectionStartLine, message: `Сценарий "${section.id}" не содержит краткого описания (blockquote "> ...").` })
    }

    return {
      id: section.id,
      title: section.title,
      intro: introLines.join(' ').trim(),
      body,
      concepts,
      cta,
    }
  })

  return { steps, issues }
}

function absLineForSection(markdown: string, sectionId: string): number {
  const lines = markdown.split(/\r?\n/)
  const index = lines.findIndex((line) => line.includes(`{#${sectionId}}`))
  return index >= 0 ? index + 1 : 1
}

import pageHelpMarkdownDefault from '@/content/page-help/page-help.md?raw'
import type { MarkdownValidationIssue } from '@/content/markdownContracts'
import { getMarkdownWithOverride, PAGE_HELP_OVERRIDE_STORAGE_KEY } from '@/content/authoringState'

export interface PageHelpEntry {
  id: string
  title: string
  content: string
  pageKey: string
  tabKey?: string
}

interface PageHelpParseResult {
  entries: PageHelpEntry[]
  issues: MarkdownValidationIssue[]
}

const PAGE_RE = /^page:([a-z0-9][a-z0-9-]*)$/
const TAB_RE = /^tab:([a-z0-9][a-z0-9_-]*):([a-z0-9][a-z0-9_-]*)$/
const HELP_HEADER_RE = /^(##|###)\s+(.+?)\s+\{#([^}]+)\}\s*$/

function trimTrailingEmptyLines(lines: string[]): string[] {
  let end = lines.length
  while (end > 0 && lines[end - 1].trim() === '') {
    end -= 1
  }
  return lines.slice(0, end)
}

export function parsePageHelpMarkdown(markdown: string): PageHelpParseResult {
  const lines = markdown.split(/\r?\n/)
  const issues: MarkdownValidationIssue[] = []
  const entries: PageHelpEntry[] = []
  const seenIds = new Set<string>()

  let current: { id: string; title: string; level: '##' | '###'; line: number; body: string[] } | null = null

  const pushCurrent = () => {
    if (!current) return
    const pageMatch = current.id.match(PAGE_RE)
    const tabMatch = current.id.match(TAB_RE)

    if (current.level === '##' && !pageMatch) {
      issues.push({ line: current.line, message: `Секция уровня ## должна иметь id формата page:<page-key>, получено "${current.id}".` })
      current = null
      return
    }
    if (current.level === '###' && !tabMatch) {
      issues.push({ line: current.line, message: `Секция уровня ### должна иметь id формата tab:<page-key>:<tab-key>, получено "${current.id}".` })
      current = null
      return
    }

    const content = trimTrailingEmptyLines(current.body).join('\n').trim()
    if (!content) {
      issues.push({ line: current.line, message: `Секция "${current.title}" не содержит контента.` })
      current = null
      return
    }

    if (pageMatch) {
      entries.push({ id: current.id, title: current.title, content, pageKey: pageMatch[1] })
    } else if (tabMatch) {
      entries.push({ id: current.id, title: current.title, content, pageKey: tabMatch[1], tabKey: tabMatch[2] })
    }

    current = null
  }

  lines.forEach((line, index) => {
    const lineNo = index + 1
    const headerMatch = line.match(HELP_HEADER_RE)
    if (headerMatch) {
      pushCurrent()
      const level = headerMatch[1] as '##' | '###'
      const title = headerMatch[2].trim()
      const id = headerMatch[3].trim()
      if (seenIds.has(id)) {
        issues.push({ line: lineNo, message: `Дублирующийся id "${id}".` })
      }
      seenIds.add(id)
      current = { id, title, level, line: lineNo, body: [] }
      return
    }
    if (current) current.body.push(line)
  })

  pushCurrent()

  if (entries.length === 0) {
    issues.push({ line: 1, message: 'Файл page-help должен содержать секции формата ##/### с корректными id.' })
  }

  return { entries, issues }
}

export const pageHelpRawDefault = pageHelpMarkdownDefault
const parsedDefault = parsePageHelpMarkdown(getMarkdownWithOverride(pageHelpRawDefault, PAGE_HELP_OVERRIDE_STORAGE_KEY))

if (parsedDefault.issues.length > 0) {
  console.error('[page-help] invalid default markdown contract', parsedDefault.issues)
}

export const pageHelpEntries = parsedDefault.entries
export const pageHelpIssues = parsedDefault.issues

export function getPageHelpEntries(): PageHelpEntry[] {
  return parsePageHelpMarkdown(getMarkdownWithOverride(pageHelpRawDefault, PAGE_HELP_OVERRIDE_STORAGE_KEY)).entries
}

export function getPageHelp(pageKey: string): PageHelpEntry | undefined {
  return getPageHelpEntries().find((entry) => entry.pageKey === pageKey && !entry.tabKey)
}

export function getTabHelp(pageKey: string, tabKey: string | undefined): PageHelpEntry | undefined {
  if (!tabKey) return undefined
  return getPageHelpEntries().find((entry) => entry.pageKey === pageKey && entry.tabKey === tabKey)
}

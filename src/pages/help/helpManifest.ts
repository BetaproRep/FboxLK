import defaultHelpMarkdown from '@/content/help/help.md?raw'
import { parseTabbedMarkdown } from '@/content/markdownContracts'

export interface HelpSection {
  /** id-якорь, по которому секция открывается. */
  id: string
  /** Название в навигации. */
  title: string
  /** Markdown-контент секции. */
  content: string
}

export const HELP_OVERRIDE_STORAGE_KEY = 'help_markdown_override_v1'
export const helpMarkdownDefault = defaultHelpMarkdown

const parsedDefault = parseTabbedMarkdown(helpMarkdownDefault)
if (parsedDefault.issues.length > 0) {
  // Встроенный markdown должен быть валиден; ошибки выводим в консоль для диагностики.
  console.error('[help] invalid default markdown contract', parsedDefault.issues)
}

export const helpSections: HelpSection[] = parsedDefault.sections

export function parseHelpSections(markdown: string) {
  return parseTabbedMarkdown(markdown)
}

export function findSection(id: string | undefined): HelpSection {
  if (!id) return helpSections[0]
  return helpSections.find((s) => s.id === id) ?? helpSections[0]
}

export function findSectionIn(sections: HelpSection[], id: string | undefined): HelpSection {
  if (sections.length === 0) {
    return { id: 'empty', title: 'Пустая секция', content: '' }
  }
  if (!id) return sections[0]
  return sections.find((s) => s.id === id) ?? sections[0]
}

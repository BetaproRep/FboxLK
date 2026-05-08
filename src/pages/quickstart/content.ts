import quickStartMarkdown from '@/content/quickstart/quickstart.md?raw'
import { parseQuickStartMarkdown, type ConceptRef, type QuickStartStep } from '@/content/markdownContracts'

export type { ConceptRef, QuickStartStep }

export const QUICKSTART_OVERRIDE_STORAGE_KEY = 'quickstart_markdown_override_v1'
export const quickStartMarkdownDefault = quickStartMarkdown

const parsed = parseQuickStartMarkdown(quickStartMarkdownDefault)

if (parsed.issues.length > 0) {
  console.error('[quickstart] invalid markdown contract', parsed.issues)
}

export const quickStartSteps: QuickStartStep[] = parsed.steps

export function parseQuickStartSteps(markdown: string) {
  return parseQuickStartMarkdown(markdown)
}

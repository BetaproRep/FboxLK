import quickStartMarkdown from '@/content/quickstart/quickstart.md?raw'
import {
  parseQuickStartMarkdown,
  type ConceptRef,
  type QuickStartScenario,
  type QuickStartStep,
} from '@/content/markdownContracts'
import { getMarkdownWithOverride, QUICKSTART_OVERRIDE_STORAGE_KEY } from '@/content/authoringState'

export type { ConceptRef, QuickStartStep, QuickStartScenario }

export const quickStartMarkdownDefault = quickStartMarkdown

const parsed = parseQuickStartMarkdown(
  getMarkdownWithOverride(quickStartMarkdownDefault, QUICKSTART_OVERRIDE_STORAGE_KEY),
)

if (parsed.issues.length > 0) {
  console.error('[quickstart] invalid markdown contract', parsed.issues)
}

export const quickStartScenarios: QuickStartScenario[] = parsed.scenarios
export const quickStartDefaultPageSubtitle: string = parsed.defaultPageSubtitle

export function parseQuickStartSteps(markdown: string) {
  return parseQuickStartMarkdown(markdown)
}

import { useEffect, useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import PageHeader from '@/components/ui/PageHeader'
import InlineHelpPanel, { HelpIconButton } from '@/components/ui/InlineHelpPanel'
import { getPageHelp } from '@/content/pageHelp'
import {
  usePageHelpWriterMode,
  getMarkdownWithOverride,
  QUICKSTART_OVERRIDE_STORAGE_KEY,
  AUTHORING_STORAGE_EVENT,
} from '@/content/authoringState'
import { parseQuickStartSteps, quickStartMarkdownDefault } from '@/pages/quickstart/content'

export default function QuickStartPage() {
  const writerMode = usePageHelpWriterMode()
  const pageHelp = getPageHelp('quick-start')
  const [pageHelpOpen, setPageHelpOpen] = useState(false)
  const [subtitleVersion, setSubtitleVersion] = useState(0)

  useEffect(() => {
    if (writerMode) setPageHelpOpen(true)
  }, [writerMode])

  useEffect(() => {
    const onStorage = () => setSubtitleVersion((v) => v + 1)
    window.addEventListener(AUTHORING_STORAGE_EVENT, onStorage)
    return () => window.removeEventListener(AUTHORING_STORAGE_EVENT, onStorage)
  }, [])

  const subtitleText = useMemo(() => {
    const md = getMarkdownWithOverride(quickStartMarkdownDefault, QUICKSTART_OVERRIDE_STORAGE_KEY)
    return parseQuickStartSteps(md).defaultPageSubtitle.trim()
  }, [subtitleVersion])

  return (
    <div>
      <PageHeader
        title={
          <>
            {(writerMode || pageHelp) && <HelpIconButton onClick={() => setPageHelpOpen((v) => !v)} size="lg" />}
            <span>Быстрый старт</span>
          </>
        }
        subtitle={
          subtitleText ? (
            <span className="text-sm text-gray-500">{subtitleText}</span>
          ) : undefined
        }
      />
      {(writerMode || pageHelp) && (
        <InlineHelpPanel
          content={pageHelp?.content ?? ''}
          marker="page:quick-start"
          markerTemplate="## Быстрый старт {#page:quick-start}"
          isOpen={pageHelpOpen}
          onClose={() => setPageHelpOpen(false)}
          isAuthoringMode={writerMode}
          className="-mt-4 mb-4"
        />
      )}
      <Outlet />
    </div>
  )
}

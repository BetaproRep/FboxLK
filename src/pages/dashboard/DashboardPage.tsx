import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import PageHeader from '@/components/ui/PageHeader'
import InlineHelpPanel, { HelpIconButton } from '@/components/ui/InlineHelpPanel'
import { getPageHelp } from '@/content/pageHelp'
import { usePageHelpWriterMode } from '@/content/authoringState'

export default function DashboardPage() {
  const writerMode = usePageHelpWriterMode()
  const pageHelp = getPageHelp('dashboard')
  const [pageHelpOpen, setPageHelpOpen] = useState(false)
  useEffect(() => {
    if (writerMode) setPageHelpOpen(true)
  }, [writerMode])

  return (
    <div>
      <PageHeader
        title={
          <>
            {(writerMode || pageHelp) && <HelpIconButton onClick={() => setPageHelpOpen((v) => !v)} size="lg" />}
            <span>Дашборд</span>
          </>
        }
      />
      {(writerMode || pageHelp) && (
        <InlineHelpPanel
          content={pageHelp?.content ?? ''}
          marker="page:dashboard"
          markerTemplate="## Дашборд {#page:dashboard}"
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

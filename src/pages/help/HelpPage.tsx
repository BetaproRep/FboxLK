import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import PageHeader from '@/components/ui/PageHeader'
import InlineHelpPanel, { HelpIconButton } from '@/components/ui/InlineHelpPanel'
import { getPageHelp } from '@/content/pageHelp'
import { usePageHelpWriterMode } from '@/content/authoringState'

export default function HelpPage() {
  const writerMode = usePageHelpWriterMode()
  const pageHelp = getPageHelp('help')
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
            <span>Справка</span>
          </>
        }
        subtitle={<span className="text-sm text-gray-500">Понятия и процессы фулфилмента</span>}
      />
      {(writerMode || pageHelp) && (
        <InlineHelpPanel
          content={pageHelp?.content ?? ''}
          marker="page:help"
          markerTemplate="## Справка {#page:help}"
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

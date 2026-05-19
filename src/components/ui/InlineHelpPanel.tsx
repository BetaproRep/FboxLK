import MarkdownView from '@/pages/help/components/MarkdownView'

interface Props {
  content: string
  marker: string
  markerTemplate?: string
  isOpen: boolean
  onClose: () => void
  isAuthoringMode?: boolean
  className?: string
}

interface HelpIconButtonProps {
  onClick: () => void
  className?: string
  title?: string
  size?: 'md' | 'lg'
  /** Для вложения в другую кнопку (вкладка): span вместо вложенного button. */
  asSpan?: boolean
}

export function HelpIconButton({
  onClick,
  className = '',
  title = 'Открыть пояснение',
  size = 'md',
  asSpan = false,
}: HelpIconButtonProps) {
  const sizeClass = size === 'lg' ? 'h-7 w-7' : 'h-6 w-6'
  const iconClass = size === 'lg' ? 'h-[18px] w-[18px]' : 'h-4 w-4'
  const sharedClass = `inline-flex ${sizeClass} shrink-0 items-center justify-center rounded text-gray-600 hover:bg-gray-100 hover:text-gray-800 ${className}`

  const icon = (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.55-1.165 1.86-2 3.272-2 1.933 0 3.5 1.567 3.5 3.5 0 1.34-.75 2.506-1.855 3.097-.417.223-.645.68-.645 1.153V15m-1 .5h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )

  if (asSpan) {
    return (
      <span
        role="button"
        tabIndex={0}
        title={title}
        aria-label={title}
        className={`cursor-pointer ${sharedClass}`}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            onClick()
          }
        }}
      >
        {icon}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={sharedClass}
      aria-label={title}
    >
      {icon}
    </button>
  )
}

export default function InlineHelpPanel({
  content,
  marker,
  markerTemplate,
  isOpen,
  onClose,
  isAuthoringMode = false,
  className = '',
}: Props) {
  if (!isOpen) return null

  const templateText = markerTemplate ?? marker
  const visibleContent = content.trim()
    ? content
    : 'Контекстная справка для этого места пока не заполнена. Добавьте раздел в page-help по шаблону ниже.'

  const copyMarker = async () => {
    try {
      await navigator.clipboard.writeText(templateText)
    } catch {}
  }

  return (
    <div className={className}>
      <div className="relative rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded text-amber-700 hover:bg-amber-100 hover:text-amber-800"
          aria-label="Закрыть пояснение"
          title="Закрыть"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <MarkdownView source={visibleContent} className="pr-10 text-sm" />

        {isAuthoringMode && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-dashed border-amber-300 bg-amber-100 px-2 py-1">
            <span className="text-[11px] text-gray-600">Шаблон заголовка: <code>{templateText}</code></span>
            <button
              type="button"
              onClick={copyMarker}
              className="text-[11px] text-amber-800 hover:text-amber-900"
            >
              Скопировать
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface Props {
  type: 'error' | 'success' | 'warning'
  message: string
  onClose: () => void
}

const styles = {
  error:   'bg-red-50 border-red-300 text-red-800',
  success: 'bg-green-50 border-green-300 text-green-800',
  warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
}

const icons = {
  error:   '✕',
  success: '✓',
  warning: '!',
}

export default function FormAlert({ type, message, onClose }: Props) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3 border rounded-lg text-sm ${styles[type]}`}>
      <span className="font-bold shrink-0 mt-px">{icons[type]}</span>
      <span className="flex-1">{message}</span>
      <button
        type="button"
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        onClick={onClose}
        aria-label="Закрыть"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

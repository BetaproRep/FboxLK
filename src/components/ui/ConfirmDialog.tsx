import { useEffect, useRef, useState } from 'react'

interface Props {
  isOpen: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  isOpen, title, description,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  variant = 'danger',
  onConfirm, onCancel,
}: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <p className="text-base font-semibold text-gray-900">{title}</p>
        {description && (
          <p className="mt-1.5 text-sm text-gray-500">{description}</p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button
            className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Хук ────────────────────────────────────────────────────────────────────

interface ConfirmOptions {
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
}

interface DialogState extends ConfirmOptions {
  isOpen: boolean
  title: string
  resolve: ((v: boolean) => void) | null
}

const CLOSED: DialogState = { isOpen: false, title: '', resolve: null }

export function useConfirmDialog() {
  const [state, setState] = useState<DialogState>(CLOSED)
  const stateRef = useRef(state)
  stateRef.current = state

  function confirm(title: string, options?: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      setState({ isOpen: true, title, resolve, ...options })
    })
  }

  function handleConfirm() {
    stateRef.current.resolve?.(true)
    setState(CLOSED)
  }

  function handleCancel() {
    stateRef.current.resolve?.(false)
    setState(CLOSED)
  }

  const confirmNode = (
    <ConfirmDialog
      isOpen={state.isOpen}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )

  return { confirm, confirmNode }
}

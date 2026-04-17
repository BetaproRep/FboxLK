import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

const DELAY_MS = 600

interface Props {
  text: string
  children: React.ReactNode
}

export default function Hint({ text, children }: Props) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, arrowLeft: 16 })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        const tooltipWidth = 288 // w-72
        const left = Math.min(rect.left, window.innerWidth - tooltipWidth - 8)
        const triggerCenter = rect.left + rect.width / 2
        const arrowLeft = Math.max(12, Math.min(triggerCenter - left, tooltipWidth - 12))
        setPos({ top: rect.bottom + 8, left, arrowLeft })
      }
      setVisible(true)
    }, DELAY_MS)
  }, [])

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  if (!text) return <>{children}</>

  return (
    <span ref={triggerRef} className="inline-block" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && createPortal(
        <div
          className="fixed z-[9999] w-72 pointer-events-none"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="absolute -top-1.5 w-3 h-3 bg-gray-800 rotate-45" style={{ left: pos.arrowLeft }} />
          <div className="relative bg-gray-800 rounded-md px-3 py-2 text-sm text-white shadow-lg normal-case tracking-normal font-normal">
            {text}
          </div>
        </div>,
        document.body
      )}
    </span>
  )
}

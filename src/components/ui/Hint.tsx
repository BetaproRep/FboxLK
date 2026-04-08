import { useState, useRef, useCallback } from 'react'

const DELAY_MS = 600

interface Props {
  text: string
  children: React.ReactNode
}

export default function Hint({ text, children }: Props) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), DELAY_MS)
  }, [])

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  if (!text) return <>{children}</>

  return (
    <div className="relative inline-block" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div className="absolute left-0 top-full mt-2 z-50 w-72 pointer-events-none">
          <div className="absolute -top-1.5 left-4 w-3 h-3 bg-gray-800 rotate-45" />
          <div className="relative bg-gray-800 rounded-md px-3 py-2 text-sm text-white shadow-lg normal-case tracking-normal font-normal">
            {text}
          </div>
        </div>
      )}
    </div>
  )
}

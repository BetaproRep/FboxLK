import { dict } from '@/constants/dict'
import type { UiKey } from '@/constants/dict'
import Hint from '@/components/ui/Hint'

export type PropItem = {
  dictKey: UiKey
  value: string | null | undefined
  ctx?: string
  newLine?: true
}

interface Props {
  items: PropItem[]
  className?: string
}

export default function PropList({ items, className = 'text-sm text-gray-500' }: Props) {
  let pendingNewLine = false
  const visible = items.flatMap(item => {
    if (item.newLine) pendingNewLine = true
    if (item.value == null || item.value === '') return []
    const result = pendingNewLine ? { ...item, newLine: true as const } : item
    pendingNewLine = false
    return [result]
  })
  if (!visible.length) return null
  return (
    <p className={className}>
      {visible.map((item, i) => {
        const label = dict(item.dictKey, 'short', item.ctx)
        const hint = dict(item.dictKey, 'hint', item.ctx)
        return (
          <span key={item.dictKey}>
            {i > 0 && item.newLine && <br />}
            <span className="inline-block whitespace-nowrap">
              <Hint text={hint}>{label}</Hint>:{' '}
              <span className="font-semibold text-gray-700">{item.value}</span>
              {i < visible.length - 1 && !visible[i + 1]?.newLine && <span className="mx-2 text-gray-300">·</span>}
            </span>
          </span>
        )
      })}
    </p>
  )
}

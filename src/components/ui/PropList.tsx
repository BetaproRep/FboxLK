import { Link } from 'react-router-dom'
import { dict } from '@/constants/dict'
import type { UiKey } from '@/constants/dict'
import Hint from '@/components/ui/Hint'

type ValueColor = 'red' | 'yellow' | 'green' | 'blue' | 'gray'

const colorClass: Record<ValueColor, string> = {
  red: 'text-red-600',
  yellow: 'text-yellow-600',
  green: 'text-green-600',
  blue: 'text-blue-600',
  gray: 'text-gray-400',
}

export type PropItem = {
  dictKey: UiKey
  value: string | null | undefined
  ctx?: string
  newLine?: true
  href?: string
  onClick?: () => void
  valueColor?: ValueColor
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
        const valueBase = `font-semibold ${item.valueColor ? colorClass[item.valueColor] : 'text-gray-700'}`
        const valueNode = item.href ? (
          <Link to={item.href} className={`${valueBase} underline hover:opacity-70`}>
            {item.value}
          </Link>
        ) : item.onClick ? (
          <button type="button" onClick={item.onClick} className={`${valueBase} underline hover:opacity-70 cursor-pointer`}>
            {item.value}
          </button>
        ) : (
          <span className={valueBase}>{item.value}</span>
        )
        return (
          <span key={item.dictKey}>
            {i > 0 && item.newLine && <br />}
            <span className="inline-block whitespace-nowrap">
              <Hint text={hint}>{label}</Hint>:{' '}
              {valueNode}
              {i < visible.length - 1 && !visible[i + 1]?.newLine && <span className="mx-2 text-gray-300">·</span>}
            </span>
          </span>
        )
      })}
    </p>
  )
}

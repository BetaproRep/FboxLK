import { dictEnum } from '@/constants/dict'

const STATE_COLORS: Record<string, string> = {
  wait:     'bg-yellow-100 text-yellow-700',
  canceled: 'bg-gray-100 text-gray-500',
  inwork:   'bg-blue-100 text-blue-700',
  shipped:  'bg-green-100 text-green-700',
}

interface Props {
  state: string
  className?: string
}

export default function OrderStateBadge({ state, className }: Props) {
  return (
    <span className={`badge ${STATE_COLORS[state] ?? 'bg-gray-100 text-gray-600'} ${className ?? ''}`}>
      {dictEnum('order_state', state)}
    </span>
  )
}

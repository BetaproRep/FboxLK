const STATE_COLORS: Record<number, string> = {
  1: 'bg-yellow-100 text-yellow-700',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-green-100 text-green-700',
}

interface Props {
  state: number
  descrip: string
  className?: string
}

export default function IndocStateBadge({ state, descrip, className }: Props) {
  return (
    <span className={`badge ${STATE_COLORS[state] ?? 'bg-gray-100 text-gray-600'} ${className ?? ''}`}>
      {descrip}
    </span>
  )
}

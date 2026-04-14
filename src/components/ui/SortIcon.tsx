type SortDir = 'asc' | 'desc'

export default function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`ml-1 inline-block text-xs ${active ? 'text-primary-600' : 'text-gray-300'}`}>
      {active && dir === 'desc' ? '▼' : '▲'}
    </span>
  )
}

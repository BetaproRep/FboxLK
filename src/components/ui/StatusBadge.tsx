interface Props {
  status: string
  label: string
}

const colorMap: Record<string, string> = {
  // Входящие / исходящие
  new: 'bg-blue-100 text-blue-800',
  processing: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  done: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  // fallback
  default: 'bg-gray-100 text-gray-700',
}

export default function StatusBadge({ status, label }: Props) {
  const cls = colorMap[status] ?? colorMap.default
  return <span className={`badge ${cls}`}>{label}</span>
}

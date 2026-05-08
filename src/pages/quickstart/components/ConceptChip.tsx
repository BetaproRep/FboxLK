import { Link } from 'react-router-dom'
import type { ConceptRef } from '../content'

interface Props {
  concept: ConceptRef
}

export default function ConceptChip({ concept }: Props) {
  return (
    <Link
      to={concept.to}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 text-xs font-medium transition-colors"
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {concept.label}
    </Link>
  )
}

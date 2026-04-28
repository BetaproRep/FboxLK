import { Link } from 'react-router-dom'

export type OutdocRef = {
  outdoc_id: number
  outdoc_type_descrip: string
  created_at: string
}

function OutdocsInner({ outdocs }: { outdocs: OutdocRef[] }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1">
      {outdocs.map((od) => (
        <span key={od.outdoc_id} className="flex items-center gap-1.5 text-xs text-gray-500">
          <Link
            to={`/outdocs/${od.outdoc_id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-primary-600 font-medium hover:underline"
          >
            {od.outdoc_type_descrip}
          </Link>
          <span>{new Date(od.created_at).toLocaleString()}</span>
        </span>
      ))}
    </div>
  )
}

export function OutdocsRow({ outdocs, colSpan }: { outdocs?: OutdocRef[]; colSpan: number }) {
  if (!outdocs?.length) return null
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 pt-0 pb-1 bg-white group-hover:bg-gray-50 transition-colors">
        <OutdocsInner outdocs={outdocs} />
      </td>
    </tr>
  )
}

export function OutdocsBlock({ outdocs }: { outdocs?: OutdocRef[] }) {
  if (!outdocs?.length) return null
  return <OutdocsInner outdocs={outdocs} />
}

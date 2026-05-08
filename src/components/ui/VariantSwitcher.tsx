import { NavLink, useLocation } from 'react-router-dom'

export interface VariantOption {
  to: string
  label: string
  description?: string
}

interface Props {
  options: VariantOption[]
  basePath: string
}

export default function VariantSwitcher({ options, basePath }: Props) {
  const location = useLocation()
  const active = options.find((opt) => location.pathname.startsWith(`${basePath}/${opt.to}`))

  return (
    <div className="mb-6">
      <div className="inline-flex rounded-lg bg-gray-100 p-1">
        {options.map((opt) => (
          <NavLink
            key={opt.to}
            to={`${basePath}/${opt.to}`}
            className={({ isActive }) =>
              `px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`
            }
          >
            {opt.label}
          </NavLink>
        ))}
      </div>
      {active?.description && (
        <p className="mt-2 text-sm text-gray-500">{active.description}</p>
      )}
    </div>
  )
}

interface Props {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
}

export default function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">{title}</h1>
        {subtitle && <div className="mt-1">{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-3 mt-1">{actions}</div>}
    </div>
  )
}

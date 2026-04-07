interface Props {
  dateFrom: string
  dateTo: string
  onDateFromChange: (v: string) => void
  onDateToChange: (v: string) => void
  disabled?: boolean
}

export default function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  disabled,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => onDateFromChange(e.target.value)}
        className="input w-40"
        disabled={disabled}
      />
      <span className="text-gray-400 text-sm">—</span>
      <input
        type="date"
        value={dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
        className="input w-40"
        disabled={disabled}
      />
    </div>
  )
}

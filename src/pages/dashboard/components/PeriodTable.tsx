import type { DashboardTableRow, PeriodKey } from '@/api/dashboard'
import { fmt } from '../utils/fmt'

interface Props {
  title: string
  rows: DashboardTableRow[]
  unitsHint?: string
}

const COLS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'today',      label: 'Сегодня' },
  { key: 'this_week',  label: 'Неделя' },
  { key: 'prev_week',  label: 'Пр. неделя' },
  { key: 'this_month', label: 'Месяц' },
  { key: 'prev_month', label: 'Пр. месяц' },
]

export default function PeriodTable({ title, rows, unitsHint }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {unitsHint && <span className="text-xs text-gray-500">{unitsHint}</span>}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-4 py-2.5 text-left font-medium text-gray-500" />
            {COLS.map((c) => (
              <th key={c.key} className="px-4 py-2.5 text-right font-medium text-gray-500">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.key} className={idx < rows.length - 1 ? 'border-b border-gray-100' : ''}>
              <td className="px-4 py-2.5 text-gray-600">{row.label}</td>
              {COLS.map((c) => {
                const v = row.values[c.key] ?? 0
                return (
                  <td
                    key={c.key}
                    className={
                      'px-4 py-2.5 text-right tabular-nums ' +
                      (v < 0 ? 'text-red-600' : 'text-gray-900')
                    }
                  >
                    {fmt(v)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

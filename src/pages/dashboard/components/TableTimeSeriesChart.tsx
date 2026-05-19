import { useId, useState } from 'react'
import type { DashboardTableRow } from '@/api/dashboard'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fmt } from '../utils/fmt'
import { applyEma } from '../utils/ema'
import { getSeriesColor } from '../utils/seriesPalette'

interface Props {
  rows: DashboardTableRow[]
  mergeWithPrevious?: boolean
}

function formatShortDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

export default function TableTimeSeriesChart({
  rows,
  mergeWithPrevious = false,
}: Props) {
  const [smoothingAlpha, setSmoothingAlpha] = useState(0.9)
  const alphaControlId = useId()
  const rowsWithSeries = rows.filter((row) => (row.time_series?.length ?? 0) > 0)
  if (rowsWithSeries.length === 0) return null

  const allDates = Array.from(
    new Set(rowsWithSeries.flatMap((row) => row.time_series?.map((p) => p.date) ?? [])),
  ).sort()

  if (allDates.length === 0) return null

  const rawByRowKey: Record<string, Array<number | null>> = {}
  rowsWithSeries.forEach((row) => {
    const byDate = new Map((row.time_series ?? []).map((p) => [p.date, p.value]))
    // Даты, которых нет в ответе API для этого ряда, считаем нулём (а не пропуском).
    rawByRowKey[row.key] = allDates.map((date) => byDate.get(date) ?? 0)
  })

  const smoothedByRowKey: Record<string, Array<number | null>> = {}
  rowsWithSeries.forEach((row) => {
    smoothedByRowKey[row.key] = applyEma(rawByRowKey[row.key], smoothingAlpha)
  })
  const rowOrderByKey = new Map(rowsWithSeries.map((row, idx) => [row.key, idx]))

  const chartData = allDates.map((date, idx) => {
    const point: Record<string, number | null | string> = { date }
    rowsWithSeries.forEach((row) => {
      point[row.key] = smoothedByRowKey[row.key][idx]
      point[`${row.key}__raw`] = rawByRowKey[row.key][idx]
    })
    return point
  })

  return (
    <div
      className={
        'bg-white border border-gray-200 px-4 py-3 ' +
        (mergeWithPrevious ? 'rounded-b-lg rounded-t-none border-t-0' : 'rounded-lg')
      }
    >
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis
              tickFormatter={(v) => fmt(Number(v))}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <Tooltip
              itemSorter={(item) => rowOrderByKey.get(String(item.dataKey ?? '')) ?? Number.MAX_SAFE_INTEGER}
              formatter={(v, _name, item) => {
                const dataKey = String(item.dataKey ?? '')
                const rawKey = `${dataKey}__raw`
                const rawValue = item.payload?.[rawKey]
                const valueToShow = typeof rawValue === 'number' ? rawValue : Number(v)
                return fmt(valueToShow)
              }}
              labelFormatter={(label) => formatShortDate(String(label))}
              contentStyle={{
                borderColor: '#e5e7eb',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 2px rgb(0 0 0 / 0.06)',
              }}
            />

            {rowsWithSeries.map((row, idx) => (
              <Line
                key={row.key}
                type="monotone"
                dataKey={row.key}
                name={row.label}
                stroke={getSeriesColor(idx)}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs text-gray-500">
        <label htmlFor={alphaControlId} className="font-normal text-gray-500">
          Сглаживание графиков
        </label>
        <input
          id={alphaControlId}
          type="range"
          min={0.01}
          max={0.999}
          step={0.001}
          value={smoothingAlpha}
          onChange={(e) => setSmoothingAlpha(Number(e.target.value))}
          className="w-44 accent-gray-400 opacity-80 transition-opacity hover:opacity-100"
          title="Большие значения позволяют на графике увидеть больше деталей. Маленькие значения позволяют на графике увидеть тенденции."
        />
        <span className="tabular-nums text-gray-500">{smoothingAlpha.toFixed(3)}</span>
      </div>
    </div>
  )
}

const SERIES_COLORS = [
  '#0ea5e9',
  '#22c55e',
  '#eab308',
  '#8b5cf6',
  '#ef4444',
  '#14b8a6',
  '#f97316',
  '#6366f1',
] as const

export function getSeriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length]
}

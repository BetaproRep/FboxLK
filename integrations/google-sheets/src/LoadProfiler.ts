export interface LoadProfileLine {
  label: string
  stepMs: number
  totalMs: number
}

/** Поэтапные замеры загрузки отчёта (Logger + опциональный статус в сайдбаре). */
export class LoadProfiler {
  private readonly startedAt = Date.now()

  private lastAt = this.startedAt

  private readonly lines: LoadProfileLine[] = []

  constructor(private readonly onProgress?: (message: string) => void) {}

  mark(label: string, progressMessage?: string): void {
    const now = Date.now()
    const line: LoadProfileLine = {
      label,
      stepMs: now - this.lastAt,
      totalMs: now - this.startedAt,
    }
    this.lines.push(line)
    this.lastAt = now
    Logger.log(`[FBox profile] ${line.label}: +${line.stepMs} ms (Σ ${line.totalMs} ms)`)
    if (progressMessage) {
      this.onProgress?.(progressMessage)
    }
  }

  getLines(): LoadProfileLine[] {
    return this.lines.slice()
  }

  formatSummary(): string[] {
    return this.lines.map(
      (line) => `${line.label}: +${(line.stepMs / 1000).toFixed(1)} с (Σ ${(line.totalMs / 1000).toFixed(1)} с)`,
    )
  }
}

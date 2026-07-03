import { LAST_REPORT_ID_KEY, PARAMS_KEY_PREFIX } from './config'

function keyForReport(reportId: number): string {
  return `${PARAMS_KEY_PREFIX}${reportId}`
}

export function saveReportParams(
  reportId: number,
  params: Record<string, unknown>,
): void {
  PropertiesService.getUserProperties().setProperty(
    keyForReport(reportId),
    JSON.stringify(params),
  )
}

export function loadReportParams(reportId: number): Record<string, unknown> | null {
  const raw = PropertiesService.getUserProperties().getProperty(keyForReport(reportId))
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

export function saveLastReportId(reportId: number): void {
  PropertiesService.getUserProperties().setProperty(LAST_REPORT_ID_KEY, String(reportId))
}

export function loadLastReportId(): number | null {
  const raw = PropertiesService.getUserProperties().getProperty(LAST_REPORT_ID_KEY)
  if (!raw) {
    return null
  }
  const id = Number(raw)
  return Number.isFinite(id) && id > 0 ? id : null
}

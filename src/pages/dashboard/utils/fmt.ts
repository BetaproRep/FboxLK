/**
 * Format a number for the dashboard: Russian locale with a regular space as
 * thousands separator (toLocaleString uses a non-breaking space by default,
 * which renders inconsistently across browsers and copy-paste targets).
 */
export function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/\u00A0/g, ' ')
}

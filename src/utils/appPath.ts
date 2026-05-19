/** Vite `base` (e.g. `/accounts/`). Trailing slash is always present. */
export const APP_BASE = import.meta.env.BASE_URL

/** Absolute in-app path respecting Vite `base` (e.g. `login` → `/accounts/login`). */
export function appPath(relativePath: string): string {
  const segment = relativePath.replace(/^\//, '')
  return `${APP_BASE}${segment}`
}

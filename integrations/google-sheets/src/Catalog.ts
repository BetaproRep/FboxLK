import { CATALOG_CACHE_SECONDS } from './config'
import { fetchCatalog } from './ApiClient'
import type { ReportCatalogEntry } from './types'

const CACHE_KEY = 'fbox_reports_catalog_v1'

export function getCatalogCached(): ReportCatalogEntry[] {
  const cache = CacheService.getDocumentCache()
  const cached = cache?.get(CACHE_KEY)
  if (cached) {
    return JSON.parse(cached) as ReportCatalogEntry[]
  }

  const catalog = fetchCatalog()
  cache?.put(CACHE_KEY, JSON.stringify(catalog), CATALOG_CACHE_SECONDS)
  return catalog
}

export function putCatalogCache(catalog: ReportCatalogEntry[]): void {
  CacheService.getDocumentCache()?.put(
    CACHE_KEY,
    JSON.stringify(catalog),
    CATALOG_CACHE_SECONDS,
  )
}

export function refreshCatalogCache(): ReportCatalogEntry[] {
  CacheService.getDocumentCache()?.remove(CACHE_KEY)
  const catalog = fetchCatalog()
  putCatalogCache(catalog)
  return catalog
}

export function clearCatalogCache(): void {
  CacheService.getDocumentCache()?.remove(CACHE_KEY)
}

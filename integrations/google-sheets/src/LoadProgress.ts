import { LOAD_PROGRESS_KEY } from './config'

const TTL_SECONDS = 120

export function setLoadProgress(message: string): void {
  CacheService.getDocumentCache()?.put(LOAD_PROGRESS_KEY, message, TTL_SECONDS)
}

export function getLoadProgress(): string {
  return CacheService.getDocumentCache()?.get(LOAD_PROGRESS_KEY) ?? ''
}

export function clearLoadProgress(): void {
  CacheService.getDocumentCache()?.remove(LOAD_PROGRESS_KEY)
}

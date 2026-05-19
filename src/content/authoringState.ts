import { useEffect, useState } from 'react'

export const HELP_OVERRIDE_STORAGE_KEY = 'help_markdown_override_v1'
export const QUICKSTART_OVERRIDE_STORAGE_KEY = 'quickstart_markdown_override_v1'
export const PAGE_HELP_OVERRIDE_STORAGE_KEY = 'page_help_markdown_override_v1'
export const PAGE_HELP_WRITER_MODE_KEY = 'page_help_writer_mode_v1'
export const AUTHORING_STORAGE_EVENT = 'authoring-storage-changed'

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function safeGet(key: string): string | null {
  if (!isBrowser()) return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function emitAuthoringChange() {
  if (!isBrowser()) return
  window.dispatchEvent(new Event(AUTHORING_STORAGE_EVENT))
}

export function setMarkdownOverride(key: string, value: string) {
  if (!isBrowser()) return
  window.localStorage.setItem(key, value)
  emitAuthoringChange()
}

export function clearMarkdownOverride(key: string) {
  if (!isBrowser()) return
  window.localStorage.removeItem(key)
  emitAuthoringChange()
}

export function getMarkdownWithOverride(defaultValue: string, key: string): string {
  const overridden = safeGet(key)
  return overridden ?? defaultValue
}

export function getPageHelpWriterMode(): boolean {
  return safeGet(PAGE_HELP_WRITER_MODE_KEY) === '1'
}

export function setPageHelpWriterMode(enabled: boolean) {
  if (!isBrowser()) return
  if (enabled) {
    window.localStorage.setItem(PAGE_HELP_WRITER_MODE_KEY, '1')
  } else {
    window.localStorage.removeItem(PAGE_HELP_WRITER_MODE_KEY)
  }
  emitAuthoringChange()
}

export function usePageHelpWriterMode(): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => getPageHelpWriterMode())

  useEffect(() => {
    const update = () => setEnabled(getPageHelpWriterMode())
    window.addEventListener('storage', update)
    window.addEventListener(AUTHORING_STORAGE_EVENT, update)
    return () => {
      window.removeEventListener('storage', update)
      window.removeEventListener(AUTHORING_STORAGE_EVENT, update)
    }
  }, [])

  return enabled
}

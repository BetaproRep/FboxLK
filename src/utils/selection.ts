export function isTextSelected(): boolean {
  return !!window.getSelection()?.toString()
}

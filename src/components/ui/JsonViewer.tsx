/**
 * Lightweight JSON viewer with syntax highlighting.
 * No external dependencies — uses CSS classes and a simple tokenizer.
 */

function highlight(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = 'text-blue-600'        // number
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'text-purple-700 font-medium' : 'text-green-700'  // key or string
        } else if (/true|false/.test(match)) {
          cls = 'text-orange-600'
        } else if (/null/.test(match)) {
          cls = 'text-gray-400'
        }
        return `<span class="${cls}">${match}</span>`
      }
    )
}

interface JsonViewerProps {
  data: unknown
  maxHeight?: string
}

export default function JsonViewer({ data, maxHeight = '600px' }: JsonViewerProps) {
  const json = JSON.stringify(data, null, 2)
  return (
    <pre
      className="text-xs bg-gray-50 rounded-lg p-4 overflow-auto font-mono leading-relaxed"
      style={{ maxHeight }}
      dangerouslySetInnerHTML={{ __html: highlight(json) }}
    />
  )
}

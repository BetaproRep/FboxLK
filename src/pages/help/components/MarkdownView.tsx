import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkAttrs from 'remark-attrs'
import rehypeSlug from 'rehype-slug'

interface Props {
  source: string
  className?: string
}

/**
 * Единый рендерер markdown для глоссария.
 * - rehype-slug автоматически проставляет id заголовкам (для якорей `/help#...`).
 * - remark-gfm добавляет таблицы, чекбоксы, zebra-списки.
 * - Tailwind-стили заголовков/абзацев заданы вручную, чтобы не зависеть от
 *   typography-плагина.
 */
export default function MarkdownView({ source, className = '' }: Props) {
  return (
    <div className={`md-content text-gray-800 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkAttrs]}
        rehypePlugins={[rehypeSlug]}
        components={{
          h1: (props) => <h1 className="scroll-mt-24 text-2xl font-bold text-gray-900 mt-10 mb-4 first:mt-0" {...props} />,
          h2: (props) => <h2 className="scroll-mt-24 text-xl font-semibold text-gray-900 mt-8 mb-3" {...props} />,
          h3: (props) => <h3 className="scroll-mt-24 text-lg font-semibold text-gray-900 mt-6 mb-2" {...props} />,
          h4: (props) => <h4 className="scroll-mt-24 text-base font-semibold text-gray-900 mt-4 mb-2" {...props} />,
          p:  (props) => <p className="text-sm leading-6 text-gray-700 mb-3" {...props} />,
          ul: (props) => <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700 mb-3" {...props} />,
          ol: (props) => <ol className="list-decimal pl-6 space-y-1 text-sm text-gray-700 mb-3" {...props} />,
          li: (props) => <li className="leading-6" {...props} />,
          code: (props) => <code className="px-1 py-0.5 rounded bg-gray-100 text-[0.85em] font-mono text-gray-800" {...props} />,
          a: (props) => <a className="text-primary-700 hover:underline" {...props} />,
          blockquote: (props) => (
            <blockquote className="border-l-4 border-primary-200 pl-4 italic text-gray-600 my-3" {...props} />
          ),
          table: (props) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border border-gray-200 text-sm" {...props} />
            </div>
          ),
          th: (props) => <th className="px-3 py-2 bg-gray-50 border border-gray-200 text-left font-medium" {...props} />,
          td: (props) => <td className="px-3 py-2 border border-gray-200" {...props} />,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}

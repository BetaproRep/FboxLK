import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkAttrs from 'remark-attrs'
import rehypeSlug from 'rehype-slug'

function isInternalAppPath(href: string | undefined): href is string {
  return typeof href === 'string' && href.startsWith('/') && !href.startsWith('//')
}

interface Props {
  source: string
  className?: string
}

function mergeClass(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

/**
 * Markdown для тел карточек быстрого старта.
 * Ссылки: `{.qs-concept}` — стиль «понятия», `{.qs-cta}` — кнопка-действие.
 */
export default function QuickStartMarkdownView({ source, className = '' }: Props) {
  return (
    <div className={`md-content text-gray-800 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkAttrs]}
        rehypePlugins={[rehypeSlug]}
        components={{
          h1: (props) => <h1 className="scroll-mt-24 text-xl font-bold text-gray-900 mt-6 mb-3 first:mt-0" {...props} />,
          h2: (props) => <h2 className="scroll-mt-24 text-lg font-semibold text-gray-900 mt-5 mb-2" {...props} />,
          h3: (props) => <h3 className="scroll-mt-24 text-base font-semibold text-gray-900 mt-4 mb-2" {...props} />,
          h4: (props) => <h4 className="scroll-mt-24 text-sm font-semibold text-gray-900 mt-3 mb-1" {...props} />,
          p: (props) => <p className="text-sm leading-6 text-gray-700 mb-3" {...props} />,
          ul: (props) => <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700 mb-3" {...props} />,
          ol: (props) => <ol className="list-decimal pl-6 space-y-1 text-sm text-gray-700 mb-3" {...props} />,
          li: (props) => <li className="leading-6" {...props} />,
          code: (props) => (
            <code className="px-1 py-0.5 rounded bg-gray-100 text-[0.85em] font-mono text-gray-800" {...props} />
          ),
          a: ({ href, children, title, className: linkClass }) => {
            const extra = typeof linkClass === 'string' ? linkClass : ''
            const concept = /\bqs-concept\b/.test(extra)
            const cta = /\bqs-cta\b/.test(extra)
            if (concept && isInternalAppPath(href)) {
              return (
                <Link
                  to={href}
                  title={title}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 text-xs font-medium transition-colors mx-0.5 my-0.5"
                >
                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {children}
                </Link>
              )
            }
            if (concept) {
              return (
                <a
                  href={href}
                  title={title}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 text-xs font-medium mx-0.5 my-0.5"
                >
                  {children}
                </a>
              )
            }
            if (cta && isInternalAppPath(href)) {
              return (
                <Link
                  to={href}
                  title={title}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors my-2"
                >
                  {children}
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              )
            }
            if (cta) {
              return (
                <a
                  href={href}
                  title={title}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 my-2"
                >
                  {children}
                </a>
              )
            }
            const base = 'text-primary-700 hover:underline'
            return isInternalAppPath(href) ? (
              <Link to={href} className={mergeClass(base, extra)} title={title}>
                {children}
              </Link>
            ) : (
              <a className={mergeClass(base, extra)} href={href} title={title}>
                {children}
              </a>
            )
          },
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

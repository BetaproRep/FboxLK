import { useAuth } from '@/store/auth'
import ReactMarkdown from 'react-markdown'

interface HeaderProps {
  contactInfo?: string
}

export default function Header({ contactInfo }: HeaderProps) {
  const { partnerId, clearCredentials } = useAuth()

  return (
    <header className="min-h-16 bg-white border-b border-gray-200 flex items-center justify-between gap-6 px-6 py-2">
      <div className="min-w-0 flex-1 text-left">
        {contactInfo ? (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="m-0 text-sm leading-5 text-gray-600">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold text-gray-800">{children}</strong>,
            }}
          >
            {contactInfo}
          </ReactMarkdown>
        ) : null}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">
          Партнёр: <span className="font-medium text-gray-900">{partnerId}</span>
        </span>
        <button
          onClick={clearCredentials}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          Выйти
        </button>
      </div>
    </header>
  )
}

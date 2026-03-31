import { useAuth } from '@/store/auth'

export default function Header() {
  const { partnerId, clearCredentials } = useAuth()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div />
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

import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/store/auth'
import { apiClient } from '@/api/client'
import Spinner from '@/components/ui/Spinner'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setCredentials } = useAuth()
  const [partnerId, setPartnerId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Set credentials first, then test with /settings
      setCredentials(partnerId.trim(), password)
      await apiClient.get('/settings')
      navigate('/')
    } catch {
      setError('Неверный код партнёра или пароль')
      // Clear credentials on failure
      import('@/store/auth').then(({ clearCredentials }) => clearCredentials())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="card w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">FBox</h1>
          <p className="mt-2 text-sm text-gray-500">Личный кабинет клиента</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Код партнёра
            </label>
            <input
              type="text"
              className="input"
              placeholder="partner_id"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Пароль
            </label>
            <input
              type="password"
              className="input"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
            {loading && <Spinner className="w-4 h-4 text-white" />}
            Войти
          </button>
        </form>
      </div>
    </div>
  )
}

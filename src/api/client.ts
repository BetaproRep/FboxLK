import axios from 'axios'
import toast from 'react-hot-toast'
import { getBasicAuth, clearCredentials } from '@/store/auth'

export const apiClient = axios.create({
  // baseURL: 'https://lpw.betta.ru:8084/grh/api',
  baseURL: 'http://lpwtst.betta.ru:8084/grh/api',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = getBasicAuth()
  if (token) {
    config.headers.Authorization = `Basic ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    // API returns success:false with HTTP 200 for business errors
    const data = response.data
    if (data && data.success === false) {
      const message = data.error_message ?? 'Ошибка API'
      const error = Object.assign(new Error(message), {
        errorCode: data.error_code,
        status: response.status,
      })
      return Promise.reject(error)
    }
    return response
  },
  (error) => {
    const status = error.response?.status
    const message = error.response?.data?.error_message ?? error.message

    if (status === 401 || status === 403) {
      clearCredentials()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (status === 429) {
      toast.error('Превышен лимит запросов. Попробуйте позже.')
    } else if (status >= 500) {
      toast.error('Ошибка сервера. Попробуйте позже.')
    } else {
      toast.error(message)
    }

    return Promise.reject(
      Object.assign(new Error(message), { status })
    )
  }
)

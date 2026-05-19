import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        const err = error as { status?: number }
        if (err?.status === 401 || err?.status === 403) return false
        return failureCount < 2
      },
      staleTime: 30_000,
    },
  },
})

/** Сброс кэша API и UI-состояния списков при смене или выходе из аккаунта. */
export function resetAccountCache() {
  queryClient.clear()
  sessionStorage.clear()
}

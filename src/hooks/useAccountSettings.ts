import { useQuery } from '@tanstack/react-query'
import { fetchSettings } from '@/api/settings'

export const accountSettingsQueryKey = ['account-settings'] as const

export function useAccountSettings() {
  return useQuery({
    queryKey: accountSettingsQueryKey,
    queryFn: fetchSettings,
  })
}

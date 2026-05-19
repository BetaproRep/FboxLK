import { apiClient } from './client'

export interface FulfillmentSettings {
  logo_url?: string
  contact_info?: string
}

export interface AccountSettings {
  fulfillment?: FulfillmentSettings
}

interface SettingsResponse extends AccountSettings {
  success: boolean
}

export async function fetchSettings(): Promise<AccountSettings> {
  const { data } = await apiClient.get<SettingsResponse>('/settings')
  return {
    fulfillment: data.fulfillment,
  }
}

/** Проверка логина/пароля на странице входа — без редиректа на /login при 401. */
export async function validateLoginCredentials(): Promise<AccountSettings> {
  const { data } = await apiClient.get<SettingsResponse>('/settings', {
    skipAuthRedirect: true,
  } as Record<string, unknown>)
  return {
    fulfillment: data.fulfillment,
  }
}

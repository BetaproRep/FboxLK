import { AUTH_PARTNER_KEY, AUTH_PROPERTY_KEY } from './config'

export function getAuthorizationHeader(): string | null {
  const raw = PropertiesService.getUserProperties().getProperty(AUTH_PROPERTY_KEY)
  if (!raw) {
    return null
  }
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }
  return trimmed.toLowerCase().startsWith('basic ') ? trimmed : `Basic ${trimmed}`
}

export function setAuthorization(partnerId: string, password: string): void {
  const token = Utilities.base64Encode(`${partnerId}:${password}`, Utilities.Charset.UTF_8)
  const props = PropertiesService.getUserProperties()
  props.setProperty(AUTH_PROPERTY_KEY, `Basic ${token}`)
  props.setProperty(AUTH_PARTNER_KEY, partnerId.trim())
}

export function clearAuthorization(): void {
  const props = PropertiesService.getUserProperties()
  props.deleteProperty(AUTH_PROPERTY_KEY)
  props.deleteProperty(AUTH_PARTNER_KEY)
}

export function hasAuthorization(): boolean {
  return getAuthorizationHeader() !== null
}

export function getPartnerIdHint(): string | null {
  return PropertiesService.getUserProperties().getProperty(AUTH_PARTNER_KEY)
}

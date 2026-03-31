import { useState, useEffect } from 'react'

const STORAGE_KEY = 'fbox_auth'

interface AuthState {
  partnerId: string
  password: string
}

function getStored(): AuthState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Module-level state (simple singleton, no context needed for small app)
let _state: AuthState | null = getStored()
const _listeners = new Set<() => void>()

function notify() {
  _listeners.forEach((fn) => fn())
}

export function setCredentials(partnerId: string, password: string) {
  _state = { partnerId, password }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(_state))
  notify()
}

export function clearCredentials() {
  _state = null
  localStorage.removeItem(STORAGE_KEY)
  notify()
}

export function getCredentials(): AuthState | null {
  return _state
}

export function getBasicAuth(): string | null {
  if (!_state) return null
  return btoa(`${_state.partnerId}:${_state.password}`)
}

export function useAuth() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const rerender = () => setTick((n) => n + 1)
    _listeners.add(rerender)
    return () => { _listeners.delete(rerender) }
  }, [])

  return {
    isAuthenticated: _state !== null,
    partnerId: _state?.partnerId ?? null,
    setCredentials,
    clearCredentials,
  }
}

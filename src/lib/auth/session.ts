// /Users/salvacastro/Desktop/maxikiosco/src/lib/auth/session.ts
export type RolNombre = 'cajero' | 'encargado' | 'dueno' | 'superadmin' | string

export type SessionUser = {
    id_usuario?: string
    nombre?: string
    apellido?: string
    email?: string
    // Puede venir como string o como objeto { nombre, nivel, ... }
    rol?: any
    id_sede?: string
}

export type SessionData = {
    // si tu backend es cookie-only, podemos usar "cookie" como placeholder
    access_token: string
    user?: SessionUser
}

export const SESSION_KEY = 'mk_session'
export const SESSION_EVENT_NAME = 'mk_session_changed'

function emitSessionChanged() {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new Event(SESSION_EVENT_NAME))
}

export function getSession(): SessionData | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = window.localStorage.getItem(SESSION_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as SessionData
        if (!parsed?.access_token) return null
        return parsed
    } catch {
        return null
    }
}

export function setSession(data: SessionData) {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(data))
    emitSessionChanged()
}

export function clearSession() {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(SESSION_KEY)
    emitSessionChanged()
}
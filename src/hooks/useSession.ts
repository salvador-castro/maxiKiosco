// /Users/salvacastro/Desktop/maxikiosco/src/hooks/useSession.ts
'use client'

import { useEffect, useState } from 'react'
import {
    clearSession,
    getSession,
    type SessionData,
    SESSION_EVENT_NAME,
    SESSION_KEY,
} from '@/lib/auth/session'

export function useSession() {
    const [session, setSessionState] = useState<SessionData | null>(null)
    const [ready, setReady] = useState(false)

    function load() {
        setSessionState(getSession())
    }

    useEffect(() => {
        load()
        setReady(true)

        // Cambios desde otras pestañas
        function onStorage(e: StorageEvent) {
            if (e.key === SESSION_KEY) load()
        }

        // Cambios en esta misma pestaña (setSession/clearSession)
        function onSessionChanged() {
            load()
        }

        window.addEventListener('storage', onStorage)
        window.addEventListener(SESSION_EVENT_NAME, onSessionChanged)

        return () => {
            window.removeEventListener('storage', onStorage)
            window.removeEventListener(SESSION_EVENT_NAME, onSessionChanged)
        }
    }, [])

    const logout = () => {
        clearSession()
        setSessionState(null)
    }

    return {
        ready,
        session,
        user: session?.user ?? null,
        token: session?.access_token ?? null,
        isLoggedIn: !!session?.access_token,
        logout,
        refresh: load,
    }
}

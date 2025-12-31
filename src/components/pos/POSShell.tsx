// /Users/salvacastro/Desktop/maxikiosco/src/components/pos/POSShell.tsx
'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import LayoutPOS from '@/components/layout/LayoutPOS'

export default function POSShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { ready, isLoggedIn } = useSession()

  useEffect(() => {
    if (ready && !isLoggedIn) {
      router.replace('/login')
    }
  }, [ready, isLoggedIn, router])

  // Show loading state while checking session
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-slate-400">Cargando...</div>
      </div>
    )
  }

  // Don't render content if not logged in (will redirect)
  if (!isLoggedIn) {
    return null
  }

  return <LayoutPOS>{children}</LayoutPOS>
}

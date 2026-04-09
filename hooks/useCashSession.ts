'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CashSession, CashRegister } from '@/types/database'

export interface ActiveSession extends CashSession {
  cash_registers: CashRegister & { branch_id: string; name: string }
}

export function useCashSession() {
  const [session, setSession] = useState<ActiveSession | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('cash_sessions')
      .select('*, cash_registers(*)')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setSession(data as ActiveSession | null)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return { session, loading, refresh: load }
}

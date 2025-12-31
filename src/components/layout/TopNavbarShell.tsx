// /Users/salvacastro/Desktop/maxikiosco/src/components/layout/TopNavbarShell.tsx
'use client'

import TopNavbar from '@/components/layout/TopNavbar'
import { useSession } from '@/hooks/useSession'

export default function TopNavbarShell() {
  const { ready } = useSession()
  if (!ready) return <TopNavbar />
  return <TopNavbar />
}

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import type { UserRole } from '@/types/database'
import {
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  Truck,
  LogOut,
  Wallet,
  Store,
  Tag,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/ventas',
    label: 'Punto de Venta',
    icon: <ShoppingCart size={20} />,
    roles: ['vendedor', 'encargado', 'admin'],
  },
  {
    href: '/caja',
    label: 'Caja',
    icon: <Wallet size={20} />,
    roles: ['vendedor', 'encargado', 'admin'],
  },
  {
    href: '/stock',
    label: 'Stock',
    icon: <Package size={20} />,
    roles: ['encargado', 'admin'],
  },
  {
    href: '/promociones',
    label: 'Promociones',
    icon: <Tag size={20} />,
    roles: ['encargado', 'admin'],
  },
  {
    href: '/reportes',
    label: 'Reportes',
    icon: <BarChart3 size={20} />,
    roles: ['admin'],
  },
  {
    href: '/usuarios',
    label: 'Usuarios',
    icon: <Users size={20} />,
    roles: ['encargado', 'admin'],
  },
  {
    href: '/proveedores',
    label: 'Proveedores',
    icon: <Truck size={20} />,
    roles: ['admin'],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, loading } = useProfile()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const visibleItems = profile
    ? NAV_ITEMS.filter(item => item.roles.includes(profile.role))
    : []

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-700">
        <Store size={22} className="text-blue-400" />
        <div className="leading-tight">
          <p className="text-sm font-bold">Buffet</p>
          <p className="text-xs text-gray-400">Albert Einstein</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-gray-700">
        {!loading && profile && (
          <div className="mb-3 px-1">
            <p className="text-sm font-medium truncate">{profile.full_name}</p>
            <p className="text-xs text-gray-400 capitalize">{profile.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

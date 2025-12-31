// /Users/salvacastro/Desktop/maxikiosco/src/components/layout/TopNavbar.tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, ChevronDown } from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import { useState, useEffect, useRef } from 'react'

// ✅ IDs reales que vos mostraste
const ROLE_ID_DUENO = 'becb28f7-2cb0-46c7-8fff-86e4ba8f2f68'
const ROLE_ID_SUPERADMIN = 'b6bd71da-9208-4bd6-831a-dec53635913d'
const ROLE_ID_CAJERO = '2fd31631-3223-4b1b-a416-b9cc5049069c'
const ROLE_ID_ENCARGADO = 'f30ae109-623c-47d6-bc7b-d55de5e5e7db'

const LOGO_URL =
  'https://kxaygskhpuykrtysklim.supabase.co/storage/v1/object/public/logo/logo.png'

function normalize(s: unknown) {
  return String(s ?? '').trim().toLowerCase().replace(/\s+/g, '')
}

/**
 * Intenta resolver rol por:
 * - user.rol.nombre / user.rol.nivel
 * - user.rol (string)
 * - user.id_rol (uuid)
 * - user.rol_id / user.id_rol (variantes comunes)
 */
function getRole(user: any): { id: string; name: string; level: number } {
  const id =
    String(
      user?.id_rol ??
        user?.rol_id ??
        user?.rol?.id_rol ??
        user?.rol?.id ??
        ''
    ).trim()

  const name = normalize(user?.rol?.nombre ?? user?.rol ?? user?.role ?? '')
  const levelRaw = user?.rol?.nivel ?? user?.nivel ?? null
  const level = typeof levelRaw === 'number' ? levelRaw : Number(levelRaw ?? 0) || 0

  // Si viene id_rol pero no name/level, lo inferimos por tus IDs
  if (id) {
    if (id === ROLE_ID_SUPERADMIN) return { id, name: 'superadmin', level: 99 }
    if (id === ROLE_ID_DUENO) return { id, name: 'dueno', level: 30 }
    if (id === ROLE_ID_ENCARGADO) return { id, name: 'encargado', level: 20 }
    if (id === ROLE_ID_CAJERO) return { id, name: 'cajero', level: 10 }
  }

  // Si viene name pero no id
  if (name === 'superadmin') return { id, name, level: level || 99 }
  if (name === 'dueno') return { id, name, level: level || 30 }
  if (name === 'encargado') return { id, name, level: level || 20 }
  if (name === 'cajero') return { id, name, level: level || 10 }

  // Fallback: lo que haya
  return { id, name, level }
}

function permissions(role: { id: string; name: string; level: number }) {
  const adminLike =
    role.id === ROLE_ID_SUPERADMIN ||
    role.id === ROLE_ID_DUENO ||
    role.name === 'superadmin' ||
    role.name === 'dueno' ||
    role.level >= 30

  const canCompras = adminLike || role.name === 'encargado' || role.id === ROLE_ID_ENCARGADO
  const canAdminMenu = adminLike

  return { adminLike, canCompras, canAdminMenu }
}

export default function TopNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isLoggedIn, user, logout } = useSession()
  const [isComprasOpen, setIsComprasOpen] = useState(false)
  // const [isConfigOpen, setIsConfigOpen] = useState(false) // Removed
  const [isCajasOpen, setIsCajasOpen] = useState(false) // New Cajas dropdown
  const dropdownRef = useRef<HTMLDivElement>(null)
  const cajasDropdownRef = useRef<HTMLDivElement>(null)

  const isHome = pathname === '/'
  const isLogin = pathname === '/login'
  const centerLogo = isHome || isLogin

  const role = getRole(user)
  const { adminLike, canCompras, canAdminMenu } = permissions(role)

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsComprasOpen(false)
      }
      if (cajasDropdownRef.current && !cajasDropdownRef.current.contains(event.target as Node)) {
        setIsCajasOpen(false)
      }
    }

    if (isComprasOpen || isCajasOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isComprasOpen, isCajasOpen])

  const handleLogoClick = () => {
    if (!isLoggedIn) {
      router.push('/login')
      return
    }
    // ✅ AdminLike entra al dashboard
    if (adminLike) router.push('/dashboard/')
    else router.push('/ventas')
  }

  const handleLogout = async () => {
    try {
      // Clear server cookie
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (e) {
      console.error('Error during logout:', e)
    } finally {
      // Always clear local session regardless of API call result
      logout()
      router.push('/login')
    }
  }

  return (
    <header className='sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur'>
      <div
        className={`
          mx-auto w-full max-w-6xl px-4 py-3 flex items-center
          ${centerLogo ? 'justify-center' : 'justify-between'}
        `}
      >
        {/* LOGO */}
        <button
          type='button'
          aria-label='Ir al inicio'
          onClick={handleLogoClick}
          className={`flex items-center gap-2 focus:outline-none ${centerLogo ? 'mx-auto' : ''}`}
        >
          <Image
            src={LOGO_URL}
            alt='maxiKiosco'
            width={140}
            height={36}
            className='h-8 w-auto'
            priority
            // Si ya configuraste next.config.js para este host, podés quitar esto
            unoptimized
          />
        </button>

        {/* MENÚ TOPNAV con dropdown de Compras */}
        {!centerLogo && isLoggedIn && (
          <nav className='flex items-center gap-2'>
            {/* Ventas: todos */}
            <Link
              href='/ventas'
              className='px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-900'
            >
              Ventas
            </Link>
            {/* Cajas Dropdown */}
             <div className='relative' ref={cajasDropdownRef}>
                  <button
                    onClick={() => setIsCajasOpen(!isCajasOpen)}
                    className='flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-900 transition-colors'
                  >
                    Cajas
                    <ChevronDown className={`h-4 w-4 transition-transform ${isCajasOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isCajasOpen && (
                    <div className='absolute top-full mt-1 left-0 min-w-[200px] rounded-lg border border-slate-800 bg-slate-950 shadow-lg py-1 z-50'>
                      <Link
                        href='/caja'
                        onClick={() => setIsCajasOpen(false)}
                        className='block px-4 py-2 text-sm text-slate-200 hover:bg-slate-900'
                      >
                        Control de Caja (Abrir/Cerrar)
                      </Link>
                      {canAdminMenu && (
                        <Link
                          href='/configuracion/cajas'
                          onClick={() => setIsCajasOpen(false)}
                          className='block px-4 py-2 text-sm text-slate-200 hover:bg-slate-900 border-t border-slate-900 mt-1 pt-2'
                        >
                          Administrar Cajas
                        </Link>
                      )}
                    </div>
                  )}
            </div>

            {/* Turnos Link */}
            {canAdminMenu && (
                <Link
                href='/configuracion/turnos'
                className='px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-900'
                >
                Turnos
                </Link>
            )}

            {/* Compras con dropdown: Encargado + AdminLike */}
            {canCompras && (
              <div className='relative' ref={dropdownRef}>
                <button
                  onClick={() => setIsComprasOpen(!isComprasOpen)}
                  className='flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-900'
                >
                  Compras
                  <ChevronDown className={`h-4 w-4 transition-transform ${isComprasOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isComprasOpen && (
                  <div className='absolute top-full mt-1 right-0 min-w-[200px] rounded-lg border border-slate-800 bg-slate-950 shadow-lg py-1'>
                    {canAdminMenu && (
                      <>
                        <Link
                          href='/compras/nueva'
                          onClick={() => setIsComprasOpen(false)}
                          className='block px-4 py-2 text-sm text-slate-200 hover:bg-slate-900'
                        >
                          Nueva Compra
                        </Link>
                        <Link
                          href='/proveedores/nuevo'
                          onClick={() => setIsComprasOpen(false)}
                          className='block px-4 py-2 text-sm text-slate-200 hover:bg-slate-900'
                        >
                          Nuevo Proveedor
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Otros menús admin */}
            {canAdminMenu && (
              <>
                <Link
                  href='/usuarios'
                  className='px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-900'
                >
                  Usuarios
                </Link>
                <Link
                  href='/productos'
                  className='px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-900'
                >
                  Productos
                </Link>
                <Link
                  href='/categorias'
                  className='px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-900'
                >
                  Categorías
                </Link>
                <Link
                  href='/reportes'
                  className='px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-900'
                >
                  Reportes
                </Link>

              </>
            )}


            {/* Logout icon */}
            <button
              onClick={handleLogout}
              title='Cerrar sesión'
              aria-label='Cerrar sesión'
              className='ml-2 inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 px-3 py-2 text-slate-100'
            >
              <LogOut className='h-4 w-4' />
            </button>
          </nav>
        )}

        {/* Si NO está logueado y no es Home/Login, botón login */}
        {!centerLogo && !isLoggedIn && (
          <button
            onClick={() => router.push('/login')}
            className='rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 px-3 py-2 text-sm text-slate-100'
          >
            Iniciar sesión
          </button>
        )}
      </div>
    </header>
  )
}

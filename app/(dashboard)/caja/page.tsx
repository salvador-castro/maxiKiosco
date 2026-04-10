'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCashSession } from '@/hooks/useCashSession'
import { useProfile } from '@/hooks/useProfile'
import type { CashRegister, Shift } from '@/types/database'
import { Wallet, LockOpen, Lock, AlertCircle, CheckCircle } from 'lucide-react'

const SHIFTS: Shift[] = ['mañana', 'tarde', 'noche']

type RegisterWithBranch = CashRegister & { branches: { id: string; name: string } }

export default function CajaPage() {
  const supabase = createClient()
  const { profile } = useProfile()
  const { session, loading, refresh } = useCashSession()
  const [registers, setRegisters] = useState<RegisterWithBranch[]>([])

  // Formulario apertura
  const [selectedRegister, setSelectedRegister] = useState('')
  const [selectedShift, setSelectedShift] = useState<Shift>('mañana')
  const [openingAmount, setOpeningAmount] = useState('')
  const [opening, setOpening] = useState(false)

  // Formulario cierre (solo efectivo — débito y transferencia se toman de las ventas)
  const [closingCash, setClosingCash] = useState('')
  const [closingNotes, setClosingNotes] = useState('')
  const [closing, setClosing] = useState(false)

  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const [sessionStats, setSessionStats] = useState<{
    totalSales: number
    cashSales: number
    debitSales: number
    transferSales: number
    count: number
  } | null>(null)

  // Cargar cajas filtradas por rol
  useEffect(() => {
    if (!profile) return
    supabase
      .from('cash_registers')
      .select('*, branches(id, name)')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        const all = (data as RegisterWithBranch[]) || []
        if (profile.role === 'admin') {
          setRegisters(all)
        } else {
          // encargado/vendedor: solo su sucursal
          setRegisters(all.filter(r => r.branch_id === profile.branch_id))
        }
      })
  }, [profile])

  useEffect(() => {
    if (!session) { setSessionStats(null); return }
    supabase
      .from('sales')
      .select('total, payment_method')
      .eq('cash_session_id', session.id)
      .eq('status', 'completed')
      .then(({ data }) => {
        if (!data) return
        const rows = data as { total: number; payment_method: string }[]
        setSessionStats({
          totalSales: rows.reduce((s, v) => s + v.total, 0),
          cashSales: rows.filter(v => v.payment_method === 'efectivo').reduce((s, v) => s + v.total, 0),
          debitSales: rows.filter(v => v.payment_method === 'debito').reduce((s, v) => s + v.total, 0),
          transferSales: rows.filter(v => v.payment_method === 'transferencia').reduce((s, v) => s + v.total, 0),
          count: rows.length,
        })
      })
  }, [session])

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRegister) return
    setOpening(true)
    setMessage(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMessage({ type: 'error', text: 'No autenticado' }); setOpening(false); return }

    const { error } = await supabase.from('cash_sessions').insert({
      cash_register_id: selectedRegister,
      user_id: user.id,
      shift: selectedShift,
      opening_amount: parseFloat(openingAmount) || 0,
    })

    if (error) {
      setMessage({ type: 'error', text: 'Error al abrir caja' })
    } else {
      setMessage({ type: 'ok', text: 'Caja abierta correctamente' })
      setOpeningAmount('')
      refresh()
    }
    setOpening(false)
  }

  async function handleClose(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return
    setClosing(true)
    setMessage(null)

    const { error } = await supabase
      .from('cash_sessions')
      .update({
        status: 'closed',
        closing_cash_amount: parseFloat(closingCash) || 0,
        closing_debit_amount: sessionStats?.debitSales ?? 0,
        closing_transfer_amount: sessionStats?.transferSales ?? 0,
        notes: closingNotes,
        closed_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    if (error) {
      setMessage({ type: 'error', text: 'Error al cerrar caja' })
    } else {
      setMessage({ type: 'ok', text: 'Caja cerrada correctamente' })
      setClosingCash('')
      setClosingNotes('')
      refresh()
    }
    setClosing(false)
  }

  // Agrupar cajas por sucursal (para admin)
  const registersByBranch = registers.reduce((acc, r) => {
    const branchName = r.branches?.name ?? 'Sin sucursal'
    if (!acc[branchName]) acc[branchName] = []
    acc[branchName].push(r)
    return acc
  }, {} as Record<string, RegisterWithBranch[]>)

  const isAdmin = profile?.role === 'admin'

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-500">Cargando...</div>
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Wallet size={24} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Caja</h1>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-xl mb-6 text-sm font-medium ${
          message.type === 'ok'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'ok' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* Sin caja abierta → formulario apertura */}
      {!session && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <LockOpen size={20} className="text-green-500" />
            <h2 className="text-lg font-semibold text-gray-800">Abrir Caja</h2>
          </div>
          <form onSubmit={handleOpen} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Caja</label>
              <select
                value={selectedRegister}
                onChange={e => setSelectedRegister(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar caja...</option>
                {isAdmin
                  ? Object.entries(registersByBranch).map(([branch, regs]) => (
                      <optgroup key={branch} label={branch}>
                        {regs.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </optgroup>
                    ))
                  : registers.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))
                }
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Turno</label>
              <div className="grid grid-cols-3 gap-2">
                {SHIFTS.map(shift => (
                  <button
                    key={shift}
                    type="button"
                    onClick={() => setSelectedShift(shift)}
                    className={`py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                      selectedShift === shift
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {shift}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto inicial en caja (efectivo)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingAmount}
                  onChange={e => setOpeningAmount(e.target.value)}
                  required
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={opening}
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors"
            >
              {opening ? 'Abriendo...' : 'Abrir Caja'}
            </button>
          </form>
        </div>
      )}

      {/* Con caja abierta → info + cierre */}
      {session && (
        <div className="space-y-4">
          {/* Info sesión activa */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-green-700">Caja activa</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Caja</p>
                <p className="font-semibold text-gray-800">{session.cash_registers.name}</p>
              </div>
              <div>
                <p className="text-gray-500">Turno</p>
                <p className="font-semibold text-gray-800 capitalize">{session.shift}</p>
              </div>
              <div>
                <p className="text-gray-500">Fondo inicial</p>
                <p className="font-semibold text-gray-800">${session.opening_amount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-500">Abierta a las</p>
                <p className="font-semibold text-gray-800">
                  {new Date(session.opened_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>

          {/* Estadísticas */}
          {sessionStats && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Ventas del turno ({sessionStats.count} transacciones)</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-500 text-xs">Efectivo</p>
                  <p className="font-bold text-gray-800">${sessionStats.cashSales.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-500 text-xs">Débito</p>
                  <p className="font-bold text-gray-800">${sessionStats.debitSales.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-500 text-xs">Transferencia</p>
                  <p className="font-bold text-gray-800">${sessionStats.transferSales.toFixed(2)}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-blue-600 text-xs font-medium">Total</p>
                  <p className="font-bold text-blue-700 text-lg">${sessionStats.totalSales.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Formulario cierre */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Lock size={20} className="text-red-500" />
              <h2 className="text-lg font-semibold text-gray-800">Cerrar Caja</h2>
            </div>
            <form onSubmit={handleClose} className="space-y-4">
              <p className="text-sm text-gray-500">
                Contá el efectivo físico en caja. Débito y transferencia se registran automáticamente desde las ventas.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Efectivo en caja</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={closingCash}
                    onChange={e => setClosingCash(e.target.value)}
                    required
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (opcional)</label>
                <textarea
                  value={closingNotes}
                  onChange={e => setClosingNotes(e.target.value)}
                  rows={2}
                  placeholder="Novedades del turno..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={closing}
                className="w-full py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors"
              >
                {closing ? 'Cerrando...' : 'Cerrar Caja'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

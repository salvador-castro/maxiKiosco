'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart3, TrendingUp, Store, Users, Wallet } from 'lucide-react'
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

type DateRange = 'hoy' | 'semana' | 'mes' | 'custom'

interface SaleRecord {
  id: string
  total: number
  payment_method: string
  created_at: string
  branch_id: string
  branches: { name: string }
  profiles: { full_name: string }
  cash_sessions: {
    shift: string
    cash_registers: { name: string }
  }
}

interface BranchSummary {
  branch_id: string
  branch_name: string
  total: number
  count: number
  cash: number
  debit: number
  transfer: number
}

interface SellerSummary {
  user_id: string
  seller_name: string
  total: number
  count: number
}

export default function ReportesPage() {
  const supabase = createClient()
  const [range, setRange] = useState<DateRange>('hoy')
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [loading, setLoading] = useState(false)

  function getRange() {
    const now = new Date()
    if (range === 'hoy') return { from: startOfDay(now), to: endOfDay(now) }
    if (range === 'semana') {
      const from = new Date(now); from.setDate(now.getDate() - 7)
      return { from: startOfDay(from), to: endOfDay(now) }
    }
    if (range === 'mes') return { from: startOfMonth(now), to: endOfMonth(now) }
    return {
      from: startOfDay(new Date(dateFrom)),
      to: endOfDay(new Date(dateTo)),
    }
  }

  async function load() {
    setLoading(true)
    const { from, to } = getRange()

    const { data } = await supabase
      .from('sales')
      .select(`
        id, total, payment_method, created_at, branch_id,
        branches(name),
        profiles(full_name),
        cash_sessions(shift, cash_registers(name))
      `)
      .eq('status', 'completed')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
      .order('created_at', { ascending: false })

    setSales((data as any[]) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [range, dateFrom, dateTo])

  const totalVentas = sales.reduce((s, v) => s + v.total, 0)
  const totalEfectivo = sales.filter(v => v.payment_method === 'efectivo').reduce((s, v) => s + v.total, 0)
  const totalDebito = sales.filter(v => v.payment_method === 'debito').reduce((s, v) => s + v.total, 0)
  const totalTransfer = sales.filter(v => v.payment_method === 'transferencia').reduce((s, v) => s + v.total, 0)

  // Por sucursal
  const bySucursal: BranchSummary[] = Object.values(
    sales.reduce((acc, sale) => {
      const key = sale.branch_id
      if (!acc[key]) {
        acc[key] = {
          branch_id: key,
          branch_name: sale.branches?.name ?? '-',
          total: 0, count: 0, cash: 0, debit: 0, transfer: 0
        }
      }
      acc[key].total += sale.total
      acc[key].count += 1
      if (sale.payment_method === 'efectivo') acc[key].cash += sale.total
      if (sale.payment_method === 'debito') acc[key].debit += sale.total
      if (sale.payment_method === 'transferencia') acc[key].transfer += sale.total
      return acc
    }, {} as Record<string, BranchSummary>)
  )

  // Por vendedor
  const bySeller: SellerSummary[] = Object.values(
    sales.reduce((acc, sale) => {
      const key = sale.profiles?.full_name ?? 'Desconocido'
      if (!acc[key]) acc[key] = { user_id: key, seller_name: key, total: 0, count: 0 }
      acc[key].total += sale.total
      acc[key].count += 1
      return acc
    }, {} as Record<string, SellerSummary>)
  ).sort((a, b) => b.total - a.total)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 size={24} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
      </div>

      {/* Filtros de rango */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['hoy', 'semana', 'mes', 'custom'] as DateRange[]).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              range === r ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {r === 'semana' ? 'Últimos 7 días' : r === 'custom' ? 'Personalizado' : r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
        {range === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total ventas', value: `$${totalVentas.toFixed(2)}`, sub: `${sales.length} transacciones`, icon: <TrendingUp size={20} />, color: 'blue' },
          { label: 'Efectivo', value: `$${totalEfectivo.toFixed(2)}`, sub: `${sales.filter(s => s.payment_method === 'efectivo').length} ventas`, icon: <Wallet size={20} />, color: 'green' },
          { label: 'Débito', value: `$${totalDebito.toFixed(2)}`, sub: `${sales.filter(s => s.payment_method === 'debito').length} ventas`, icon: <Wallet size={20} />, color: 'purple' },
          { label: 'Transferencia', value: `$${totalTransfer.toFixed(2)}`, sub: `${sales.filter(s => s.payment_method === 'transferencia').length} ventas`, icon: <Wallet size={20} />, color: 'orange' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className={`inline-flex p-2 rounded-xl mb-3 ${
              kpi.color === 'blue' ? 'bg-blue-50 text-blue-600' :
              kpi.color === 'green' ? 'bg-green-50 text-green-600' :
              kpi.color === 'purple' ? 'bg-purple-50 text-purple-600' :
              'bg-orange-50 text-orange-600'
            }`}>
              {kpi.icon}
            </div>
            <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
            <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Por sucursal */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Store size={18} className="text-blue-600" />
            <h2 className="font-semibold text-gray-800">Por sucursal</h2>
          </div>
          {bySucursal.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {bySucursal.map(b => (
                <div key={b.branch_id} className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-800 text-sm">{b.branch_name}</span>
                    <span className="font-bold text-gray-900">${b.total.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-500">
                    <span>Efectivo: ${b.cash.toFixed(2)}</span>
                    <span>Débito: ${b.debit.toFixed(2)}</span>
                    <span>Transfer: ${b.transfer.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{b.count} transacciones</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Por vendedor */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-blue-600" />
            <h2 className="font-semibold text-gray-800">Por vendedor</h2>
          </div>
          {bySeller.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {bySeller.map((s, i) => (
                <div key={s.user_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{s.seller_name}</p>
                    <p className="text-xs text-gray-400">{s.count} ventas</p>
                  </div>
                  <span className="font-bold text-gray-800">${s.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Últimas ventas */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Detalle de ventas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha y hora</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Sucursal</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Caja / Turno</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Vendedor</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Medio de pago</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Cargando...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No hay ventas en el período</td></tr>
              ) : (
                sales.slice(0, 100).map(sale => (
                  <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-600">
                      {format(new Date(sale.created_at), 'dd/MM HH:mm', { locale: es })}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{sale.branches?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {sale.cash_sessions?.cash_registers?.name} · {sale.cash_sessions?.shift}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{sale.profiles?.full_name ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        sale.payment_method === 'efectivo' ? 'bg-green-100 text-green-700' :
                        sale.payment_method === 'debito' ? 'bg-purple-100 text-purple-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      ${sale.total.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

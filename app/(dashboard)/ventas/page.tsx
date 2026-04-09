'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCashSession } from '@/hooks/useCashSession'
import { useProfile } from '@/hooks/useProfile'
import type { Product, Category, SaleItem, PaymentMethod } from '@/types/database'
import {
  Search, Plus, Minus, Trash2, ShoppingCart,
  CreditCard, Banknote, Smartphone, Printer, AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface CartItem {
  product: Product
  quantity: number
  subtotal: number
}

type PrintMode = 'comanda' | 'factura_b' | 'ticket'

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  transferencia: 'Transferencia',
}

export default function VentasPage() {
  const supabase = createClient()
  const { session, loading: sessionLoading } = useCashSession()
  const { profile } = useProfile()

  const [products, setProducts] = useState<(Product & { categories: Category | null })[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo')
  const [cashReceived, setCashReceived] = useState('')
  const [processing, setSelling] = useState(false)
  const [lastSale, setLastSale] = useState<{ id: string; total: number; change: number } | null>(null)

  // Cargar productos y categorías
  useEffect(() => {
    async function load() {
      const [{ data: prods }, { data: cats }] = await Promise.all([
        supabase.from('products').select('*, categories(*)').eq('is_active', true).order('name'),
        supabase.from('categories').select('*').order('name'),
      ])
      setProducts((prods as any[]) || [])
      setCategories(cats || [])
    }
    load()
  }, [])

  const filtered = products.filter(p => {
    const matchCat = !selectedCategory || p.category_id === selectedCategory
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search)
    return matchCat && matchSearch
  })

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * product.price }
            : i
        )
      }
      return [...prev, { product, quantity: 1, subtotal: product.price }]
    })
  }

  function updateQty(productId: string, delta: number) {
    setCart(prev =>
      prev.map(i => {
        if (i.product.id !== productId) return i
        const qty = i.quantity + delta
        if (qty <= 0) return null as any
        return { ...i, quantity: qty, subtotal: qty * i.product.price }
      }).filter(Boolean)
    )
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(i => i.product.id !== productId))
  }

  const total = cart.reduce((s, i) => s + i.subtotal, 0)
  const change = paymentMethod === 'efectivo' && cashReceived
    ? parseFloat(cashReceived) - total
    : 0

  // Determinar tipo fiscal según medio de pago
  function getFiscalType(): PrintMode {
    if (paymentMethod === 'efectivo') return 'comanda'
    return 'factura_b'
  }

  async function handleSell() {
    if (!session || cart.length === 0) return
    setSelling(true)

    const fiscal_type = getFiscalType()

    // Crear venta
    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .insert({
        cash_session_id: session.id,
        user_id: profile!.id,
        branch_id: session.cash_registers.branch_id,
        payment_method: paymentMethod,
        subtotal: total,
        discount: 0,
        total,
        fiscal_type,
      })
      .select()
      .single()

    if (saleErr || !sale) {
      alert('Error al registrar la venta')
      setSelling(false)
      return
    }

    // Insertar items
    await supabase.from('sale_items').insert(
      cart.map(i => ({
        sale_id: sale.id,
        product_id: i.product.id,
        product_name: i.product.name,
        quantity: i.quantity,
        unit_price: i.product.price,
        discount: 0,
        subtotal: i.subtotal,
      }))
    )

    setLastSale({ id: sale.id, total, change: Math.max(0, change) })
    setCart([])
    setCashReceived('')
    setSelling(false)
  }

  if (sessionLoading) {
    return <div className="flex items-center justify-center h-full text-gray-500">Cargando...</div>
  }

  // Sin caja abierta
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle size={48} className="text-amber-500" />
        <h2 className="text-xl font-semibold text-gray-800">No hay caja abierta</h2>
        <p className="text-gray-500 text-sm">Debes abrir una caja antes de realizar ventas.</p>
        <Link
          href="/caja"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Ir a Caja
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Panel izquierdo: catálogo */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {/* Buscador */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar producto o código de barras..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-xs text-gray-500 flex items-center px-2 bg-gray-100 rounded-lg">
            {session.cash_registers.name} · {session.shift}
          </div>
        </div>

        {/* Categorías */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              !selectedCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Grilla de productos */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {filtered.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white border border-gray-200 rounded-xl p-3 text-left hover:border-blue-400 hover:shadow-sm transition-all active:scale-95"
              >
                <div className="text-sm font-medium text-gray-800 leading-tight mb-1 line-clamp-2">
                  {product.name}
                </div>
                <div className="text-xs text-gray-400 mb-2">{product.categories?.name}</div>
                <div className="text-base font-bold text-blue-600">
                  ${product.price.toFixed(2)}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center text-gray-400 py-12 text-sm">
                No se encontraron productos
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel derecho: carrito */}
      <div className="w-80 flex flex-col border-l border-gray-200 bg-white">
        {/* Header carrito */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <ShoppingCart size={18} className="text-gray-600" />
          <h2 className="font-semibold text-gray-800">Carrito</h2>
          <span className="ml-auto text-xs text-gray-500">{cart.length} items</span>
        </div>

        {/* Alerta venta exitosa */}
        {lastSale && (
          <div className="mx-3 mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
            <p className="font-medium text-green-800">Venta registrada</p>
            <p className="text-green-600">Total: ${lastSale.total.toFixed(2)}</p>
            {lastSale.change > 0 && (
              <p className="text-green-600">Vuelto: ${lastSale.change.toFixed(2)}</p>
            )}
            <button
              onClick={() => setLastSale(null)}
              className="mt-2 flex items-center gap-1 text-xs text-green-700 font-medium"
            >
              <Printer size={12} /> Imprimir comprobante
            </button>
          </div>
        )}

        {/* Items del carrito */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">
              Seleccioná productos del catálogo
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="flex items-center gap-2 py-2 border-b border-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.product.name}</p>
                  <p className="text-xs text-gray-500">${item.product.price.toFixed(2)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQty(item.product.id, -1)}
                    className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.product.id, 1)}
                    className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <div className="text-sm font-semibold text-gray-800 w-16 text-right">
                  ${item.subtotal.toFixed(2)}
                </div>
                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Totales y pago */}
        <div className="border-t border-gray-100 p-4 space-y-3">
          {/* Medio de pago */}
          <div className="grid grid-cols-3 gap-1">
            {(['efectivo', 'debito', 'transferencia'] as PaymentMethod[]).map(m => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                className={`py-2 rounded-lg text-xs font-medium transition-colors flex flex-col items-center gap-1 ${
                  paymentMethod === m
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {m === 'efectivo' && <Banknote size={14} />}
                {m === 'debito' && <CreditCard size={14} />}
                {m === 'transferencia' && <Smartphone size={14} />}
                {PAYMENT_LABELS[m]}
              </button>
            ))}
          </div>

          {/* Monto en efectivo */}
          {paymentMethod === 'efectivo' && (
            <div>
              <label className="text-xs text-gray-500 font-medium">Efectivo recibido</label>
              <input
                type="number"
                value={cashReceived}
                onChange={e => setCashReceived(e.target.value)}
                placeholder="$0.00"
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {cashReceived && parseFloat(cashReceived) >= total && (
                <p className="text-xs text-green-600 mt-1 font-medium">
                  Vuelto: ${(parseFloat(cashReceived) - total).toFixed(2)}
                </p>
              )}
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between items-center pt-1">
            <span className="text-sm text-gray-600">Total</span>
            <span className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</span>
          </div>

          {/* Botón cobrar */}
          <button
            onClick={handleSell}
            disabled={
              cart.length === 0 ||
              processing ||
              (paymentMethod === 'efectivo' && cashReceived !== '' && parseFloat(cashReceived) < total)
            }
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Printer size={16} />
            {processing ? 'Procesando...' : `Cobrar · ${getFiscalType() === 'comanda' ? 'Comanda' : 'Factura'}`}
          </button>

          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="w-full py-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Cancelar venta
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

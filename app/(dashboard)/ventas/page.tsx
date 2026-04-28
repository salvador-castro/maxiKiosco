'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCashSession } from '@/hooks/useCashSession'
import { useProfile } from '@/hooks/useProfile'
import type { Product, Category, PaymentMethod, PromotionWithItems } from '@/types/database'
import {
  Search, Plus, Minus, Trash2, ShoppingCart,
  CreditCard, Banknote, Smartphone, Printer, AlertCircle, Tag,
} from 'lucide-react'
import Link from 'next/link'

// ── Cart types ────────────────────────────────────────────────────────────────
type CartEntry =
  | { kind: 'product'; product: Product & { categories: Category | null }; quantity: number; subtotal: number }
  | { kind: 'promo'; promotion: PromotionWithItems; quantity: number; subtotal: number }

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
  const [promotions, setPromotions] = useState<PromotionWithItems[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number>>({})
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showPromos, setShowPromos] = useState(false)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartEntry[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo')
  const [cashReceived, setCashReceived] = useState('')
  const [processing, setSelling] = useState(false)
  const [lastSale, setLastSale] = useState<{ id: string; total: number; change: number } | null>(null)

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [{ data: prods }, { data: cats }, { data: promos }] = await Promise.all([
        supabase.from('products').select('*, categories(*)').eq('is_active', true).order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('promotions').select('*, promotion_items(*, products(*))').eq('is_active', true).order('name'),
      ])
      setProducts((prods as any[]) || [])
      setCategories(cats || [])
      setPromotions((promos as any[]) || [])
    }
    load()
  }, [])

  async function loadStock() {
    if (!session) return
    const { data } = await supabase
      .from('stock')
      .select('product_id, quantity')
      .eq('branch_id', session.cash_registers.branch_id)
    if (data) {
      const map: Record<string, number> = {}
      for (const row of data) map[row.product_id] = Number(row.quantity)
      setStockMap(map)
    }
  }

  useEffect(() => { loadStock() }, [session])

  // ── Stock helpers ──────────────────────────────────────────────────────────
  // Stock real en sucursal (antes de descontar el carrito)
  function getAvailableStock(productId: string): number {
    return stockMap[productId] ?? 0
  }

  // Stock efectivo: descuenta lo que ya está reservado en el carrito
  function getEffectiveStock(productId: string): number {
    let reserved = 0
    for (const entry of cart) {
      if (entry.kind === 'product' && entry.product.id === productId) {
        reserved += entry.quantity
      } else if (entry.kind === 'promo') {
        const comp = entry.promotion.promotion_items.find(pi => pi.product_id === productId)
        if (comp) reserved += entry.quantity * comp.quantity
      }
    }
    return Math.max(0, getAvailableStock(productId) - reserved)
  }

  // Cuántas veces se puede armar una promo dado el stock efectivo actual
  function getPromoCapacity(promo: PromotionWithItems): number {
    if (promo.promotion_items.length === 0) return 0
    let min = Infinity
    for (const comp of promo.promotion_items) {
      const eff = getEffectiveStock(comp.product_id)
      min = Math.min(min, Math.floor(eff / comp.quantity))
    }
    return min === Infinity ? 0 : min
  }

  // ── Search / filter ────────────────────────────────────────────────────────
  const multiplierMatch = search.match(/^(\d+)\*(.*)$/)
  const qtyMultiplier = multiplierMatch ? Math.max(1, parseInt(multiplierMatch[1])) : 1
  const actualSearch = multiplierMatch ? multiplierMatch[2] : search

  const branchId = session?.cash_registers?.branch_id

  const filteredProducts = products.filter(p => {
    if (!(p.id in stockMap)) return false
    const matchCat = !selectedCategory || p.category_id === selectedCategory
    const matchSearch = !actualSearch || p.name.toLowerCase().includes(actualSearch.toLowerCase()) || p.barcode?.includes(actualSearch)
    return matchCat && matchSearch
  })

  const filteredPromos = promotions.filter(p =>
    (!p.branch_id || p.branch_id === branchId) &&
    (!actualSearch || p.name.toLowerCase().includes(actualSearch.toLowerCase()))
  )

  // ── Cart helpers ──────────────────────────────────────────────────────────
  function addToCart(product: Product & { categories: Category | null }) {
    const qty = qtyMultiplier
    const available = getEffectiveStock(product.id)
    const toAdd = Math.min(qty, available)
    if (toAdd <= 0) return

    setCart(prev => {
      const existing = prev.find(e => e.kind === 'product' && e.product.id === product.id)
      if (existing && existing.kind === 'product') {
        const newQty = Math.min(existing.quantity + toAdd, getAvailableStock(product.id))
        return prev.map(e =>
          e.kind === 'product' && e.product.id === product.id
            ? { ...e, quantity: newQty, subtotal: newQty * product.price }
            : e
        )
      }
      return [...prev, { kind: 'product', product, quantity: toAdd, subtotal: toAdd * product.price }]
    })
    if (qty > 1) setSearch('')
  }

  function addPromoToCart(promo: PromotionWithItems) {
    const capacity = getPromoCapacity(promo)
    if (capacity <= 0) return

    setCart(prev => {
      const existing = prev.find(e => e.kind === 'promo' && e.promotion.id === promo.id)
      if (existing && existing.kind === 'promo') {
        const newQty = existing.quantity + 1
        return prev.map(e =>
          e.kind === 'promo' && e.promotion.id === promo.id
            ? { ...e, quantity: newQty, subtotal: newQty * (promo.price ?? 0) }
            : e
        )
      }
      return [...prev, { kind: 'promo', promotion: promo, quantity: 1, subtotal: promo.price ?? 0 }]
    })
  }

  function updateProductQty(productId: string, delta: number) {
    setCart(prev =>
      prev.map(e => {
        if (e.kind !== 'product' || e.product.id !== productId) return e
        const newQty = Math.max(0, Math.min(e.quantity + delta, getAvailableStock(productId)))
        if (newQty === 0) return null as any
        return { ...e, quantity: newQty, subtotal: newQty * e.product.price }
      }).filter(Boolean)
    )
  }

  function updatePromoQty(promoId: string, delta: number) {
    setCart(prev =>
      prev.map(e => {
        if (e.kind !== 'promo' || e.promotion.id !== promoId) return e
        const newQty = e.quantity + delta
        if (newQty <= 0) return null as any
        return { ...e, quantity: newQty, subtotal: newQty * (e.promotion.price ?? 0) }
      }).filter(Boolean)
    )
  }

  function setProductCartQty(productId: string, qty: number, unit?: string) {
    const minQty = unit === 'kg' ? 0.5 : 1
    if (qty < minQty) {
      setCart(prev => prev.filter(e => !(e.kind === 'product' && e.product.id === productId)))
      return
    }
    const capped = Math.min(qty, getAvailableStock(productId))
    setCart(prev => prev.map(e =>
      e.kind === 'product' && e.product.id === productId
        ? { ...e, quantity: capped, subtotal: capped * e.product.price }
        : e
    ))
  }

  function removeFromCart(entry: CartEntry) {
    if (entry.kind === 'product') {
      setCart(prev => prev.filter(e => !(e.kind === 'product' && e.product.id === entry.product.id)))
    } else {
      setCart(prev => prev.filter(e => !(e.kind === 'promo' && e.promotion.id === entry.promotion.id)))
    }
  }

  const total = cart.reduce((s, e) => s + e.subtotal, 0)
  const change = paymentMethod === 'efectivo' && cashReceived
    ? parseFloat(cashReceived) - total
    : 0

  function getFiscalType(): PrintMode {
    if (paymentMethod === 'efectivo') return 'comanda'
    return 'factura_b'
  }

  // ── Sell ──────────────────────────────────────────────────────────────────
  async function handleSell() {
    if (!session || cart.length === 0) return

    // Calcular stock necesario total (productos directos + componentes de promos)
    const stockNeeded: Record<string, number> = {}
    for (const entry of cart) {
      if (entry.kind === 'product') {
        stockNeeded[entry.product.id] = (stockNeeded[entry.product.id] ?? 0) + entry.quantity
      } else {
        for (const comp of entry.promotion.promotion_items) {
          stockNeeded[comp.product_id] = (stockNeeded[comp.product_id] ?? 0) + entry.quantity * comp.quantity
        }
      }
    }

    // Validar stock
    const stockErrors: string[] = []
    for (const [pid, needed] of Object.entries(stockNeeded)) {
      const available = getAvailableStock(pid)
      if (needed > available) {
        const prodName =
          products.find(p => p.id === pid)?.name ??
          promotions.flatMap(pr => pr.promotion_items).find(pi => pi.product_id === pid)?.products.name ??
          pid
        stockErrors.push(`${prodName}: disponible ${available}, pedido ${needed}`)
      }
    }
    if (stockErrors.length > 0) {
      alert(`Stock insuficiente:\n${stockErrors.join('\n')}`)
      return
    }

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

    // Insertar sale_items de productos (el trigger descuenta stock automáticamente)
    const productItems = cart.filter(e => e.kind === 'product')
    if (productItems.length > 0) {
      await supabase.from('sale_items').insert(
        productItems.map(e => {
          const pe = e as Extract<CartEntry, { kind: 'product' }>
          return {
            sale_id: sale.id,
            product_id: pe.product.id,
            promotion_id: null,
            product_name: pe.product.name,
            quantity: pe.quantity,
            unit_price: pe.product.price,
            discount: 0,
            subtotal: pe.subtotal,
          }
        })
      )
    }

    // Insertar sale_items de promos
    // - Item resumen (promotion_id, product_id=null): para el ticket/recibo
    // - Items componentes (product_id set, promotion_id set, precio=0): para que el trigger descuente stock
    const promoItems = cart.filter(e => e.kind === 'promo')
    if (promoItems.length > 0) {
      // Resumen de cada promo
      await supabase.from('sale_items').insert(
        promoItems.map(e => {
          const pe = e as Extract<CartEntry, { kind: 'promo' }>
          return {
            sale_id: sale.id,
            product_id: null,
            promotion_id: pe.promotion.id,
            product_name: pe.promotion.name,
            quantity: pe.quantity,
            unit_price: pe.promotion.price ?? 0,
            discount: 0,
            subtotal: pe.subtotal,
          }
        })
      )

      // Componentes con product_id set → el trigger deduct_stock_on_sale los descuenta automáticamente
      const componentRows: object[] = []
      for (const entry of promoItems) {
        const pe = entry as Extract<CartEntry, { kind: 'promo' }>
        for (const comp of pe.promotion.promotion_items) {
          componentRows.push({
            sale_id: sale.id,
            product_id: comp.product_id,
            promotion_id: pe.promotion.id,
            product_name: comp.products.name,
            quantity: pe.quantity * comp.quantity,
            unit_price: 0,
            discount: 0,
            subtotal: 0,
          })
        }
      }
      if (componentRows.length > 0) {
        await supabase.from('sale_items').insert(componentRows)
      }
    }

    await loadStock()
    setLastSale({ id: sale.id, total, change: Math.max(0, change) })
    setCart([])
    setCashReceived('')
    setSelling(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (sessionLoading) {
    return <div className="flex items-center justify-center h-full text-gray-500">Cargando...</div>
  }

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
              placeholder="Buscar... o 3*producto para cantidad"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {qtyMultiplier > 1 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                x{qtyMultiplier}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 flex items-center px-2 bg-gray-100 rounded-lg">
            {session.cash_registers.name} · {session.shift}
          </div>
        </div>

        {/* Categorías + Promociones toggle */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {/* Botón Promociones */}
          {filteredPromos.length > 0 && (
            <button
              onClick={() => { setShowPromos(true); setSelectedCategory(null) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                showPromos ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              <Tag size={11} />
              Promociones
            </button>
          )}
          <button
            onClick={() => { setSelectedCategory(null); setShowPromos(false) }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              !selectedCategory && !showPromos ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id === selectedCategory ? null : cat.id); setShowPromos(false) }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Grilla */}
        <div className="flex-1 overflow-y-auto">
          {showPromos ? (
            // Grid de promociones
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {filteredPromos.map(promo => {
                const capacity = getPromoCapacity(promo)
                const outOfStock = capacity <= 0
                return (
                  <button
                    key={promo.id}
                    onClick={() => !outOfStock && addPromoToCart(promo)}
                    disabled={outOfStock}
                    className={`bg-white border rounded-xl p-3 text-left transition-all active:scale-95 ${
                      outOfStock
                        ? 'border-gray-200 opacity-50 cursor-not-allowed'
                        : 'border-purple-200 hover:border-purple-400 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <Tag size={10} className="text-purple-500 shrink-0" />
                      <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">PROMO</span>
                    </div>
                    <div className="text-sm font-medium text-gray-800 leading-tight mb-1 line-clamp-2">
                      {promo.name}
                    </div>
                    <div className="text-xs text-gray-400 mb-2 space-y-0.5">
                      {promo.promotion_items.map(item => (
                        <div key={item.id}>{item.quantity}× {item.products.name}</div>
                      ))}
                    </div>
                    <div className="flex items-end justify-between gap-1">
                      <div className="text-base font-bold text-purple-600">
                        ${(promo.price ?? 0).toFixed(2)}
                      </div>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        outOfStock ? 'bg-red-100 text-red-600' :
                        capacity <= 3 ? 'bg-amber-100 text-amber-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {outOfStock ? 'Sin stock' : `×${capacity}`}
                      </span>
                    </div>
                  </button>
                )
              })}
              {filteredPromos.length === 0 && (
                <div className="col-span-full text-center text-gray-400 py-12 text-sm">
                  No hay promociones disponibles
                </div>
              )}
            </div>
          ) : (
            // Grid de productos
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {filteredProducts.map(product => {
                const stock = stockMap[product.id] ?? null
                const inCartEntry = cart.find(e => e.kind === 'product' && e.product.id === product.id)
                const inCart = inCartEntry?.kind === 'product' ? inCartEntry.quantity : 0
                const remaining = stock !== null ? stock - inCart : null
                const outOfStock = remaining !== null && remaining <= 0
                return (
                  <button
                    key={product.id}
                    onClick={() => !outOfStock && addToCart(product)}
                    disabled={outOfStock}
                    className={`bg-white border rounded-xl p-3 text-left transition-all active:scale-95 ${
                      outOfStock
                        ? 'border-gray-200 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-blue-400 hover:shadow-sm'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-800 leading-tight mb-1 line-clamp-2">
                      {product.name}
                    </div>
                    <div className="text-xs text-gray-400 mb-2">{product.categories?.name}</div>
                    <div className="flex items-end justify-between gap-1">
                      <div className="text-base font-bold text-blue-600">
                        ${product.price.toFixed(2)}<span className="text-xs font-normal text-gray-400">/{product.unit}</span>
                      </div>
                      {stock !== null && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          outOfStock ? 'bg-red-100 text-red-600' :
                          remaining! <= 5 ? 'bg-amber-100 text-amber-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {outOfStock ? 'Sin stock' : `${remaining}`}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
              {filteredProducts.length === 0 && (
                <div className="col-span-full text-center text-gray-400 py-12 text-sm">
                  No se encontraron productos
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Panel derecho: carrito */}
      <div className="w-80 flex flex-col border-l border-gray-200 bg-white">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <ShoppingCart size={18} className="text-gray-600" />
          <h2 className="font-semibold text-gray-800">Carrito</h2>
          <span className="ml-auto text-xs text-gray-500">{cart.length} items</span>
        </div>

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
            cart.map((entry, idx) => {
              if (entry.kind === 'product') {
                const isKg = entry.product.unit === 'kg'
                const step = isKg ? 0.5 : 1
                return (
                  <div key={`p-${entry.product.id}`} className="flex items-center gap-2 py-2 border-b border-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{entry.product.name}</p>
                      <p className="text-xs text-gray-500">${entry.product.price.toFixed(2)}/{entry.product.unit}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateProductQty(entry.product.id, -step)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        min={step}
                        step={step}
                        value={entry.quantity}
                        onChange={e => setProductCartQty(entry.product.id, parseFloat(e.target.value) || step, entry.product.unit)}
                        className="w-12 text-center text-sm font-semibold border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-blue-400"
                      />
                      <button
                        onClick={() => updateProductQty(entry.product.id, step)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="text-sm font-semibold text-gray-800 w-16 text-right">
                      ${entry.subtotal.toFixed(2)}
                    </div>
                    <button
                      onClick={() => removeFromCart(entry)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              } else {
                // Promo entry
                return (
                  <div key={`pr-${entry.promotion.id}`} className="flex items-center gap-2 py-2 border-b border-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Tag size={10} className="text-purple-500 shrink-0" />
                        <span className="text-xs font-semibold text-purple-600">PROMO</span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 truncate">{entry.promotion.name}</p>
                      <p className="text-xs text-gray-400">
                        {entry.promotion.promotion_items.map(pi => `${pi.quantity}× ${pi.products.name}`).join(' + ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updatePromoQty(entry.promotion.id, -1)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-10 text-center text-sm font-semibold">{entry.quantity}</span>
                      <button
                        onClick={() => updatePromoQty(entry.promotion.id, 1)}
                        disabled={getPromoCapacity(entry.promotion) <= 0}
                        className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="text-sm font-semibold text-purple-700 w-16 text-right">
                      ${entry.subtotal.toFixed(2)}
                    </div>
                    <button
                      onClick={() => removeFromCart(entry)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              }
            })
          )}
        </div>

        {/* Totales y pago */}
        <div className="border-t border-gray-100 p-4 space-y-3">
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

          <div className="flex justify-between items-center pt-1">
            <span className="text-sm text-gray-600">Total</span>
            <span className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</span>
          </div>

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

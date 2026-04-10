'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import type { Branch, Product, Category, Stock, Supplier } from '@/types/database'
import { Package, Search, AlertTriangle, Edit2, Check, X, Plus, Truck } from 'lucide-react'

interface StockRow {
  id: string
  product_id: string
  branch_id: string
  quantity: number
  min_quantity: number
  products: Product & { categories: Category | null }
}

interface IngresoItem {
  product_id: string
  cantidad: number
}

export default function StockPage() {
  const supabase = createClient()
  const { profile } = useProfile()

  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const [stock, setStock] = useState<StockRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState('')
  const [editMin, setEditMin] = useState('')
  const [saving, setSaving] = useState(false)

  // Modal crear producto
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [newProdName, setNewProdName] = useState('')
  const [newProdBarcode, setNewProdBarcode] = useState('')
  const [newProdCategoryId, setNewProdCategoryId] = useState('')
  const [newProdSupplierId, setNewProdSupplierId] = useState('')
  const [newProdPrice, setNewProdPrice] = useState('')
  const [newProdCost, setNewProdCost] = useState('')
  const [newProdUnit, setNewProdUnit] = useState('un')
  const [newQty, setNewQty] = useState('')
  const [newMin, setNewMin] = useState('')
  const [addingProduct, setAddingProduct] = useState(false)
  const [addProdError, setAddProdError] = useState('')

  // Modal ingresar mercadería
  const [showIngreso, setShowIngreso] = useState(false)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [ingresoSupplierId, setIngresoSupplierId] = useState('')
  const [ingresoItems, setIngresoItems] = useState<IngresoItem[]>([{ product_id: '', cantidad: 0 }])
  const [ingresoSearches, setIngresoSearches] = useState<string[]>([''])
  const [ingresoOpenIdx, setIngresoOpenIdx] = useState<number | null>(null)
  const [savingIngreso, setSavingIngreso] = useState(false)

  useEffect(() => {
    supabase.from('branches').select('*').order('name').then(({ data }) => {
      setBranches(data || [])
      if (data && data.length > 0) setSelectedBranch(data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedBranch) return
    setLoading(true)
    supabase
      .from('stock')
      .select('*, products(*, categories(*))')
      .eq('branch_id', selectedBranch)
      .order('products(name)')
      .then(({ data }) => {
        setStock((data as StockRow[]) || [])
        setLoading(false)
      })
  }, [selectedBranch])

  const filtered = stock.filter(row =>
    !search || row.products.name.toLowerCase().includes(search.toLowerCase())
  )

  const lowStock = filtered.filter(r => r.quantity <= r.min_quantity && r.min_quantity > 0)

  function startEdit(row: StockRow) {
    setEditingId(row.id)
    setEditQty(String(row.quantity))
    setEditMin(String(row.min_quantity))
  }

  async function saveEdit(stockId: string) {
    setSaving(true)
    await supabase
      .from('stock')
      .update({ quantity: parseFloat(editQty) || 0, min_quantity: parseFloat(editMin) || 0 })
      .eq('id', stockId)

    setStock(prev => prev.map(r =>
      r.id === stockId
        ? { ...r, quantity: parseFloat(editQty) || 0, min_quantity: parseFloat(editMin) || 0 }
        : r
    ))
    setEditingId(null)
    setSaving(false)
  }

  // Cargar categorías y proveedores al abrir el modal de nuevo producto
  useEffect(() => {
    if (!showAddProduct) return
    if (categories.length === 0) {
      supabase.from('categories').select('*').order('name')
        .then(({ data }) => setCategories(data || []))
    }
    if (suppliers.length === 0) {
      supabase.from('suppliers').select('*').order('name')
        .then(({ data }) => setSuppliers(data || []))
    }
  }, [showAddProduct])

  // Cargar productos y proveedores al abrir el modal de ingreso
  useEffect(() => {
    if (!showIngreso) return
    if (allProducts.length === 0) {
      supabase.from('products').select('*').eq('is_active', true).order('name')
        .then(({ data }) => setAllProducts(data || []))
    }
    if (suppliers.length === 0) {
      supabase.from('suppliers').select('*').order('name')
        .then(({ data }) => setSuppliers(data || []))
    }
  }, [showIngreso])

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBranch) return
    setAddingProduct(true)
    setAddProdError('')

    const { data: newProduct, error: productError } = await supabase
      .from('products')
      .insert({
        name: newProdName.toUpperCase(),
        barcode: newProdBarcode || null,
        category_id: newProdCategoryId || null,
        supplier_id: newProdSupplierId || null,
        price: parseFloat(newProdPrice) || 0,
        cost: newProdCost ? parseFloat(newProdCost) : null,
        unit: newProdUnit || 'un',
        is_active: true,
      })
      .select()
      .single()

    if (productError || !newProduct) {
      setAddProdError(productError?.message || 'Error al crear el producto')
      setAddingProduct(false)
      return
    }

    // Agregar al stock de la sucursal seleccionada
    await supabase.from('stock').insert({
      product_id: newProduct.id,
      branch_id: selectedBranch,
      quantity: parseFloat(newQty) || 0,
      min_quantity: parseFloat(newMin) || 0,
    })

    // Actualizar allProducts para el modal de ingreso
    setAllProducts(prev => [...prev, newProduct as Product])

    // Recargar stock
    const { data } = await supabase
      .from('stock')
      .select('*, products(*, categories(*))')
      .eq('branch_id', selectedBranch)
      .order('products(name)')
    setStock((data as StockRow[]) || [])

    setShowAddProduct(false)
    setNewProdName(''); setNewProdBarcode(''); setNewProdCategoryId(''); setNewProdSupplierId('')
    setNewProdPrice(''); setNewProdCost(''); setNewProdUnit('un')
    setNewQty(''); setNewMin('')
    setAddingProduct(false)
  }

  async function handleIngreso(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBranch) return
    const validItems = ingresoItems.filter(i => i.product_id && i.cantidad > 0)
    if (validItems.length === 0) return
    setSavingIngreso(true)

    for (const item of validItems) {
      const { data: existing } = await supabase
        .from('stock')
        .select('id, quantity')
        .eq('product_id', item.product_id)
        .eq('branch_id', selectedBranch)
        .single()

      if (existing) {
        await supabase
          .from('stock')
          .update({ quantity: existing.quantity + item.cantidad })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('stock')
          .insert({ product_id: item.product_id, branch_id: selectedBranch, quantity: item.cantidad, min_quantity: 0 })
      }
    }

    const { data } = await supabase
      .from('stock')
      .select('*, products(*, categories(*))')
      .eq('branch_id', selectedBranch)
      .order('products(name)')
    setStock((data as StockRow[]) || [])

    setShowIngreso(false)
    setIngresoSupplierId('')
    setIngresoItems([{ product_id: '', cantidad: 0 }])
    setIngresoSearches([''])
    setSavingIngreso(false)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package size={24} className="text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowIngreso(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
          >
            <Truck size={16} />
            Ingresar mercadería
          </button>
          <button
            onClick={() => { setShowAddProduct(true); setAddProdError('') }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} />
            Agregar producto
          </button>
        </div>
      </div>

      {/* Selector de sucursal */}
      <div className="flex gap-2 mb-4">
        {branches.map(b => (
          <button
            key={b.id}
            onClick={() => setSelectedBranch(b.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedBranch === b.id
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* Alerta stock bajo */}
      {lowStock.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4 text-sm text-amber-700">
          <AlertTriangle size={16} />
          <span>{lowStock.length} producto{lowStock.length > 1 ? 's' : ''} con stock bajo</span>
        </div>
      )}

      {/* Buscador */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tabla de stock */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Producto</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Categoría</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Stock actual</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Stock mínimo</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">Cargando...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  No hay productos en esta sucursal
                </td>
              </tr>
            ) : (
              filtered.map(row => {
                const isLow = row.min_quantity > 0 && row.quantity <= row.min_quantity
                const isEditing = editingId === row.id
                return (
                  <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{row.products.name}</td>
                    <td className="px-4 py-3 text-gray-500">{row.products.categories?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editQty}
                          onChange={e => setEditQty(e.target.value)}
                          className="w-20 px-2 py-1 border border-blue-400 rounded text-center text-sm focus:outline-none"
                          min="0"
                          step="0.001"
                        />
                      ) : (
                        <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
                          {row.quantity} {row.products.unit}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editMin}
                          onChange={e => setEditMin(e.target.value)}
                          className="w-20 px-2 py-1 border border-blue-400 rounded text-center text-sm focus:outline-none"
                          min="0"
                          step="0.001"
                        />
                      ) : (
                        <span className="text-gray-500">{row.min_quantity}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                          <AlertTriangle size={10} /> Stock bajo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-600 text-xs font-medium rounded-full">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => saveEdit(row.id)}
                            disabled={saving}
                            className="p-1.5 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-lg"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(row)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal ingresar mercadería */}
      {showIngreso && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Ingresar mercadería</h3>
            <form onSubmit={handleIngreso} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                <select
                  value={ingresoSupplierId}
                  onChange={e => setIngresoSupplierId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Seleccionar proveedor...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Productos recibidos</label>
                <div className="space-y-2">
                  {ingresoItems.map((item, idx) => {
                    const search = ingresoSearches[idx] ?? ''
                    const selectedProduct = allProducts.find(p => p.id === item.product_id)
                    const filteredProducts = allProducts.filter(p =>
                      !search || p.name.toLowerCase().includes(search.toLowerCase())
                    )
                    return (
                      <div key={idx} className="flex gap-2 items-start">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={ingresoOpenIdx === idx ? search : (selectedProduct?.name ?? '')}
                            onFocus={() => {
                              setIngresoOpenIdx(idx)
                              setIngresoSearches(prev => prev.map((s, i) => i === idx ? '' : s))
                            }}
                            onChange={e => setIngresoSearches(prev => prev.map((s, i) => i === idx ? e.target.value : s))}
                            onBlur={() => setTimeout(() => setIngresoOpenIdx(null), 150)}
                            placeholder="Buscar producto..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                          {ingresoOpenIdx === idx && (
                            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {filteredProducts.length === 0 ? (
                                <p className="px-3 py-2 text-sm text-gray-400">Sin resultados</p>
                              ) : (
                                filteredProducts.map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onMouseDown={() => {
                                      setIngresoItems(prev => prev.map((it, i) => i === idx ? { ...it, product_id: p.id } : it))
                                      setIngresoSearches(prev => prev.map((s, i) => i === idx ? '' : s))
                                      setIngresoOpenIdx(null)
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 hover:text-green-700"
                                  >
                                    {p.name}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          placeholder="Cant."
                          value={item.cantidad || ''}
                          onChange={e => setIngresoItems(prev => prev.map((it, i) => i === idx ? { ...it, cantidad: parseFloat(e.target.value) || 0 } : it))}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        {ingresoItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setIngresoItems(prev => prev.filter((_, i) => i !== idx))
                              setIngresoSearches(prev => prev.filter((_, i) => i !== idx))
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 mt-0.5"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIngresoItems(prev => [...prev, { product_id: '', cantidad: 0 }])
                    setIngresoSearches(prev => [...prev, ''])
                  }}
                  className="mt-2 flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  <Plus size={14} /> Agregar producto
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowIngreso(false); setIngresoItems([{ product_id: '', cantidad: 0 }]); setIngresoSearches(['']); setIngresoSupplierId('') }}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingIngreso}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:bg-gray-300"
                >
                  {savingIngreso ? 'Guardando...' : 'Confirmar ingreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal crear producto */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nuevo producto</h3>
            <form onSubmit={handleAddProduct} className="space-y-4">
              {addProdError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{addProdError}</p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text" value={newProdName} onChange={e => setNewProdName(e.target.value.toUpperCase())}
                  required placeholder="Ej: COCA-COLA 500ML"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number" min="0" step="0.01" value={newProdPrice}
                      onChange={e => setNewProdPrice(e.target.value)} required placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number" min="0" step="0.01" value={newProdCost}
                      onChange={e => setNewProdCost(e.target.value)} placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select
                    value={newProdCategoryId} onChange={e => setNewProdCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                  <select
                    value={newProdUnit} onChange={e => setNewProdUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="un">un (unidad)</option>
                    <option value="kg">kg</option>
                    <option value="lt">lt</option>
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                  <select
                    value={newProdSupplierId} onChange={e => setNewProdSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin proveedor</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código de barras</label>
                  <input
                    type="text" value={newProdBarcode} onChange={e => setNewProdBarcode(e.target.value)}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Stock inicial en esta sucursal</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                    <input
                      type="number" min="0" step="0.001" value={newQty}
                      onChange={e => setNewQty(e.target.value)} placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
                    <input
                      type="number" min="0" step="0.001" value={newMin}
                      onChange={e => setNewMin(e.target.value)} placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProduct(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addingProduct}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {addingProduct ? 'Creando...' : 'Crear producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

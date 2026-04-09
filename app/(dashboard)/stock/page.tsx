'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import type { Branch, Product, Category, Stock } from '@/types/database'
import { Package, Search, AlertTriangle, Edit2, Check, X, Plus } from 'lucide-react'

interface StockRow {
  id: string
  product_id: string
  branch_id: string
  quantity: number
  min_quantity: number
  products: Product & { categories: Category | null }
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

  // Modal agregar producto
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [newProductId, setNewProductId] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newMin, setNewMin] = useState('')
  const [addingProduct, setAddingProduct] = useState(false)

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

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!newProductId || !selectedBranch) return
    setAddingProduct(true)

    const { data } = await supabase
      .from('stock')
      .upsert({
        product_id: newProductId,
        branch_id: selectedBranch,
        quantity: parseFloat(newQty) || 0,
        min_quantity: parseFloat(newMin) || 0,
      }, { onConflict: 'product_id,branch_id' })
      .select('*, products(*, categories(*))')
      .single()

    if (data) {
      setStock(prev => {
        const exists = prev.find(r => r.product_id === newProductId)
        if (exists) return prev.map(r => r.product_id === newProductId ? data as StockRow : r)
        return [...prev, data as StockRow]
      })
    }

    setShowAddProduct(false)
    setNewProductId('')
    setNewQty('')
    setNewMin('')
    setAddingProduct(false)
  }

  useEffect(() => {
    if (showAddProduct && allProducts.length === 0) {
      supabase.from('products').select('*').eq('is_active', true).order('name')
        .then(({ data }) => setAllProducts(data || []))
    }
  }, [showAddProduct])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package size={24} className="text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
        </div>
        <button
          onClick={() => setShowAddProduct(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} />
          Agregar producto
        </button>
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

      {/* Modal agregar producto */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Agregar producto al stock</h3>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                <select
                  value={newProductId}
                  onChange={e => setNewProductId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar...</option>
                  {allProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock inicial</label>
                  <input
                    type="number" min="0" step="0.001" value={newQty}
                    onChange={e => setNewQty(e.target.value)} required placeholder="0"
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
                  {addingProduct ? 'Guardando...' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

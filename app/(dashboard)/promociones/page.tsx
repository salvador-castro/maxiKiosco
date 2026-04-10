'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Branch, Product, PromotionWithItems } from '@/types/database'
import { Tag, Plus, X, Check, Trash2, ToggleLeft, ToggleRight, Package } from 'lucide-react'

interface ComponentItem {
  product_id: string
  quantity: number
}

export default function PromocionesPage() {
  const supabase = createClient()

  const [promotions, setPromotions] = useState<PromotionWithItems[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Modal crear
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [branchId, setBranchId] = useState('')
  const [components, setComponents] = useState<ComponentItem[]>([{ product_id: '', quantity: 1 }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadData() {
    setLoading(true)
    const [{ data: promos }, { data: brs }, { data: prods }] = await Promise.all([
      supabase
        .from('promotions')
        .select('*, promotion_items(*, products(*))')
        .order('name'),
      supabase.from('branches').select('*').order('name'),
      supabase.from('products').select('*').eq('is_active', true).order('name'),
    ])
    setPromotions((promos as PromotionWithItems[]) || [])
    setBranches(brs || [])
    setProducts(prods || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function openModal() {
    setName(''); setPrice(''); setBranchId(''); setError('')
    setComponents([{ product_id: '', quantity: 1 }])
    setShowModal(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const validComps = components.filter(c => c.product_id && c.quantity > 0)
    if (validComps.length === 0) { setError('Agregá al menos un componente'); return }
    setSaving(true); setError('')

    const { data: promo, error: promoErr } = await supabase
      .from('promotions')
      .insert({
        name: name.toUpperCase(),
        type: 'combo',
        price: parseFloat(price) || 0,
        branch_id: branchId || null,
        is_active: true,
      })
      .select()
      .single()

    if (promoErr || !promo) {
      setError(promoErr?.message || 'Error al crear la promoción')
      setSaving(false)
      return
    }

    await supabase.from('promotion_items').insert(
      validComps.map(c => ({
        promotion_id: promo.id,
        product_id: c.product_id,
        quantity: c.quantity,
        role: 'component' as const,
      }))
    )

    await loadData()
    setShowModal(false)
    setSaving(false)
  }

  async function toggleActive(promo: PromotionWithItems) {
    await supabase
      .from('promotions')
      .update({ is_active: !promo.is_active })
      .eq('id', promo.id)
    setPromotions(prev => prev.map(p => p.id === promo.id ? { ...p, is_active: !p.is_active } : p))
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta promoción?')) return
    await supabase.from('promotion_items').delete().eq('promotion_id', id)
    await supabase.from('promotions').delete().eq('id', id)
    setPromotions(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Tag size={24} className="text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">Promociones</h1>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700"
        >
          <Plus size={16} />
          Nueva promoción
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : promotions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Tag size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay promociones creadas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {promotions.map(promo => (
            <div
              key={promo.id}
              className={`bg-white border rounded-2xl p-4 shadow-sm ${
                promo.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                    {promo.type}
                  </span>
                  <h3 className="font-semibold text-gray-900 leading-tight">{promo.name}</h3>
                  {promo.branch_id && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {branches.find(b => b.id === promo.branch_id)?.name ?? 'Sucursal'}
                    </p>
                  )}
                  {!promo.branch_id && (
                    <p className="text-xs text-gray-400 mt-0.5">Todas las sucursales</p>
                  )}
                </div>
                <span className="text-lg font-bold text-purple-700">
                  ${(promo.price ?? 0).toFixed(2)}
                </span>
              </div>

              <div className="space-y-1 mb-4">
                {promo.promotion_items.map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-sm text-gray-600">
                    <Package size={12} className="text-gray-400 shrink-0" />
                    <span>{item.quantity}× {item.products.name}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                <button
                  onClick={() => toggleActive(promo)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                    promo.is_active
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {promo.is_active
                    ? <><ToggleRight size={14} /> Activa</>
                    : <><ToggleLeft size={14} /> Inactiva</>
                  }
                </button>
                <button
                  onClick={() => handleDelete(promo.id)}
                  className="ml-auto p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear promoción */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nueva promoción</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value.toUpperCase())}
                  required
                  placeholder="EJ: CAFÉ + 2 MEDIASLUNA"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      required
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                  <select
                    value={branchId}
                    onChange={e => setBranchId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Todas</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Componentes *</label>
                <div className="space-y-2">
                  {components.map((comp, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        value={comp.product_id}
                        onChange={e => setComponents(prev => prev.map((c, i) => i === idx ? { ...c, product_id: e.target.value } : c))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Seleccionar producto...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Cant."
                        value={comp.quantity}
                        onChange={e => setComponents(prev => prev.map((c, i) => i === idx ? { ...c, quantity: parseInt(e.target.value) || 1 } : c))}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      {components.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setComponents(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 text-gray-400 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setComponents(prev => [...prev, { product_id: '', quantity: 1 }])}
                  className="mt-2 flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  <Plus size={14} /> Agregar componente
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:bg-gray-300"
                >
                  {saving ? 'Guardando...' : 'Crear promoción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

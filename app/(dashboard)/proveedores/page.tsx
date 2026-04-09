'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Supplier } from '@/types/database'
import { Truck, Plus, Edit2, Trash2, X, Check, Phone, Mail } from 'lucide-react'

const EMPTY: Omit<Supplier, 'id' | 'created_at' | 'updated_at'> = {
  name: '', contact_name: '', phone: '', email: '', address: '', notes: ''
}

export default function ProveedoresPage() {
  const supabase = createClient()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('suppliers').select('*').order('name')
    setSuppliers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setForm(EMPTY)
    setError('')
    setShowModal(true)
  }

  function openEdit(s: Supplier) {
    setEditing(s)
    setForm({ name: s.name, contact_name: s.contact_name || '', phone: s.phone || '', email: s.email || '', address: s.address || '', notes: s.notes || '' })
    setError('')
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (editing) {
      const { error } = await supabase.from('suppliers').update(form).eq('id', editing.id)
      if (error) { setError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('suppliers').insert(form)
      if (error) { setError(error.message); setSaving(false); return }
    }

    setShowModal(false)
    setSaving(false)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este proveedor?')) return
    await supabase.from('suppliers').delete().eq('id', id)
    load()
  }

  const field = (label: string, key: keyof typeof form, type = 'text', required = false) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && ' *'}</label>
      <input
        type={type}
        value={form[key] || ''}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Truck size={24} className="text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} />
          Nuevo proveedor
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Truck size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay proveedores cargados</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map(s => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800">{s.name}</h3>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {s.contact_name && <p className="text-sm text-gray-600 mb-2">{s.contact_name}</p>}
              <div className="space-y-1">
                {s.phone && (
                  <a href={`tel:${s.phone}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600">
                    <Phone size={11} /> {s.phone}
                  </a>
                )}
                {s.email && (
                  <a href={`mailto:${s.email}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600">
                    <Mail size={11} /> {s.email}
                  </a>
                )}
              </div>
              {s.notes && <p className="text-xs text-gray-400 mt-2 border-t border-gray-50 pt-2">{s.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editing ? 'Editar proveedor' : 'Nuevo proveedor'}
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              {field('Nombre', 'name', 'text', true)}
              {field('Contacto', 'contact_name')}
              <div className="grid grid-cols-2 gap-3">
                {field('Teléfono', 'phone', 'tel')}
                {field('Email', 'email', 'email')}
              </div>
              {field('Dirección', 'address')}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={form.notes || ''}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import type { Profile, Branch, UserRole } from '@/types/database'
import { Users, Plus, Edit2, UserCheck, UserX, X, Check, KeyRound } from 'lucide-react'

interface ProfileWithBranch extends Profile {
  branches: Branch | null
}

const ROLES: UserRole[] = ['vendedor', 'encargado', 'admin']

export default function UsuariosPage() {
  const supabase = createClient()
  const { profile: currentUser } = useProfile()
  const [users, setUsers] = useState<ProfileWithBranch[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  // Modal nuevo usuario
  const [showNew, setShowNew] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('vendedor')
  const [newBranch, setNewBranch] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Edición inline
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('vendedor')
  const [editBranch, setEditBranch] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modal cambiar contraseña
  const [changePwdUserId, setChangePwdUserId] = useState<string | null>(null)
  const [changePwdValue, setChangePwdValue] = useState('')
  const [savingPwd, setSavingPwd] = useState(false)
  const [changePwdError, setChangePwdError] = useState('')

  async function load() {
    setLoading(true)
    const [{ data: u }, { data: b }] = await Promise.all([
      supabase.from('profiles').select('*, branches(*)').order('full_name'),
      supabase.from('branches').select('*').order('name'),
    ])
    setUsers((u as ProfileWithBranch[]) || [])
    setBranches(b || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startEdit(user: ProfileWithBranch) {
    setEditingId(user.id)
    setEditRole(user.role)
    setEditBranch(user.branch_id || '')
    setEditActive(user.is_active ?? true)
  }

  async function saveEdit(userId: string) {
    setSaving(true)
    await supabase.from('profiles').update({
      role: editRole,
      branch_id: editBranch || null,
      is_active: editActive,
    }).eq('id', userId)
    setEditingId(null)
    setSaving(false)
    load()
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError('')

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newEmail,
        password: newPassword,
        full_name: newName,
        role: newRole,
        branch_id: newBranch || null,
      }),
    })

    if (!res.ok) {
      const { error } = await res.json()
      setCreateError(error || 'Error al crear usuario')
    } else {
      setShowNew(false)
      setNewEmail(''); setNewPassword(''); setNewName('')
      setNewRole('vendedor'); setNewBranch('')
      load()
    }
    setCreating(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!changePwdUserId) return
    setSavingPwd(true)
    setChangePwdError('')

    const res = await fetch(`/api/users/${changePwdUserId}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: changePwdValue }),
    })

    if (!res.ok) {
      const { error } = await res.json()
      setChangePwdError(error || 'Error al cambiar la contraseña')
    } else {
      setChangePwdUserId(null)
      setChangePwdValue('')
    }
    setSavingPwd(false)
  }

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'encargado'

  if (!canManage) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No tenés permisos para ver esta página.
      </div>
    )
  }

  const changePwdUser = users.find(u => u.id === changePwdUserId)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} />
          Nuevo usuario
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Nombre</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Rol</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Sucursal</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            ) : (
              users.map(user => {
                const isEditing = editingId === user.id
                const isSelf = user.id === currentUser?.id
                return (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{user.full_name}</p>
                      {isSelf && <p className="text-xs text-blue-500">Tú</p>}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={editRole}
                          onChange={e => setEditRole(e.target.value as UserRole)}
                          className="px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none"
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      ) : (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          user.role === 'admin' ? 'bg-red-100 text-red-700' :
                          user.role === 'encargado' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={editBranch}
                          onChange={e => setEditBranch(e.target.value)}
                          className="px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none"
                        >
                          <option value="">Sin sucursal</option>
                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      ) : (
                        <span className="text-gray-600">{user.branches?.name ?? '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <button
                          onClick={() => setEditActive(!editActive)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            editActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {editActive ? <><UserCheck size={12} /> Activo</> : <><UserX size={12} /> Inactivo</>}
                        </button>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {user.is_active ? <><UserCheck size={10} /> Activo</> : <><UserX size={10} /> Inactivo</>}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => saveEdit(user.id)}
                            disabled={saving}
                            className="flex items-center gap-1 px-2 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-xs font-medium"
                          >
                            <Check size={12} /> Guardar
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-xs font-medium"
                          >
                            <X size={12} /> Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => startEdit(user)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors"
                          >
                            <Edit2 size={12} /> Editar
                          </button>
                          <button
                            onClick={() => { setChangePwdUserId(user.id); setChangePwdValue(''); setChangePwdError('') }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg text-xs font-medium transition-colors"
                          >
                            <KeyRound size={12} /> Clave
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal nuevo usuario */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nuevo usuario</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              {createError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{createError}</p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                <input
                  type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  required placeholder="Ej: Juan Pérez"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  required placeholder="usuario@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input
                  type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  required minLength={6} placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <select
                    value={newRole} onChange={e => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                  <select
                    value={newBranch} onChange={e => setNewBranch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin asignar</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setShowNew(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={creating}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {creating ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal cambiar contraseña */}
      {changePwdUserId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Cambiar contraseña</h3>
            <p className="text-sm text-gray-500 mb-4">
              {changePwdUser?.full_name} deberá cambiarla al próximo inicio de sesión.
            </p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {changePwdError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{changePwdError}</p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
                <input
                  type="password"
                  value={changePwdValue}
                  onChange={e => setChangePwdValue(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setChangePwdUserId(null); setChangePwdValue(''); setChangePwdError('') }}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPwd}
                  className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:bg-gray-300"
                >
                  {savingPwd ? 'Guardando...' : 'Cambiar contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

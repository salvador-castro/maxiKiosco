import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Esta ruta requiere SUPABASE_SERVICE_ROLE_KEY para crear usuarios sin verificar email
export async function POST(req: NextRequest) {
  // Verificar que el solicitante sea encargado o admin
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['encargado', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { email, password, full_name, role, branch_id } = await req.json()

  if (!email || !password || !full_name || !role) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // Usar service role key para crear el usuario
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Service role key no configurada' }, { status: 500 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  // Verificar que el email no esté en uso
  const { data: authUsers } = await adminClient.auth.admin.listUsers()
  const emailTaken = authUsers?.users?.some(u => u.email === email)
  if (emailTaken) {
    return NextResponse.json({ error: 'El email ya está en uso' }, { status: 400 })
  }

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  // Actualizar el perfil con branch_id y full_name (el trigger ya lo crea sin branch)
  if (newUser.user) {
    await adminClient.from('profiles').update({
      full_name,
      role,
      ...(branch_id ? { branch_id } : {}),
    }).eq('id', newUser.user.id)
  }

  return NextResponse.json({ ok: true, user_id: newUser.user?.id })
}

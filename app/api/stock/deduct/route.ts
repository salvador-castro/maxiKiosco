import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // Verificar que el usuario está autenticado
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { items, branch_id } = await req.json()

  if (!items || !branch_id) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Service role key no configurada' }, { status: 500 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  const errors: string[] = []

  for (const item of items as { product_id: string; quantity: number }[]) {
    const { data: stockRow, error: selectError } = await adminClient
      .from('stock')
      .select('id, quantity')
      .eq('product_id', item.product_id)
      .eq('branch_id', branch_id)
      .maybeSingle()

    if (selectError) {
      errors.push(`Error consultando stock de ${item.product_id}: ${selectError.message}`)
      continue
    }

    if (!stockRow) {
      // No hay fila de stock para este producto en esta sucursal — ignorar
      continue
    }

    const newQty = Math.max(0, stockRow.quantity - item.quantity)

    const { error: updateError } = await adminClient
      .from('stock')
      .update({ quantity: newQty })
      .eq('id', stockRow.id)

    if (updateError) {
      errors.push(`Error actualizando stock de ${item.product_id}: ${updateError.message}`)
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 207 })
  }

  return NextResponse.json({ ok: true })
}

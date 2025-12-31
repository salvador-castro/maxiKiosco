import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdminOrSuperadmin } from "@/lib/auth/requireAdmin";

const BodySchema = z.object({
    nombre: z.string().min(1).optional(),
    cuit: z.string().optional().nullable().transform(val => val || null),
    telefono: z.string().optional().nullable().transform(val => val || null),
    email: z.string().optional().nullable().transform(val => val || null).refine(
        val => !val || z.string().email().safeParse(val).success,
        { message: "Email inválido" }
    ),
    activo: z.boolean().optional(),
});

export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
    const auth = await requireAdminOrSuperadmin();
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

    const { data, error } = await supabaseServer
        .from("proveedores")
        .update({ ...parsed.data, updated_at: new Date().toISOString() })
        .eq("id_proveedor", params.id)
        .select("id_proveedor")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, id_proveedor: data.id_proveedor });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdminOrSuperadmin } from "@/lib/auth/requireAdmin";

const BodySchema = z.object({
    username: z.string().min(3),
    password: z.string().min(6),
    nombre: z.string().min(1),
    apellido: z.string().min(1),
    email: z.string().email().nullable().optional(),
    id_rol: z.string().uuid(),
    id_sede: z.string().uuid(),
    activo: z.boolean().optional(),
});

export async function POST(req: Request) {
    const auth = await requireAdminOrSuperadmin();
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

    const { password, ...rest } = parsed.data;
    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabaseServer
        .from("usuarios")
        .insert({ ...rest, password_hash, activo: rest.activo ?? true })
        .select("id_usuario")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, id_usuario: data.id_usuario });
}

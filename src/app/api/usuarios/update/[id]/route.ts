import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdminOrSuperadmin } from "@/lib/auth/requireAdmin";

const BodySchema = z.object({
    username: z.string().min(3).optional(),
    password: z.string().min(6).optional(), // si viene, se re-hashea
    nombre: z.string().min(1).optional(),
    apellido: z.string().min(1).optional(),
    email: z.string().email().nullable().optional(),
    id_rol: z.string().uuid().optional(),
    id_sede: z.string().uuid().optional(),
    activo: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const auth = await requireAdminOrSuperadmin();
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

    const payload: any = { ...parsed.data };

    if (payload.password) {
        payload.password_hash = await bcrypt.hash(payload.password, 10);
        delete payload.password;
    }

    const { error } = await supabaseServer.from("usuarios").update(payload).eq("id_usuario", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
}

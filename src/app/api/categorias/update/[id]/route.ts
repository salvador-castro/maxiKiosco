import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const BodySchema = z.object({
    nombre: z.string().min(1).optional(),
    activa: z.boolean().optional(),
});

export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Body inválido", details: parsed.error }, { status: 400 });
    }

    const { data, error } = await supabaseServer
        .from("categorias")
        .update(parsed.data)
        .eq("id_categoria", params.id)
        .select("id_categoria")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, id_categoria: data.id_categoria });
}

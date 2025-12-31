import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
    const { error } = await supabaseServer
        .from("categorias")
        .delete()
        .eq("id_categoria", params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
}

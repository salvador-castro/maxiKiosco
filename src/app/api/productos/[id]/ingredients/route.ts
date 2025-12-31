import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;

    try {
        const { data, error } = await supabaseServer
            .from("producto_items")
            .select("id_insumo, cantidad, insumos(nombre, unidad)")
            .eq("id_producto", params.id);

        if (error) {
            throw error;
        }

        return NextResponse.json({ data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

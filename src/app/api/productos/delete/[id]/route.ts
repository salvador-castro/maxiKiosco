import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;

    // 1. Get the product first to find its linked insumo
    const { data: producto, error: fetchError } = await supabaseServer
        .from("productos")
        .select("id_insumo_stock")
        .eq("id_producto", params.id)
        .single();

    if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // 2. Delete the product
    const { error: deleteError } = await supabaseServer
        .from("productos")
        .delete()
        .eq("id_producto", params.id);

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    // 3. If product had a linked insumo, delete it too
    if (producto?.id_insumo_stock) {
        const { error: insumoError } = await supabaseServer
            .from("insumos")
            .delete()
            .eq("id_insumo", producto.id_insumo_stock);

        if (insumoError) {
            console.error("Error deleting linked insumo:", insumoError);
            // We return success for product deletion but maybe log this? 
            // The product is already gone, so we shouldn't fail the request completely 
            // or the user might retry and get 404.
        }
    }

    return NextResponse.json({ ok: true });
}

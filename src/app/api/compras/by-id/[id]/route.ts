import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
    const { data: compra, error: compraError } = await supabaseServer
        .from("compras")
        .select(
            `
            id_compra,
            id_proveedor,
            id_usuario,
            id_sede,
            fecha_hora,
            observacion,
            estado,
            proveedores(nombre, cuit, telefono, email),
            usuarios(username, nombre, apellido),
            sedes(nombre)
            `
        )
        .eq("id_compra", params.id)
        .single();

    if (compraError) {
        return NextResponse.json({ error: compraError.message }, { status: 500 });
    }

    // Get items
    const { data: items, error: itemsError } = await supabaseServer
        .from("compra_items")
        .select(
            `
            id_compra_item,
            id_producto,
            cantidad,
            precio_unitario,
            subtotal,
            productos(nombre)
            `
        )
        .eq("id_compra", params.id);

    if (itemsError) {
        return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    return NextResponse.json({
        compra,
        items,
    });
}

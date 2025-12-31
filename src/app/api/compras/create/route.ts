import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const ItemSchema = z.object({
    id_producto: z.string().uuid(),
    cantidad: z.number().positive(),
    precio_unitario: z.number().nonnegative(),
});

const BodySchema = z.object({
    id_proveedor: z.string().uuid(),
    fecha_hora: z.string(), // ISO datetime string
    observacion: z.string().optional().nullable(),
    estado: z.string().optional(),
    items: z.array(ItemSchema).min(1),
    id_sede: z.string().uuid().optional(),
});

export async function POST(req: Request) {
    // Get user from token
    const cookieStore = await cookies();
    const token = cookieStore.get("mk_token")?.value;
    if (!token) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    let payload: any;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET || "secret");
    } catch {
        return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const id_usuario = payload.sub || payload.id_usuario;
    const usuario_sede = payload.id_sede;

    if (!id_usuario) {
        return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Body inválido", details: parsed.error }, { status: 400 });
    }

    const { id_proveedor, fecha_hora, observacion, estado, items, id_sede } = parsed.data;

    // Use provided sede or fallback to user's sede
    const sede_final = id_sede || usuario_sede;
    if (!sede_final) {
        return NextResponse.json({ error: "No se pudo determinar la sede" }, { status: 400 });
    }

    // Insert compra
    const { data: compra, error: compraError } = await supabaseServer
        .from("compras")
        .insert({
            id_proveedor,
            id_usuario,
            id_sede: sede_final,
            fecha_hora,
            observacion: observacion || null,
            estado: estado || "confirmada",
        })
        .select("id_compra")
        .single();

    if (compraError) {
        return NextResponse.json({ error: compraError.message }, { status: 500 });
    }

    // Insert compra_items
    const compraItems = items.map((item) => ({
        id_compra: compra.id_compra,
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.cantidad * item.precio_unitario,
    }));

    const { error: itemsError } = await supabaseServer
        .from("compra_items")
        .insert(compraItems);

    if (itemsError) {
        // Rollback: delete the compra
        await supabaseServer.from("compras").delete().eq("id_compra", compra.id_compra);
        return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Update stock_sede for products with id_insumo_stock
    for (const item of items) {
        // Get product's id_insumo_stock
        const { data: producto } = await supabaseServer
            .from("productos")
            .select("id_insumo_stock")
            .eq("id_producto", item.id_producto)
            .single();

        if (producto?.id_insumo_stock) {
            // Check if stock record exists for this insumo in this sede
            const { data: stockExistente } = await supabaseServer
                .from("stock_sede")
                .select("id_stock, cantidad_actual")
                .eq("id_sede", sede_final)
                .eq("id_insumo", producto.id_insumo_stock)
                .single();

            if (stockExistente) {
                // Update existing stock
                await supabaseServer
                    .from("stock_sede")
                    .update({
                        cantidad_actual: Number(stockExistente.cantidad_actual) + Number(item.cantidad),
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id_stock", stockExistente.id_stock);
            } else {
                // Create new stock record
                await supabaseServer
                    .from("stock_sede")
                    .insert({
                        id_sede: sede_final,
                        id_insumo: producto.id_insumo_stock,
                        cantidad_actual: item.cantidad,
                    });
            }
        }
    }

    // Calculate total for response
    const total = items.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0);

    return NextResponse.json({ ok: true, id_compra: compra.id_compra, total });
}

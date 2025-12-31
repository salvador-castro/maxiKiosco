import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const BodySchema = z.object({
    nombre: z.string().min(1).optional(),
    id_categoria: z.string().uuid().optional(),
    tipo: z.enum(["kiosco", "elaborado", "combo"]).optional(),
    precio: z.number().nonnegative().optional(),
    requiere_comanda: z.boolean().optional(),
    activo: z.boolean().optional(),
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
        .from("productos")
        .update(parsed.data)
        .eq("id_producto", params.id)
        .select("id_producto")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Handle items update if provided
    const items = (body as any).items;
    if (items && Array.isArray(items)) {
        // Delete old items
        await supabaseServer
            .from("producto_items")
            .delete()
            .eq("id_producto", params.id);

        // Insert new items if any
        if (items.length > 0) {
            const comboItems = items.map((i: any) => ({
                id_producto: params.id,
                id_insumo: i.id_insumo,
                cantidad: i.cantidad || 1
            }));

            const { error: itemsError } = await supabaseServer
                .from("producto_items")
                .insert(comboItems);

            if (itemsError) {
                console.error("Error creating combo items:", itemsError);
                return NextResponse.json({
                    ok: true,
                    id_producto: data.id_producto,
                    warning: "Producto actualizado pero error al guardar ingredientes del combo"
                });
            }
        }
    }

    return NextResponse.json({ ok: true, id_producto: data.id_producto });
}

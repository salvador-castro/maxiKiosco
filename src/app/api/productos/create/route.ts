import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const BodySchema = z.object({
    nombre: z.string().min(1),
    id_categoria: z.string().uuid(),
    tipo: z.enum(["kiosco", "elaborado", "combo"]),
    precio: z.number().nonnegative(),
    requiere_comanda: z.boolean().optional(),
    id_insumo_stock: z.string().uuid().optional().nullable(),
    activo: z.boolean().optional(),
});

export async function POST(req: Request) {
    // Get authenticated user
    const cookieStore = await cookies();
    const token = cookieStore.get("mk_token")?.value;

    let id_usuario = null;
    if (token) {
        try {
            const payload: any = jwt.verify(token, process.env.JWT_SECRET || "secret");
            id_usuario = payload.sub || payload.id_usuario;
        } catch (e) {
            // Token invalid, continue without user
        }
    }

    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Body inválido", details: parsed.error }, { status: 400 });
    }

    // First, create the insumo IF it's not a combo
    let insumo = null;
    if (parsed.data.tipo !== "combo") {
        const { data: createdInsumo, error: insumoError } = await supabaseServer
            .from("insumos")
            .insert({
                nombre: parsed.data.nombre,
                unidad: "unidad",
                activo: true,
                created_by: id_usuario,
            })
            .select("id_insumo")
            .single();

        if (insumoError) {
            return NextResponse.json({ error: insumoError.message }, { status: 500 });
        }
        insumo = createdInsumo;
    }

    // Then create the producto with the insumo linked (if exists)
    const { data, error } = await supabaseServer
        .from("productos")
        .insert({
            nombre: parsed.data.nombre,
            id_categoria: parsed.data.id_categoria,
            tipo: parsed.data.tipo,
            precio: parsed.data.precio,
            id_insumo_stock: insumo?.id_insumo ?? null,
            requiere_comanda: parsed.data.requiere_comanda ?? false,
            activo: parsed.data.activo ?? true,
        })
        .select("id_producto, nombre")
        .single();

    if (error) {
        // Rollback: delete the insumo if it was created
        if (insumo) {
            await supabaseServer.from("insumos").delete().eq("id_insumo", insumo.id_insumo);
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If it's a combo, insert items
    if (parsed.data.tipo === "combo") {
        const items = (body as any).items;
        if (items && Array.isArray(items) && items.length > 0) {
            const comboItems = items.map((i: any) => ({
                id_producto: data.id_producto,
                id_insumo: i.id_insumo,
                cantidad: i.cantidad || 1
            }));

            const { error: itemsError } = await supabaseServer
                .from("producto_items")
                .insert(comboItems);

            if (itemsError) {
                console.error("Error creating combo items:", itemsError);
                // We don't rollback the product for now, but we should warn or error.
                // Ideally rollback logic here too?
                return NextResponse.json({
                    ok: true,
                    producto: data,
                    warning: "Producto creado pero error al guardar ingredientes del combo"
                });
            }
        }
    }

    return NextResponse.json({ ok: true, producto: data });
}

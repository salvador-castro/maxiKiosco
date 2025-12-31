import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
    try {
        // Get user from session
        const cookieStore = await cookies();
        const token = cookieStore.get("mk_token")?.value;

        if (!token) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Decode token to get user id. 
        // We can use `jwt` or `jose`. The project has jsonwebtoken calling from `jwt-decode` client side usually, 
        // but here we are server side.
        // Or simply assume the auth middleware adds headers? No, code uses cookies manually.
        // Let's rely on a helper if available, or just parse payload roughly if signed.
        // Actually, assuming `jwt.decode` if available or `jose`.
        // Let's use `jsonwebtoken` if installed (checked package.json earlier, yes).
        const jwt = require("jsonwebtoken");
        const decoded = jwt.decode(token) as any;
        const id_usuario = decoded?.id || decoded?.sub; // Adjust based on your token structure

        if (!id_usuario) {
            return NextResponse.json({ error: "Usuario no identificado en token" }, { status: 401 });
        }

        const body = await req.json();
        const { items, forma_pago, id_sede } = body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "Items requeridos" }, { status: 400 });
        }

        if (!id_sede) {
            return NextResponse.json({ error: "Sede requerida" }, { status: 400 });
        }

        // 0. Find Active Session (Caja Sesion)
        const { data: sessionData, error: sessionError } = await supabaseServer
            .from("caja_sesiones")
            .select("id_sesion")
            .eq("id_sede", id_sede)
            .eq("id_usuario_apertura", id_usuario)
            .is("cierre_at", null) // Active session has no closing date
            .order("apertura_at", { ascending: false })
            .limit(1)
            .single();

        if (sessionError || !sessionData) {
            // Option: Auto-open session? Or Error?
            // "No hay turno/caja abierta".
            return NextResponse.json({ error: "No tenés una caja abierta. Abrí la caja antes de vender." }, { status: 400 });
        }

        const id_sesion = sessionData.id_sesion;

        // 1. Resolve effective ingredients for stock for ALL items
        // We need to know:
        // - For simple products: what is the id_insumo?
        // - For combos: what are the ingredients (id_insumo) and quantities?

        const productIds = items.map((i: any) => i.id_producto);

        // Fetch product details (type, id_insumo_stock)
        const { data: productsData, error: productsError } = await supabaseServer
            .from("productos")
            .select("id_producto, tipo, id_insumo_stock, nombre")
            .in("id_producto", productIds);

        if (productsError || !productsData) {
            return NextResponse.json({ error: "Error fetching product details" }, { status: 500 });
        }

        const productsMap = new Map(productsData.map(p => [p.id_producto, p]));

        // Identify combos to fetch their recipe
        const comboIds = productsData
            .filter(p => p.tipo === "combo")
            .map(p => p.id_producto);

        let comboItemsMap = new Map<string, any[]>();
        if (comboIds.length > 0) {
            const { data: recipeData, error: recipeError } = await supabaseServer
                .from("producto_items")
                .select("id_producto, id_insumo, amount:cantidad")
                .in("id_producto", comboIds);

            if (recipeError) {
                return NextResponse.json({ error: "Error fetching combo recipes" }, { status: 500 });
            }

            // Group by id_producto
            recipeData?.forEach(r => {
                const list = comboItemsMap.get(r.id_producto) || [];
                list.push(r);
                comboItemsMap.set(r.id_producto, list);
            });
        }

        // 2. Aggregate total required quantity per INSUMO
        // Map<id_insumo, total_required>
        const stockRequirements = new Map<string, number>();

        for (const item of items) {
            const product = productsMap.get(item.id_producto);
            if (!product) continue;

            if (product.tipo === "combo") {
                const ingredients = comboItemsMap.get(item.id_producto);
                if (!ingredients || ingredients.length === 0) {
                    // Decide behavior: if combo has no ingredients, maybe skip stock check or error?
                    // Let's warn but continue, effectively no stock usage.
                    // Or error "Combo incorrectly configured"
                    console.warn(`Combo ${product.nombre} has no ingredients`);
                } else {
                    for (const ing of ingredients) {
                        const needed = ing.amount * item.cantidad;
                        const current = stockRequirements.get(ing.id_insumo) || 0;
                        stockRequirements.set(ing.id_insumo, current + needed);
                    }
                }
            } else {
                // Simple product (kiosco or elaborado with mapped stock)
                if (product.id_insumo_stock) {
                    const needed = item.cantidad; // Assuming 1 to 1 mapping for direct products
                    const current = stockRequirements.get(product.id_insumo_stock) || 0;
                    stockRequirements.set(product.id_insumo_stock, current + needed);
                }
            }
        }

        // 3. Validate Stock (batch check)
        const insumosToCheck = Array.from(stockRequirements.keys());
        if (insumosToCheck.length > 0) {
            const { data: stockData, error: stockCheckError } = await supabaseServer
                .from("stock_sede")
                .select("id_insumo, cantidad_actual, insumos(nombre)")
                .eq("id_sede", id_sede)
                .in("id_insumo", insumosToCheck);

            if (stockCheckError) {
                console.error("Stock Check Error:", stockCheckError);
                return NextResponse.json({ error: "Error checking stock levels: " + stockCheckError.message }, { status: 500 });
            }

            const stockMap = new Map(stockData?.map(s => [s.id_insumo, s]) || []);

            // Check each requirement
            for (const [id_insumo, requiredQty] of stockRequirements.entries()) {
                const stockEntry = stockMap.get(id_insumo);
                const available = stockEntry?.cantidad_actual || 0;

                if (available < requiredQty) {
                    // Try to get name for better error
                    // insumos can be returned as array or unique object depending on definition
                    const insumoRel = stockEntry?.insumos as any;
                    const insumoName = Array.isArray(insumoRel) ? insumoRel[0]?.nombre : insumoRel?.nombre ?? "Unknown Item";
                    return NextResponse.json(
                        { error: `Stock insuficiente para ${insumoName}. Requerido: ${requiredQty}, Disponible: ${available}` },
                        { status: 400 }
                    );
                }
            }
        }

        // Calculate total
        const total = items.reduce((sum: number, item: any) => {
            return sum + (item.precio_unitario * item.cantidad);
        }, 0);

        // Create venta
        const { data: ventaData, error: ventaError } = await supabaseServer
            .from("ventas")
            .insert({
                id_sede,
                id_sesion,
                id_usuario,
                fecha_hora: new Date(), // User schema has fecha_hora
                total_bruto: total,
                total_neto: total, // Assuming 0 global discount for now
                descuento_total: 0,
                estado: "pagada", // Trigger will deduct stock on this state
            })
            .select()
            .single();

        if (ventaError || !ventaData) {
            return NextResponse.json({ error: ventaError?.message ?? "Error creando venta" }, { status: 500 });
        }

        // Create venta_items
        const ventaItems = items.map((item: any) => ({
            id_venta: ventaData.id_venta,
            id_producto: item.id_producto,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.precio_unitario * item.cantidad,
        }));

        const { error: itemsError } = await supabaseServer
            .from("venta_items")
            .insert(ventaItems);

        if (itemsError) {
            // Try to rollback venta
            await supabaseServer.from("ventas").delete().eq("id_venta", ventaData.id_venta);
            return NextResponse.json({ error: itemsError.message }, { status: 500 });
        }

        // 4. Deduct Stock
        // REMOVED: Database trigger `ventas_pagada_aplica_stock` handles this when estado='pagada'.
        // We inserted with estado='pagada', so stock should be updated automatically.

        return NextResponse.json({
            success: true,
            data: {
                id_venta: ventaData.id_venta,
                total: ventaData.total,
                items: ventaItems.length,
            },
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
    }
}

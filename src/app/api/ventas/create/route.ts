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

        const body = await req.json();
        const { items, forma_pago, id_sede } = body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "Items requeridos" }, { status: 400 });
        }

        if (!forma_pago || !id_sede) {
            return NextResponse.json({ error: "Forma de pago y sede requeridos" }, { status: 400 });
        }

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
                .select("id_insumo, cantidad, insumos(nombre)")
                .eq("id_sede", id_sede)
                .in("id_insumo", insumosToCheck);

            if (stockCheckError) {
                return NextResponse.json({ error: "Error checking stock levels" }, { status: 500 });
            }

            const stockMap = new Map(stockData?.map(s => [s.id_insumo, s]) || []);

            // Check each requirement
            for (const [id_insumo, requiredQty] of stockRequirements.entries()) {
                const stockEntry = stockMap.get(id_insumo);
                const available = stockEntry?.cantidad || 0;

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
                total,
                forma_pago,
                id_sede,
                fecha: new Date().toISOString(),
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
        // We already calculated total requirements in `stockRequirements`.
        // We can execute parallel updates or individual updates.
        // Parallel updates are risky for race conditions but standard for this scale.

        for (const [id_insumo, qty] of stockRequirements.entries()) {
            // We use rpc 'decrement_stock' if it existed, otherwise read-update.
            // Given the previous code used read-update loops, we'll stick to a simple SQL update or the previous pattern.
            // But a direct update with decrement is safer: update stock_sede set cantidad = cantidad - X ...
            // Supabase JS doesn't support "increment/decrement" directly in valid readable syntax easily without RPC usually.
            // We will stick to the read-modify-write pattern but fetch fresh stock to be safe-ish?
            // Actually, we can just fetch the current row again.

            const { data: currentS, error: fetchErr } = await supabaseServer
                .from("stock_sede")
                .select("cantidad")
                .eq("id_sede", id_sede)
                .eq("id_insumo", id_insumo)
                .single();

            if (!fetchErr && currentS) {
                await supabaseServer
                    .from("stock_sede")
                    .update({ cantidad: currentS.cantidad - qty })
                    .eq("id_sede", id_sede)
                    .eq("id_insumo", id_insumo);
            }
        }

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

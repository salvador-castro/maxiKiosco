import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const q = (searchParams.get("q") ?? "").trim();
        const categoria = searchParams.get("categoria") ?? "";
        const id_sede = searchParams.get("id_sede") ?? "";

        // 1. Fetch products first (without stock join)
        // 1. Fetch products first (without stock join)
        let query = supabaseServer
            .from("productos")
            .select(`
                id_producto,
                nombre,
                precio,
                tipo,
                id_categoria,
                id_insumo_stock,
                categorias(nombre),
                producto_items(id_insumo, cantidad)
            `)
            .eq("activo", true) // Ensure we only show active products
            .order("nombre", { ascending: true });

        // Search by product name
        if (q) {
            query = query.ilike("nombre", `%${q}%`);
        }

        // Filter by category
        if (categoria) {
            query = query.eq("id_categoria", categoria);
        }

        const { data: products, error } = await query.limit(50);

        if (error) {
            console.error("Error fetching products:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // If no products, return empty
        if (!products || products.length === 0) {
            return NextResponse.json({ data: [] });
        }

        // 2. Fetch stock manually for these products if a sede is provided
        // We need stock for direct items and for combo ingredients
        let insumoIds = new Set<string>();

        products.forEach((p: any) => {
            if (p.id_insumo_stock) insumoIds.add(p.id_insumo_stock);
            if (p.tipo === "combo" && p.producto_items) {
                p.producto_items.forEach((item: any) => {
                    if (item.id_insumo) insumoIds.add(item.id_insumo);
                });
            }
        });

        let stockMap: Record<string, number> = {};

        if (insumoIds.size > 0 && id_sede) {
            const { data: stocks, error: stockError } = await supabaseServer
                .from("stock_sede")
                .select("id_insumo, cantidad_actual")
                .eq("id_sede", id_sede)
                .in("id_insumo", Array.from(insumoIds));

            if (stockError) {
                console.error("Error fetching stocks:", stockError);
            } else {
                (stocks ?? []).forEach((s: any) => {
                    stockMap[s.id_insumo] = s.cantidad_actual;
                });
            }
        }

        // 3. Merge data
        const result = products.map((p: any) => {
            let stock = 0;
            if (p.tipo === "combo" && p.producto_items && p.producto_items.length > 0) {
                // Virtual stock for combo
                const limits = p.producto_items.map((item: any) => {
                    const available = stockMap[item.id_insumo] ?? 0;
                    const required = item.cantidad || 1;
                    return Math.floor(available / required);
                });
                stock = Math.min(...limits);
            } else {
                // Regular stock
                stock = p.id_insumo_stock ? (stockMap[p.id_insumo_stock] ?? 0) : 0;
            }

            return {
                id_producto: p.id_producto,
                nombre: p.nombre,
                precio: p.precio,
                id_categoria: p.id_categoria,
                categoria_nombre: p.categorias?.nombre ?? null,
                stock: stock,
            };
        });

        return NextResponse.json({ data: result });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
    }
}

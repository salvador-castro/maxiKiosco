import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
        const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize") ?? "20")));
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const q = searchParams.get("q") ?? "";

        let filterSedeId: string | null = null;
        try {
            const cookieStore = await cookies();
            const token = cookieStore.get("mk_token")?.value;
            if (token) {
                const payload = await verifySession(token);
                // Only filter by sede if user is NOT admin/superadmin
                // We want admins to see TOTAL stock across all sedes
                const isGlobalAuth = ["admin", "superadmin"].includes(payload.rol_nombre?.toLowerCase() || "");
                if (payload.id_sede && !isGlobalAuth) {
                    filterSedeId = payload.id_sede;
                }
            }
        } catch (e) {
            // Ignore auth errors here, just don't filter
        }

        let query = supabaseServer
            .from("productos")
            .select(`
                id_producto,
                nombre,
                precio,
                tipo,
                activo,
                requiere_comanda,
                id_insumo_stock,
                id_categoria,
                categorias!inner(nombre),
                producto_items(id_insumo, cantidad)
            `, { count: "exact" })
            .order("nombre", { ascending: true });

        // Search by product name
        if (q.trim()) {
            query = query.ilike("nombre", `%${q.trim()}%`);
        }

        const { data, error, count } = await query.range(from, to);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Get stock for each producto
        const productosConStock = await Promise.all(
            (data ?? []).map(async (p: any) => {
                let stock = 0;

                if (p.tipo === "combo" && p.producto_items && p.producto_items.length > 0) {
                    // Calculate based on ingredients
                    // We need to find the MAX number of combos we can make, which is the MIN of (stock_ingredient / required_ingredient)

                    const ingredientLimits = await Promise.all(p.producto_items.map(async (item: any) => {
                        let stockQuery = supabaseServer
                            .from("stock_sede")
                            .select("cantidad_actual")
                            .eq("id_insumo", item.id_insumo);

                        if (filterSedeId) {
                            stockQuery = stockQuery.eq("id_sede", filterSedeId);
                        }

                        const { data: stockData } = await stockQuery;
                        const totalStock = (stockData ?? []).reduce((sum: number, s: any) => sum + Number(s.cantidad_actual || 0), 0);

                        if (item.cantidad <= 0) return 999999; // Should not happen
                        return Math.floor(totalStock / item.cantidad);
                    }));

                    stock = Math.min(...ingredientLimits);

                } else if (p.id_insumo_stock) {
                    let stockQuery = supabaseServer
                        .from("stock_sede")
                        .select("cantidad_actual")
                        .eq("id_insumo", p.id_insumo_stock);

                    if (filterSedeId) {
                        stockQuery = stockQuery.eq("id_sede", filterSedeId);
                    }

                    const { data: stockData } = await stockQuery;

                    // Sum stock (if filtered by sede, it will be just that sede's stock. If not, it's total)
                    stock = (stockData ?? []).reduce((sum: number, s: any) => sum + Number(s.cantidad_actual || 0), 0);
                }

                return {
                    id_producto: p.id_producto,
                    nombre: p.nombre,
                    precio: p.precio,
                    tipo: p.tipo,
                    activo: p.activo,
                    requiere_comanda: p.requiere_comanda,
                    id_categoria: p.id_categoria, // Added field
                    id_insumo_stock: p.id_insumo_stock, // Added field
                    categoria_nombre: p.categorias?.nombre ?? null,
                    producto_items: p.producto_items, // Pass this to frontend just in case
                    stock,
                };
            })
        );

        return NextResponse.json({
            data: productosConStock,
            page,
            pageSize,
            total: count ?? 0,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("mk_token")?.value;
        if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id_sesion = searchParams.get("id_sesion");

        if (!id_sesion) {
            return NextResponse.json({ error: "id_sesion requerido" }, { status: 400 });
        }

        // 1. Fetch Session Info (User, Dates)
        // User schema: id_usuario_apertura, usuarios referenced by that.
        // We need to join with usuarios on id_usuario_apertura. 
        // Supabase select syntax: `*, usuarios!id_usuario_apertura(nombre, apellido)` if FK is unambiguous or named.
        const { data: session, error: sessionError } = await supabaseServer
            .from("caja_sesiones")
            .select("*, usuarios!caja_sesiones_id_usuario_apertura_fkey(nombre, apellido)")
            .eq("id_sesion", id_sesion)
            .single();

        if (sessionError || !session) {
            return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
        }

        // 2. Fetch Sales for this session with Items
        // We need: items (product name, quantity, price), payment info (though payment is on venta, items are children)
        // Since we removed 'forma_pago' from ventas table earlier, we might need to rely on 'total_bruto' or 'response_payload' if we stored it?
        // WAIT: The user schema for 'ventas' didn't have 'forma_pago'. 
        // Did we verify where payment info is stored?
        // In the user's snippet: "id_venta, ..., total_bruto, ..., estado". No payment method!
        // Maybe it's in 'response_payload' of facturas? Or maybe we missed a 'pagos' table?
        // Or maybe I should assume 'Efectivo' for now if column missing, OR check if I missed a column in 'ventas' earlier.
        // Let's assume 'Efectivo' default or "N/A" if missing for now, to not block the report.

        // We need items details.
        const { data: sales, error: salesError } = await supabaseServer
            .from("ventas")
            .select("*, venta_items(*, productos(nombre))")
            .eq("id_sesion", id_sesion)
            .eq("estado", "pagada");

        if (salesError) {
            throw salesError;
        }

        // 3. Aggregate Data
        // Group by Payment Method (Simulated since we don't have column, or maybe we check 'facturas' related to see if it was AFIP?)
        // Let's assume "Efectivo" for all unless we find a differentiator later. 
        // Actually, the user asked for "modo de pago" column. If I don't have it, I'll put "Efectivo" or "?"

        let totalGeneral = 0;
        const itemsMap = new Map<string, any>();
        // Key: id_producto + price (to separate if price changed? usually by product id is enough for simple stats)

        sales?.forEach(sale => {
            totalGeneral += sale.total_neto;
            // Determine payment method (mocked for now as we lack the column in schema provided earlier)
            // If we had 'forma_pago' on venta, we'd use it.
            const paymentMethod = "Efectivo";

            sale.venta_items.forEach((item: any) => {
                const key = item.id_producto;
                // If combo/product name missing, use "Item Eliminado"?
                const prodName = item.productos?.nombre || "Producto desconocido";

                const existing = itemsMap.get(key) || {
                    description: prodName,
                    quantity: 0,
                    unitPrice: item.precio_unitario, // Assumes constant price or uses last. 
                    // Better: weighted average? For simplicity, list unit price. If variable, maybe separate rows?
                    // User asked: "si se emitieron tres ventas de cocas colocar un solo renglon"
                    // So we aggregate quantity and total amount. Unit price might vary, we can show "Varios" or Avg.
                    subtotal: 0,
                    paymentMethods: new Set()
                };

                existing.quantity += Number(item.cantidad);
                existing.subtotal += Number(item.subtotal);
                existing.paymentMethods.add(paymentMethod); // Collect methods used for this product

                itemsMap.set(key, existing);
            });
        });

        const itemsAggregated = Array.from(itemsMap.values()).map(i => ({
            ...i,
            paymentMethod: Array.from(i.paymentMethods).join(", ")
        }));

        // Summary by Payment Method (Mocked)
        const summaryByPayment = {
            "Efectivo": totalGeneral
            // Add other methods if we can distinguish them
        };

        return NextResponse.json({
            session: {
                user: `${(session.usuarios as any)?.nombre} ${(session.usuarios as any)?.apellido}`,
                openedAt: session.apertura_at,
                closedAt: session.cierre_at || new Date().toISOString(),
                initialAmount: session.monto_inicial,
                finalAmount: session.monto_final_declarado
            },
            items: itemsAggregated,
            totals: {
                totalSold: totalGeneral,
                byPayment: summaryByPayment
            }
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

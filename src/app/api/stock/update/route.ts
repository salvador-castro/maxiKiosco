import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const BodySchema = z.object({
    id_insumo: z.string().uuid(),
    stocks: z.array(
        z.object({
            id_sede: z.string().uuid(),
            cantidad: z.number().nonnegative(),
        })
    ),
});

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Body inválido", details: parsed.error }, { status: 400 });
    }

    const { id_insumo, stocks } = parsed.data;

    try {
        // We will perform an upsert for each stock item.
        // stock_sede table likely has a unique constraint on (id_sede, id_insumo) or id_stock.
        // Since we don't have id_stock here, we rely on the composite key (id_sede, id_insumo) being unique.
        // If it's not unique, we might have issues, but let's assume standard normalized design.
        // Actually, supabase upsert works best if we provide the primary key or a unique constraint.

        // Let's construct the rows to upsert
        const rowsToUpsert = stocks.map(s => ({
            id_insumo,
            id_sede: s.id_sede,
            cantidad_actual: s.cantidad,
            updated_at: new Date().toISOString(),
        }));

        // We use "onConflict" to specify the unique columns usually.
        // If we don't know the constraint name, we hope supabase figures it out if columns match PK.
        // A common practice for stock_sede is (id_sede, id_insumo) as unique.

        const { error } = await supabaseServer
            .from("stock_sede")
            .upsert(rowsToUpsert, { onConflict: "id_sede, id_insumo" });

        if (error) {
            throw error;
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

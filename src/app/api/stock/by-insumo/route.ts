import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const id_insumo = searchParams.get("id_insumo");

    if (!id_insumo) {
        return NextResponse.json({ error: "id_insumo is required" }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseServer
            .from("stock_sede")
            .select("id_sede, cantidad_actual")
            .eq("id_insumo", id_insumo);

        if (error) {
            throw error;
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

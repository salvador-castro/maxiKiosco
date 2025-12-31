import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
    try {
        const { data, error } = await supabaseServer
            .from("insumos")
            .select("id_insumo, nombre, unidad")
            .eq("activo", true)
            .order("nombre");

        if (error) {
            throw error;
        }

        return NextResponse.json({ data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

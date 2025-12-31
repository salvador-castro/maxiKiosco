import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id_sede = searchParams.get("id_sede");

        if (!id_sede) {
            return NextResponse.json({ error: "Sede requerida" }, { status: 400 });
        }

        const [cajasRes, turnosRes] = await Promise.all([
            supabaseServer.from("cajas").select("id_caja, nombre").eq("id_sede", id_sede).eq("activa", true),
            supabaseServer.from("turnos").select("*").eq("id_sede", id_sede) // Assuming turnos has id_sede
        ]);

        return NextResponse.json({
            cajas: cajasRes.data || [],
            turnos: turnosRes.data || [],
            error: cajasRes.error || turnosRes.error
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

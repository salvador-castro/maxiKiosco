import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("mk_token")?.value;
        if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const decoded = jwt.decode(token) as any;
        const id_usuario = decoded?.id || decoded?.sub;

        const body = await req.json();
        const { id_sede, monto_inicial, id_caja, id_turno } = body;

        if (!id_sede || monto_inicial === undefined || !id_caja || !id_turno) {
            return NextResponse.json({ error: "Faltan datos (sede, monto, caja o turno)" }, { status: 400 });
        }

        // Check if already open
        const { data: existing } = await supabaseServer
            .from("caja_sesiones")
            .select("id_sesion")
            .eq("id_sede", id_sede)
            .eq("id_usuario_apertura", id_usuario)
            .is("cierre_at", null)
            .single();

        if (existing) {
            return NextResponse.json({ error: "Ya tenés una caja abierta" }, { status: 400 });
        }

        // Create with explicit Caja and Turno
        const { data, error } = await supabaseServer
            .from("caja_sesiones")
            .insert({
                id_sede,
                id_usuario_apertura: id_usuario,
                id_caja, // From selection
                id_turno, // From selection
                monto_inicial,
                apertura_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

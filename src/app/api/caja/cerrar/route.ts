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
        const { id_sesion, monto_final, comentarios } = body;

        if (!id_sesion) {
            return NextResponse.json({ error: "ID Sesión requerido" }, { status: 400 });
        }

        // Close
        const { data, error } = await supabaseServer
            .from("caja_sesiones")
            .update({
                cierre_at: new Date().toISOString(),
                id_usuario_cierre: id_usuario,
                monto_final_declarado: monto_final || 0,
                observaciones: comentarios
            })
            .eq("id_sesion", id_sesion)
            .eq("id_usuario_apertura", id_usuario) // Verify owner
            .select()
            .single();

        if (error) {
            console.error("Error closing session:", error);
            // If column observations doesn't exist, retry without it? 
            // nah, let's assume it exists or fail.
            throw error;
        }

        return NextResponse.json({ success: true, data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

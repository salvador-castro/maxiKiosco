import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("mk_token")?.value;

        if (!token) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const decoded = jwt.decode(token) as any;
        const id_usuario = decoded?.id || decoded?.sub;

        if (!id_usuario) {
            return NextResponse.json({ error: "Token inválido" }, { status: 401 });
        }

        // We also need id_sede. Usually passed in query or we look up the user's current assignment?
        // Let's check query params.
        const { searchParams } = new URL(req.url);
        const id_sede = searchParams.get("id_sede");

        if (!id_sede) {
            return NextResponse.json({ error: "id_sede requerido" }, { status: 400 });
        }

        const { data, error } = await supabaseServer
            .from("caja_sesiones")
            .select("*")
            .eq("id_sede", id_sede)
            .eq("id_usuario_apertura", id_usuario) // User schema uses id_usuario_apertura
            .is("cierre_at", null) // User schema uses cierre_at
            .order("apertura_at", { ascending: false }) // User schema uses apertura_at
            .limit(1)
            .single();

        // If no rows, data is null, error might be "PGRST116" (JSON object requested, multiple (or no) rows returned).
        // If error code is PGRST116, it means no active session.
        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json({ active: false, session: null });
            }
            throw error;
        }

        return NextResponse.json({ active: true, session: data });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";

export async function GET(req: Request) {
    try {
        // Obtener usuario del token
        const cookieStore = await cookies();
        const token = cookieStore.get("mk_token")?.value;

        if (!token) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Extraer id_usuario del token
        let id_usuario: string | null = null;
        try {
            const payload = await verifySession(token);
            id_usuario = payload?.sub ? String(payload.sub) : null;
            
            if (!id_usuario && payload?.username) {
                const { data: userData } = await supabaseServer
                    .from("usuarios")
                    .select("id_usuario, id_sede")
                    .eq("username", payload.username)
                    .single();
                id_usuario = userData?.id_usuario || null;
            }
        } catch {
            return NextResponse.json({ error: "Token inválido" }, { status: 401 });
        }

        if (!id_usuario) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 });
        }

        // Obtener id_sede del query parameter
        const { searchParams } = new URL(req.url);
        const id_sede = searchParams.get("id_sede");

        if (!id_sede) {
            return NextResponse.json({ error: "id_sede requerido" }, { status: 400 });
        }

        // Buscar sesión activa del usuario en la sede
        const { data: sesionData, error: sesionError } = await supabaseServer
            .from("caja_sesiones")
            .select(`
                id_sesion,
                id_caja,
                id_turno,
                apertura_at,
                monto_inicial,
                cajas(nombre),
                turnos(nombre, hora_inicio, hora_fin)
            `)
            .eq("id_usuario_apertura", id_usuario)
            .eq("id_sede", id_sede)
            .is("cierre_at", null)
            .maybeSingle();

        if (sesionError) {
            console.error("Error buscando sesión:", sesionError);
            return NextResponse.json(
                { error: "Error buscando sesión activa" },
                { status: 500 }
            );
        }

        if (!sesionData) {
            return NextResponse.json({ sesion: null }, { status: 200 });
        }

        // Formatear respuesta
        type SesionConRelaciones = {
            cajas: { nombre: string } | null;
            turnos: { nombre: string; hora_inicio: string; hora_fin: string } | null;
        };

        const sesionRelaciones = sesionData as unknown as SesionConRelaciones;
        const caja = sesionRelaciones.cajas;
        const turno = sesionRelaciones.turnos;

        return NextResponse.json({
            sesion: {
                id_sesion: sesionData.id_sesion,
                id_caja: sesionData.id_caja,
                nombre_caja: caja?.nombre || "Caja",
                id_turno: sesionData.id_turno,
                nombre_turno: turno?.nombre || "Turno",
                hora_inicio: turno?.hora_inicio,
                hora_fin: turno?.hora_fin,
                apertura_at: sesionData.apertura_at,
                monto_inicial: sesionData.monto_inicial,
            },
        }, { status: 200 });
    } catch (e: unknown) {
        console.error("Error en sesion-activa:", e);
        const errorMessage = e instanceof Error ? e.message : "Error interno";
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

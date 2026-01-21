import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id_sede = searchParams.get("id_sede");

        if (!id_sede) {
            return NextResponse.json({ error: "id_sede requerido" }, { status: 400 });
        }

        // Obtener usuario del token para verificar turnos asignados
        const cookieStore = await cookies();
        const token = cookieStore.get("mk_token")?.value;

        let id_usuario: string | null = null;
        if (token) {
            try {
                const payload = await verifySession(token);
                id_usuario = payload?.sub ? String(payload.sub) : null;
                
                if (!id_usuario && payload?.username) {
                    const { data: userData } = await supabaseServer
                        .from("usuarios")
                        .select("id_usuario")
                        .eq("username", payload.username)
                        .single();
                    id_usuario = userData?.id_usuario || null;
                }
            } catch {
                // Si falla, continuar sin id_usuario
            }
        }

        // Obtener cajas activas de la sede
        const { data: cajasData, error: cajasError } = await supabaseServer
            .from("cajas")
            .select("id_caja, nombre, activa")
            .eq("id_sede", id_sede)
            .eq("activa", true)
            .order("nombre");

        if (cajasError) {
            return NextResponse.json(
                { error: "Error obteniendo cajas" },
                { status: 500 }
            );
        }

        // Verificar qué cajas tienen sesión abierta
        const { data: sesionesAbiertas } = await supabaseServer
            .from("caja_sesiones")
            .select("id_caja")
            .eq("id_sede", id_sede)
            .is("cierre_at", null);

        const cajasConSesion = new Set(
            sesionesAbiertas?.map(s => s.id_caja) || []
        );

        const cajas = (cajasData || []).map(caja => ({
            id_caja: caja.id_caja,
            nombre: caja.nombre,
            activa: caja.activa,
            tiene_sesion_abierta: cajasConSesion.has(caja.id_caja),
        }));

        // Obtener turnos activos de la sede
        const { data: turnosData, error: turnosError } = await supabaseServer
            .from("turnos")
            .select("id_turno, nombre, hora_inicio, hora_fin, activo")
            .eq("id_sede", id_sede)
            .eq("activo", true)
            .order("hora_inicio");

        if (turnosError) {
            return NextResponse.json(
                { error: "Error obteniendo turnos" },
                { status: 500 }
            );
        }

        // Si tenemos id_usuario, verificar turnos asignados
        let turnosAsignados = new Set<string>();
        if (id_usuario) {
            const { data: asignaciones } = await supabaseServer
                .from("usuario_turnos")
                .select("id_turno")
                .eq("id_usuario", id_usuario);
            
            turnosAsignados = new Set(
                asignaciones?.map(a => a.id_turno) || []
            );
        }

        const turnos = (turnosData || []).map(turno => ({
            id_turno: turno.id_turno,
            nombre: turno.nombre,
            hora_inicio: turno.hora_inicio,
            hora_fin: turno.hora_fin,
            usuario_asignado: id_usuario ? turnosAsignados.has(turno.id_turno) : true,
        }));

        return NextResponse.json({
            cajas,
            turnos,
        }, { status: 200 });
    } catch (e: unknown) {
        console.error("Error en opciones:", e);
        const errorMessage = e instanceof Error ? e.message : "Error interno";
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

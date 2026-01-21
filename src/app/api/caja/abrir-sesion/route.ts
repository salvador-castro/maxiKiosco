import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";

export async function POST(req: Request) {
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
                    .select("id_usuario")
                    .eq("username", payload.username)
                    .single();
                id_usuario = userData?.id_usuario || null;
            }
        } catch (e) {
            return NextResponse.json({ error: "Token inválido" }, { status: 401 });
        }

        if (!id_usuario) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 });
        }

        const body = await req.json();
        const { id_caja, id_turno, id_sede, monto_inicial } = body;

        // Validaciones
        if (!id_caja || !id_turno || !id_sede) {
            return NextResponse.json(
                { error: "id_caja, id_turno e id_sede son requeridos" },
                { status: 400 }
            );
        }

        if (typeof monto_inicial !== "number" || monto_inicial < 0) {
            return NextResponse.json(
                { error: "monto_inicial debe ser un número mayor o igual a 0" },
                { status: 400 }
            );
        }

        // Verificar que no haya otra sesión abierta en la misma caja
        const { data: sesionExistente } = await supabaseServer
            .from("caja_sesiones")
            .select("id_sesion")
            .eq("id_caja", id_caja)
            .eq("id_sede", id_sede)
            .is("cierre_at", null)
            .maybeSingle();

        if (sesionExistente) {
            return NextResponse.json(
                { error: "Ya existe una sesión abierta en esta caja" },
                { status: 400 }
            );
        }

        // Verificar que el usuario no tenga otra sesión abierta
        const { data: sesionUsuario } = await supabaseServer
            .from("caja_sesiones")
            .select("id_sesion")
            .eq("id_usuario_apertura", id_usuario)
            .eq("id_sede", id_sede)
            .is("cierre_at", null)
            .maybeSingle();

        if (sesionUsuario) {
            return NextResponse.json(
                { error: "Ya tenés una sesión abierta. Cerrá la anterior primero." },
                { status: 400 }
            );
        }

        // Crear nueva sesión
        const { data: nuevaSesion, error: errorSesion } = await supabaseServer
            .from("caja_sesiones")
            .insert({
                id_sede,
                id_caja,
                id_turno,
                id_usuario_apertura: id_usuario,
                monto_inicial,
                apertura_at: new Date().toISOString(),
            })
            .select(`
                id_sesion,
                id_caja,
                id_turno,
                apertura_at,
                monto_inicial,
                cajas(nombre),
                turnos(nombre, hora_inicio, hora_fin)
            `)
            .single();

        if (errorSesion  || !nuevaSesion) {
            console.error("Error creando sesión:", errorSesion);
            return NextResponse.json(
                { error: "Error creando sesión" },
                { status: 500 }
            );
        }

        type SesionConRelaciones = {
            cajas: { nombre: string } | null;
            turnos: { nombre: string; hora_inicio: string; hora_fin: string } | null;
        };

        const sesionData = nuevaSesion as unknown as SesionConRelaciones;
        const caja = sesionData.cajas;
        const turno = sesionData.turnos;

        return NextResponse.json({
            sesion: {
                id_sesion: nuevaSesion.id_sesion,
                id_caja: nuevaSesion.id_caja,
                nombre_caja: caja?.nombre || "Caja",
                id_turno: nuevaSesion.id_turno,
                nombre_turno: turno?.nombre || "Turno",
                hora_inicio: turno?.hora_inicio,
                hora_fin: turno?.hora_fin,
                apertura_at: nuevaSesion.apertura_at,
                monto_inicial: nuevaSesion.monto_inicial,
            },
        }, { status: 201 });
    } catch (e: unknown) {
        console.error("Error en abrir-sesion:", e);
        const errorMessage = e instanceof Error ? e.message : "Error interno";
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

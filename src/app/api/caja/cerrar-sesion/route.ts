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
        const { id_sesion, monto_final_declarado, observaciones } = body;

        // Validaciones
        if (!id_sesion) {
            return NextResponse.json(
                { error: "id_sesion es requerido" },
                { status: 400 }
            );
        }

        if (typeof monto_final_declarado !== "number" || monto_final_declarado < 0) {
            return NextResponse.json(
                { error: "monto_final_declarado debe ser un número mayor o igual a 0" },
                { status: 400 }
            );
        }

        // Obtener datos de la sesión
        const { data: sesionData, error: sesionError } = await supabaseServer
            .from("caja_sesiones")
            .select("id_sesion, id_usuario_apertura, monto_inicial, id_sede, cierre_at")
            .eq("id_sesion", id_sesion)
            .single();

        if (sesionError || !sesionData) {
            return NextResponse.json(
                { error: "Sesión no encontrada" },
                { status: 404 }
            );
        }

        // Verificar que la sesión no esté ya cerrada
        if (sesionData.cierre_at) {
            return NextResponse.json(
                { error: "Esta sesión ya está cerrada" },
                { status: 400 }
            );
        }

        // Verificar que sea el mismo usuario que abrió la sesión
        if (sesionData.id_usuario_apertura !== id_usuario) {
            return NextResponse.json(
                { error: "Solo podés cerrar tu propia sesión" },
                { status: 403 }
            );
        }

        // Calcular total de ventas de la sesión
        const { data: ventasData } = await supabaseServer
            .from("ventas")
            .select("total_neto")
            .eq("id_sesion", id_sesion);

        const totalVentas = (ventasData || []).reduce(
            (sum, venta) => sum + parseFloat(String(venta.total_neto)),
            0
        );

        const montoRealCalculado = parseFloat(String(sesionData.monto_inicial)) + totalVentas;
        const diferencia = monto_final_declarado - montoRealCalculado;

        // Cerrar sesión
        const { error: errorCierre } = await supabaseServer
            .from("caja_sesiones")
            .update({
                id_usuario_cierre: id_usuario,
                cierre_at: new Date().toISOString(),
                monto_final_declarado,
                observaciones: observaciones || null,
            })
            .eq("id_sesion", id_sesion);

        if (errorCierre) {
            console.error("Error cerrando sesión:", errorCierre);
            return NextResponse.json(
                { error: "Error cerrando sesión" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            id_sesion,
            monto_inicial: sesionData.monto_inicial,
            monto_real_calculado: montoRealCalculado,
            monto_declarado: monto_final_declarado,
            diferencia,
            total_ventas: totalVentas,
            cantidad_ventas: ventasData?.length || 0,
        }, { status: 200 });
    } catch (e: unknown) {
        console.error("Error en cerrar-sesion:", e);
        const errorMessage = e instanceof Error ? e.message : "Error interno";
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

// /Users/salvacastro/Desktop/maxikiosco/src/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { verifySession } from "@/lib/auth/jwt";

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get("mk_token")?.value;

    if (!token) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    let payload: any;
    try {
        payload = await verifySession(token);
    } catch {
        return NextResponse.json({ error: "Token inválido o expirado" }, { status: 401 });
    }

    // ✅ Soportamos ambos casos:
    // - token con sub (id_usuario)
    // - token sin sub pero con username (tu login lo firma)
    const userId = payload?.sub ? String(payload.sub) : "";
    const username = payload?.username ? String(payload.username) : "";

    let q = supabaseServer
        .from("usuarios")
        .select("id_usuario, username, nombre, apellido, email, id_rol, id_sede, activo, roles(id_rol, nombre, nivel)");

    if (userId) {
        q = q.eq("id_usuario", userId);
    } else if (username) {
        q = q.eq("username", username);
    } else {
        // Esto explica tu error actual (sin sub). Ahora también pedimos username.
        return NextResponse.json(
            { error: "Token inválido (sin sub ni username)" },
            { status: 401 }
        );
    }

    const { data, error } = await q.maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    if (!data.activo) return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });

    const rol = (data as any).roles;

    return NextResponse.json(
        {
            user: {
                id_usuario: data.id_usuario,
                username: data.username,
                nombre: (data as any).nombre ?? null,
                apellido: (data as any).apellido ?? null,
                email: (data as any).email ?? null,
                id_rol: data.id_rol,
                id_sede: data.id_sede,
                rol: rol ? { id_rol: rol.id_rol, nombre: rol.nombre, nivel: rol.nivel } : null,
            },
        },
        { status: 200 }
    );
}

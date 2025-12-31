// /Users/salvacastro/Desktop/maxikiosco/src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { supabaseServer } from "@/lib/supabase/server";
import { signSession } from "@/lib/auth/jwt";

const BodySchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
});

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const { username, password } = parsed.data;

    const { data, error } = await supabaseServer
        .from("usuarios")
        .select(
            "id_usuario, username, nombre, apellido, email, password_hash, id_rol, id_sede, activo, roles(id_rol, nombre, nivel)"
        )
        .eq("username", username)
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    if (!data.activo) return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });

    const ok = await bcrypt.compare(password, data.password_hash);
    if (!ok) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

    await supabaseServer
        .from("usuarios")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id_usuario", data.id_usuario);

    const rol = (data as any).roles;

    const token = await signSession({
        sub: data.id_usuario,
        username: data.username,
        id_rol: data.id_rol,
        rol_nombre: rol?.nombre ?? "desconocido",
        rol_nivel: Number(rol?.nivel ?? 0),
        id_sede: data.id_sede,
    });

    // ✅ Devolvemos user para que el frontend arme TopNav
    const res = NextResponse.json({
        ok: true,
        user: {
            id_usuario: data.id_usuario,
            username: data.username,
            nombre: (data as any).nombre ?? null,
            apellido: (data as any).apellido ?? null,
            email: (data as any).email ?? null,
            id_rol: data.id_rol,
            id_sede: data.id_sede,
            rol: rol
                ? { id_rol: rol.id_rol, nombre: rol.nombre, nivel: rol.nivel }
                : null,
        },
    });

    res.cookies.set("mk_token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 12,
    });

    return res;
}

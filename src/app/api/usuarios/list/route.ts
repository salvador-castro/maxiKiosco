import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdminOrSuperadmin } from "@/lib/auth/requireAdmin";

export async function GET(req: Request) {
    const auth = await requireAdminOrSuperadmin();
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize") ?? "20")));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseServer
        .from("usuarios")
        .select(
            "id_usuario, username, nombre, apellido, email, activo, created_at, last_login_at, id_sede, id_rol, roles(nombre, nivel), sedes(nombre)",
            { count: "exact" }
        )
        .order("created_at", { ascending: false });

    if (q) {
        // OR search en campos típicos
        query = query.or(
            `username.ilike.%${q}%,nombre.ilike.%${q}%,apellido.ilike.%${q}%,email.ilike.%${q}%`
        );
    }

    const { data, error, count } = await query.range(from, to);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
        data,
        page,
        pageSize,
        total: count ?? 0,
    });
}
